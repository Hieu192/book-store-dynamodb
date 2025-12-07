const request = require('supertest');
const app = require('../../../app');
const categoryService = require('../../../services/CategoryService');
const {
  createTestUser,
  createAdminUser,
  createTestCategory
} = require('../../helpers/testHelpers');

describe('Category Integration Tests', () => {
  jest.setTimeout(60000);

  describe('GET /api/v1/genres', () => {
    it('should get all categories', async () => {
      const timestamp = Date.now();
      await createTestCategory({ name: `Electronics-${timestamp}` });
      await createTestCategory({ name: `Clothing-${timestamp}` });
      await createTestCategory({ name: `Books-${timestamp}` });

      const response = await request(app)
        .get('/api/v1/genres')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.category.length).toBeGreaterThanOrEqual(3);
      expect(response.body.category[0]).toHaveProperty('name');
    });

    it('should get categories as array', async () => {
      const response = await request(app)
        .get('/api/v1/genres')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.category)).toBe(true);
    });
  });

  describe('POST /api/v1/admin/genres/addgenre', () => {
    it('should create new category', async () => {
      const admin = await createAdminUser();
      const token = admin.getJwtToken();
      const timestamp = Date.now();
      const categoryData = {
        name: `New Category ${timestamp}`,
        images: ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==']
      };

      const response = await request(app)
        .post('/api/v1/admin/genres/addgenre')
        .set('Cookie', [`token=${token}`])
        .send(categoryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.category).toHaveProperty('name', `New Category ${timestamp}`);
      expect(response.body.category.images).toHaveLength(1);

      // Verify via CategoryService
      const categories = await categoryService.getCategories();
      const newCategory = categories.find(c => c.name === `New Category ${timestamp}`);
      expect(newCategory).toBeTruthy();
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

      // Verify deletion via CategoryService
      try {
        await categoryService.getCategory(category._id || category.id);
        fail('Category should have been deleted');
      } catch (error) {
        expect(error.message).toContain('not found');
      }
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
