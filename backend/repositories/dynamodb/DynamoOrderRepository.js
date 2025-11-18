const AWS = require('aws-sdk');

/**
 * DynamoDB Order Repository
 * Single-Table Design
 */
class DynamoOrderRepository {
  constructor() {
    this.dynamodb = new AWS.DynamoDB.DocumentClient({
      region: process.env.AWS_REGION || 'ap-southeast-1',
      endpoint: process.env.DYNAMODB_ENDPOINT || undefined,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });
    
    this.tableName = 'BookStore';
  }

  /**
   * Generate Order PK/SK
   */
  _getOrderKeys(id) {
    return {
      PK: `ORDER#${id}`,
      SK: 'METADATA'
    };
  }

  /**
   * Generate unique ID
   */
  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Transform MongoDB order to DynamoDB format
   */
  _transformToDynamo(orderData, id = null) {
    const orderId = id || this._generateId();
    const timestamp = new Date().toISOString();
    
    return {
      ...this._getOrderKeys(orderId),
      GSI1PK: `USER#${orderData.user}`,
      GSI1SK: `ORDER#${timestamp}`,
      GSI2PK: `STATUS#${orderData.orderStatus || 'Processing'}`,
      GSI2SK: `CREATED#${timestamp}`,
      EntityType: 'Order',
      orderId,
      orderCode: orderData.orderCode,
      userId: orderData.user,
      shippingInfo: orderData.shippingInfo,
      paymentInfo: orderData.paymentInfo,
      itemsPrice: orderData.itemsPrice,
      taxPrice: orderData.taxPrice,
      shippingPrice: orderData.shippingPrice,
      totalPrice: orderData.totalPrice,
      orderStatus: orderData.orderStatus || 'Processing',
      deliveredAt: orderData.deliveredAt,
      createdAt: orderData.createdAt || timestamp,
      updatedAt: timestamp
    };
  }

  /**
   * Transform DynamoDB item to MongoDB-like format
   */
  _transformFromDynamo(item) {
    if (!item) return null;
    
    return {
      _id: item.orderId,
      orderCode: item.orderCode,
      user: item.userId,
      shippingInfo: item.shippingInfo,
      orderItems: [], // Will be populated separately
      paymentInfo: item.paymentInfo,
      itemsPrice: item.itemsPrice,
      taxPrice: item.taxPrice,
      shippingPrice: item.shippingPrice,
      totalPrice: item.totalPrice,
      orderStatus: item.orderStatus,
      deliveredAt: item.deliveredAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }

  /**
   * Find order by ID
   */
  async findById(id) {
    const params = {
      TableName: this.tableName,
      Key: this._getOrderKeys(id)
    };

    const result = await this.dynamodb.get(params).promise();
    
    if (!result.Item) return null;
    
    const order = this._transformFromDynamo(result.Item);
    
    // Get order items
    order.orderItems = await this.getOrderItems(id);
    
    return order;
  }

  /**
   * Get order items
   */
  async getOrderItems(orderId) {
    const params = {
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `ORDER#${orderId}`,
        ':sk': 'ITEM#'
      }
    };

    const result = await this.dynamodb.query(params).promise();
    
    return result.Items.map(item => ({
      product: item.productId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      image: item.image
    }));
  }

  /**
   * Create order with items
   */
  async create(orderData, id = null) {
    const orderId = id || this._generateId();
    const orderItem = this._transformToDynamo(orderData, orderId);

    // Create order
    await this.dynamodb.put({
      TableName: this.tableName,
      Item: orderItem
    }).promise();

    // Create order items
    if (orderData.orderItems && orderData.orderItems.length > 0) {
      for (const item of orderData.orderItems) {
        await this.dynamodb.put({
          TableName: this.tableName,
          Item: {
            PK: `ORDER#${orderId}`,
            SK: `ITEM#${item.product}`,
            GSI1PK: `PRODUCT#${item.product}`,
            GSI1SK: `ORDER#${orderId}`,
            EntityType: 'OrderItem',
            productId: item.product,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            image: item.image
          }
        }).promise();
      }
    }

    return this.findById(orderId);
  }

  /**
   * Update order
   */
  async update(id, updateData) {
    const keys = this._getOrderKeys(id);
    
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    
    Object.keys(updateData).forEach((key, index) => {
      const attrName = `#attr${index}`;
      const attrValue = `:val${index}`;
      updateExpressions.push(`${attrName} = ${attrValue}`);
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = updateData[key];
    });
    
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const params = {
      TableName: this.tableName,
      Key: keys,
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    const result = await this.dynamodb.update(params).promise();
    return this.findById(id);
  }

  /**
   * Delete order
   */
  async delete(id) {
    // Delete order items first
    const items = await this.getOrderItems(id);
    for (const item of items) {
      await this.dynamodb.delete({
        TableName: this.tableName,
        Key: {
          PK: `ORDER#${id}`,
          SK: `ITEM#${item.product}`
        }
      }).promise();
    }

    // Delete order
    const params = {
      TableName: this.tableName,
      Key: this._getOrderKeys(id)
    };

    await this.dynamodb.delete(params).promise();
    return true;
  }

  /**
   * Find orders by user
   */
  async findByUser(userId) {
    const params = {
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :userId AND begins_with(GSI1SK, :prefix)',
      ExpressionAttributeValues: {
        ':userId': `USER#${userId}`,
        ':prefix': 'ORDER#'
      }
    };

    const result = await this.dynamodb.query(params).promise();
    
    const orders = [];
    for (const item of result.Items) {
      const order = this._transformFromDynamo(item);
      order.orderItems = await this.getOrderItems(order._id);
      orders.push(order);
    }
    
    return orders;
  }

  /**
   * Find all orders
   */
  async findAll() {
    const params = {
      TableName: this.tableName,
      FilterExpression: 'EntityType = :type',
      ExpressionAttributeValues: {
        ':type': 'Order'
      }
    };

    const result = await this.dynamodb.scan(params).promise();
    
    const orders = [];
    for (const item of result.Items) {
      const order = this._transformFromDynamo(item);
      order.orderItems = await this.getOrderItems(order._id);
      orders.push(order);
    }
    
    return orders;
  }
}

module.exports = DynamoOrderRepository;
