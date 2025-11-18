const User = require('../../models/user');

/**
 * MongoDB User Repository
 */
class MongoUserRepository {
  async findById(id) {
    return await User.findById(id);
  }

  async findByEmail(email) {
    return await User.findOne({ email }).select('+password');
  }

  async findAll(filters = {}) {
    return await User.find(filters);
  }

  async create(userData) {
    const user = await User.create(userData);
    return user;
  }

  async update(id, updateData) {
    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
        useFindAndModify: false
      }
    );
    return user;
  }

  async delete(id) {
    const result = await User.findByIdAndDelete(id);
    return !!result;
  }
}

module.exports = MongoUserRepository;
