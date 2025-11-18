const AWS = require('aws-sdk');

/**
 * DynamoDB User Repository
 * Single-Table Design
 */
class DynamoUserRepository {
  constructor() {
    this.dynamodb = new AWS.DynamoDB.DocumentClient({
      region: process.env.AWS_REGION || 'ap-southeast-1',
      endpoint: process.env.DYNAMODB_ENDPOINT || undefined,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      convertEmptyValues: true
    });
    
    this.tableName = 'BookStore';
  }

  /**
   * Generate User PK/SK
   */
  _getUserKeys(id) {
    return {
      PK: `USER#${id}`,
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
   * Transform MongoDB user to DynamoDB format
   */
  _transformToDynamo(userData, id = null) {
    const userId = id ? String(id) : this._generateId();
    const timestamp = new Date().toISOString();
    
    return {
      ...this._getUserKeys(userId),
      GSI1PK: `EMAIL#${userData.email}`,
      GSI1SK: `USER#${timestamp}`,
      GSI2PK: `ROLE#${userData.role || 'user'}`,
      GSI2SK: `CREATED#${timestamp}`,
      EntityType: 'User',
      userId,
      name: userData.name,
      email: userData.email,
      password: userData.password,
      avatar: userData.avatar || {},
      role: userData.role || 'user',
      createdAt: userData.createdAt || timestamp,
      updatedAt: timestamp
    };
  }

  /**
   * Transform DynamoDB item to MongoDB-like format
   */
  _transformFromDynamo(item) {
    if (!item) return null;
    
    return {
      _id: item.userId,
      name: item.name,
      email: item.email,
      password: item.password,
      avatar: item.avatar,
      role: item.role,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }

  /**
   * Find user by ID
   */
  async findById(id) {
    const params = {
      TableName: this.tableName,
      Key: this._getUserKeys(id)
    };

    const result = await this.dynamodb.get(params).promise();
    return this._transformFromDynamo(result.Item);
  }

  /**
   * Find user by email
   */
  async findByEmail(email) {
    const params = {
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :email',
      ExpressionAttributeValues: {
        ':email': `EMAIL#${email}`
      }
    };

    const result = await this.dynamodb.query(params).promise();
    return result.Items.length > 0 ? this._transformFromDynamo(result.Items[0]) : null;
  }

  /**
   * Create user
   */
  async create(userData, id = null) {
    const item = this._transformToDynamo(userData, id);

    const params = {
      TableName: this.tableName,
      Item: item
    };

    await this.dynamodb.put(params).promise();
    return this._transformFromDynamo(item);
  }

  /**
   * Update user
   */
  async update(id, updateData) {
    const keys = this._getUserKeys(id);
    
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
    return this._transformFromDynamo(result.Attributes);
  }

  /**
   * Delete user
   */
  async delete(id) {
    const params = {
      TableName: this.tableName,
      Key: this._getUserKeys(id)
    };

    await this.dynamodb.delete(params).promise();
    return true;
  }

  /**
   * Find all users
   */
  async findAll(filters = {}) {
    const params = {
      TableName: this.tableName,
      FilterExpression: 'EntityType = :type',
      ExpressionAttributeValues: {
        ':type': 'User'
      }
    };

    const result = await this.dynamodb.scan(params).promise();
    return result.Items.map(item => this._transformFromDynamo(item));
  }
}

module.exports = DynamoUserRepository;
