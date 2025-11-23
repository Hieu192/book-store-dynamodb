const mongoose = require("mongoose");

const connectDatabase = async () => {
  // Skip MongoDB connection if not configured
  if (!process.env.DB_URI || process.env.DB_URI === 'mongodb://localhost:27017/bookstore') {
    console.log('⚠️  Skipping MongoDB connection (using DynamoDB only)');
    return;
  }

  try {
    const con = await mongoose.connect(process.env.DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Database connected with HOST: ${con.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDatabase;