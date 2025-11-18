const AWS = require('aws-sdk');

/**
 * DynamoDB Category Repository
 * Single-Table Design
 */
class DynamoCategoryRepository {
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
   * Generate Category PK/SK
   */
  _getCategoryKeys(id) {
    return {
      PK: `CATEGORY#${id}`,
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
   * Transform MongoDB category to DynamoDB format
   */
  _transformToDynamo(categoryData, id = null) {
    const categoryId = id ? String(id) : this._generateId();
    const timestamp = new Date().toISOString();
    
    // Transform images - store path only
    const imageArray = Array.isArray(categoryData.images) ? categoryData.images : [];
    const images = imageArray.map(img => ({
      public_id: img.public_id,
      path: img.path || img.url  // Use path if available, fallback to url
    }));
    
    return {
      ...this._getCategoryKeys(categoryId),
      GSI1PK: `NAME#${categoryData.name}`,
      GSI1SK: `CATEGORY#${timestamp}`,
      EntityType: 'Category',
      categoryId,
      name: categoryData.name,
      images: images,
      createdAt: categoryData.createdAt || timestamp,
      updatedAt: timestamp
    };
  }

  /**
   * Transform DynamoDB item to MongoDB-like format
   */
  _transformFromDynamo(item) {
    if (!item) return null;
    
    // Transform images - reconstruct full URL from path
    let images = [];
    if (item.images) {
      const imageArray = Array.isArray(item.images) 
        ? item.images 
        : (typeof item.images === 'object' ? Object.values(item.images) : []);
      
      const cloudFrontUrl = process.env.CLOUDFRONT_URL || 'https://d13sqx61nhrgy0.cloudfront.net';
      
      images = imageArray.map(img => {
        const imgData = img.M || img;
        const path = imgData.path?.S || imgData.path;
        const publicId = imgData.public_id?.S || imgData.public_id;
        
        const url = path && path.startsWith('/') 
          ? `${cloudFrontUrl}${path}` 
          : path;
        
        return {
          public_id: publicId,
          url: url
        };
      });
    }
    
    return {
      _id: item.categoryId,
      name: item.name,
      images: images,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }

  /**
   * Find category by ID
   */
  async findById(id) {
    const params = {
      TableName: this.tableName,
      Key: this._getCategoryKeys(id)
    };

    const result = await this.dynamodb.get(params).promise();
    return this._transformFromDynamo(result.Item);
  }

  /**
   * Find category by name
   */
  async findByName(name) {
    const params = {
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :name',
      ExpressionAttributeValues: {
        ':name': `NAME#${name}`
      }
    };

    const result = await this.dynamodb.query(params).promise();
    return result.Items.length > 0 ? this._transformFromDynamo(result.Items[0]) : null;
  }

  /**
   * Create category
   */
  async create(categoryData, id = null) {
    const item = this._transformToDynamo(categoryData, id);

    const params = {
      TableName: this.tableName,
      Item: item
    };

    await this.dynamodb.put(params).promise();
    return this._transformFromDynamo(item);
  }

  /**
   * Update category
   */
  async update(id, updateData) {
    const keys = this._getCategoryKeys(id);
    
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
   * Delete category
   */
  async delete(id) {
    const params = {
      TableName: this.tableName,
      Key: this._getCategoryKeys(id)
    };

    await this.dynamodb.delete(params).promise();
    return true;
  }

  /**
   * Find all categories
   */
  async findAll() {
    const params = {
      TableName: this.tableName,
      FilterExpression: 'EntityType = :type',
      ExpressionAttributeValues: {
        ':type': 'Category'
      }
    };

    const result = await this.dynamodb.scan(params).promise();
    return result.Items.map(item => this._transformFromDynamo(item));
  }
}

module.exports = DynamoCategoryRepository;
