const Category = require('../../models/category');

/**
 * MongoDB Category Repository
 */
class MongoCategoryRepository {
  /**
   * Find category by ID
   */
  async findById(id) {
    return await Category.findById(id);
  }

  /**
   * Find all categories
   */
  async findAll() {
    return await Category.find();
  }

  /**
   * Find category by name
   */
  async findByName(name) {
    return await Category.findOne({ name });
  }

  /**
   * Create category
   */
  async create(categoryData) {
    const category = await Category.create(categoryData);
    return category;
  }

  /**
   * Update category
   */
  async update(id, updateData) {
    const category = await Category.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
        useFindAndModify: false
      }
    );
    return category;
  }

  /**
   * Delete category
   */
  async delete(id) {
    const result = await Category.findByIdAndDelete(id);
    return !!result;
  }
}

module.exports = MongoCategoryRepository;
