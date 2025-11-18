const request = require('supertest');
const app = require('../../../app');
const Category = require('../../../models/category');
const {
  createTestUser,
  createAdminUser,
  createTestCategory,
  cleanupDatabase
} = require('../../helpers/testHelpers');

describe('Category Integration Tests', () => {
  
  beforeEach(async () => {
    await cleanupDatabase();
  });

  describe('GET /api/v1/genres', () => {
    it('should get all categories', async () => {
      await createTestCategory({ name: 'Electronics' });
      await createTestCategory({ name: 'Clothing' });
      await createTestCategory({ name: 'Books' });

      const response = await request(app)
        .get('/api/v1/genres')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.category).toHaveLength(3);
      expect(response.body.category[0]).toHaveProperty('name');
    });

    it('should return empty array when no categories exist', async () => {
      const response = await request(app)
        .get('/api/v1/genres')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.category).toHaveLength(0);
    });
  });

  describe('POST /api/v1/admin/genres/addgenre', () => {
    it('should create new category', async () => {
      const categoryData = {
        name: 'New Category',
        images: ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==']
      };

      const response = await request(app)
        .post('/api/v1/admin/genres/addgenre')
        .send(categoryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.category).toHaveProperty('name', 'New Category');
      expect(response.body.category.images).toHaveLength(1);

      // Verify in database
      const category = await Category.findOne({ name: 'New Category' });
      expect(category).toBeTruthy();
    });

    it('should create category with multiple images', async () => {
      const categoryData = {
        name: 'Multi Image Category',
        images: [
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        ]
      };

      const response = await request(app)
        .post('/api/v1/admin/genres/addgenre')
        .send(categoryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.category.images).toHaveLength(2);
    });

    it('should create category with string image', async () => {
      const categoryData = {
        name: 'Single Image Category',
        images: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      };

      const response = await request(app)
        .post('/api/v1/admin/genres/addgenre')
        .send(categoryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.category.images).toHaveLength(1);
    });
  });

  describe('DELETE /api/v1/movies/:genreID', () => {
    it('should delete category', async () => {
      const category = await createTestCategory({ name: 'To Delete' });

      const response = await request(app)
        .delete(`/api/v1/movies/${category._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify deletion
      const deletedCategory = await Category.findById(category._id);
      expect(deletedCategory).toBeNull();
    });

    it('should return 404 for non-existent category', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .delete(`/api/v1/movies/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return error for invalid category id', async () => {
      const response = await request(app)
        .delete('/api/v1/movies/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });
  });
});
