const Order = require('../../models/order');

/**
 * MongoDB Order Repository
 */
class MongoOrderRepository {
  async findById(id) {
    return await Order.findById(id).populate('user', 'name email');
  }

  async findByUser(userId) {
    return await Order.find({ user: userId });
  }

  async findAll() {
    return await Order.find();
  }

  async create(orderData) {
    const order = await Order.create(orderData);
    return order;
  }

  async update(id, updateData) {
    const order = await Order.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
        useFindAndModify: false
      }
    );
    return order;
  }

  async delete(id) {
    const result = await Order.findByIdAndDelete(id);
    return !!result;
  }
}

module.exports = MongoOrderRepository;
