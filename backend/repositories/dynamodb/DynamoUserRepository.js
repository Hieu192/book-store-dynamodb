const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');

/**
 * DynamoDB User Repository
 * Single-Table Design with Password Hashing
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
   * Kiểm tra xem password đã được hash chưa
   * Bcrypt hash luôn bắt đầu với $2a$, $2b$, hoặc $2y$ và có độ dài 60 ký tự
   */
  _isPasswordHashed(password) {
    if (!password) return false;
    return /^\$2[aby]\$\d{2}\$/.test(password) && password.length === 60;
  }

  /**
   * Hash password nếu chưa được hash
   * @param {string} password - Plain text password hoặc hashed password
   * @returns {Promise<string>} Hashed password
   */
  async _hashPasswordIfNeeded(password) {
    if (!password) return undefined;

    // Nếu đã hash rồi thì không hash lại
    if (this._isPasswordHashed(password)) {
      console.log('🔒 Password already hashed, skipping...');
      return password;
    }

    // Hash password với bcrypt (10 salt rounds)
    console.log('🔐 Hashing password for DynamoDB...');
    return await bcrypt.hash(password, 10);
  }

  /**
   * So sánh password (plain text) với hashed password
   * @param {string} plainPassword - Password người dùng nhập
   * @param {string} hashedPassword - Hashed password từ database
   * @returns {Promise<boolean>}
   */
  async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Transform MongoDB user to DynamoDB format
   * QUAN TRỌNG: Hash password trước khi lưu
   */
  async _transformToDynamo(userData, id = null) {
    const userId = id ? String(id) : this._generateId();
    const timestamp = new Date().toISOString();

    // 🔐 SECURITY: Hash password trước khi lưu vào DynamoDB
    const hashedPassword = await this._hashPasswordIfNeeded(userData.password);

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
      password: hashedPassword, // Lưu password đã được hash
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
   * 🔐 Password sẽ được hash tự động trong _transformToDynamo
   */
  async create(userData, id = null) {
    const item = await this._transformToDynamo(userData, id);

    const params = {
      TableName: this.tableName,
      Item: item
    };

    await this.dynamodb.put(params).promise();
    return this._transformFromDynamo(item);
  }

  /**
   * Update user
   * 🔐 Password sẽ được hash tự động nếu có trong updateData
   */
  async update(id, updateData) {
    const keys = this._getUserKeys(id);

    // Hash password nếu đang update password
    if (updateData.password) {
      updateData.password = await this._hashPasswordIfNeeded(updateData.password);
    }

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
