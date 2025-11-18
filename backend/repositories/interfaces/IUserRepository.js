/**
 * User Repository Interface
 */

class IUserRepository {
  async findById(id) {
    throw new Error('Method findById() must be implemented');
  }

  async findByEmail(email) {
    throw new Error('Method findByEmail() must be implemented');
  }

  async findAll(filters = {}) {
    throw new Error('Method findAll() must be implemented');
  }

  async create(userData) {
    throw new Error('Method create() must be implemented');
  }

  async update(id, updateData) {
    throw new Error('Method update() must be implemented');
  }

  async delete(id) {
    throw new Error('Method delete() must be implemented');
  }

  async updatePassword(id, newPassword) {
    throw new Error('Method updatePassword() must be implemented');
  }

  async setResetPasswordToken(id, token, expiry) {
    throw new Error('Method setResetPasswordToken() must be implemented');
  }

  async findByResetToken(token) {
    throw new Error('Method findByResetToken() must be implemented');
  }

  async count(filters = {}) {
    throw new Error('Method count() must be implemented');
  }
}

module.exports = IUserRepository;
