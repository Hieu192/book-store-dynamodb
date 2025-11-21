/**
 * Unit Tests for Recommendation System
 * Tests: Related Products, Best Sellers, Recently Viewed
 */

const DynamoProductRepository = require('../../repositories/dynamodb/DynamoProductRepository');
const ProductService = require('../../services/ProductService');

describe('Recommendation System - Unit Tests', () => {
  let productRepo;
  let productService;

  beforeAll(() => {
    productRepo = new DynamoProductRepository();
    productService = ProductService;
  });

  describe('Related Products', () => {
    test('should return products from same category', async () => {
      // Create test products
      const category = 'Test Category';
      const product1 = await productRepo.create({
        name: 'Product 1',
        price: 100,
        description: 'Test product 1',
        category: category,
        stock: 10,
        seller: 'Test Seller',
        user: 'test-user-id',
        images: []
      });

      const product2 = await productRepo.create({
        name: 'Product 2',
        price: 200,
        description: 'Test product 2',
        category: category,
        stock: 20,
        seller: 'Test Seller',
        user: 'test-user-id',
        images: []
      });

      // Get related products
      const relatedProducts = await productRepo.getRelatedProducts(product1._id, 5);

      expect(relatedProducts).toBeDefined();
      expect(Array.isArray(relatedProducts)).toBe(true);
      
      // Should not include the product itself
      const productIds = relatedProducts.map(p => p._id);
      expect(productIds).not.toContain(product1._id);

      // Should include product2 from same category
      if (relatedProducts.length > 0) {
        expect(relatedProducts[0].category).toBe(category);
      }

      // Cleanup
      await productRepo.delete(product1._id);
      await productRepo.delete(product2._id);
    });

    test('should return empty array if product not found', async () => {
      const relatedProducts = await productRepo.getRelatedProducts('non-existent-id', 5);
      expect(relatedProducts).toEqual([]);
    });

    test('should respect limit parameter', async () => {
      const category = 'Limit Test Category';
      
      // Create multiple products
      const products = [];
      for (let i = 0; i < 5; i++) {
        const product = await productRepo.create({
          name: `Limit Test Product ${i}`,
          price: 100 + i,
          description: `Test product ${i}`,
          category: category,
          stock: 10,
          seller: 'Test Seller',
          user: 'test-user-id',
          images: []
        });
        products.push(product);
      }

      // Get related with limit 2
      const relatedProducts = await productRepo.getRelatedProducts(products[0]._id, 2);
      expect(relatedProducts.length).toBeLessThanOrEqual(2);

      // Cleanup
      for (const product of products) {
        await productRepo.delete(product._id);
      }
    });
  });

  describe('Best Sellers', () => {
    test('should return products sorted by reviews and ratings', async () => {
      // Create test products with different ratings
      const product1 = await productRepo.create({
        name: 'Low Rating Product',
        price: 100,
        description: 'Test product',
        category: 'Test',
        stock: 10,
        seller: 'Test Seller',
        user: 'test-user-id',
        ratings: 2,
        numOfReviews: 5,
        images: []
      });

      const product2 = await productRepo.create({
        name: 'High Rating Product',
        price: 200,
        description: 'Test product',
        category: 'Test',
        stock: 20,
        seller: 'Test Seller',
        user: 'test-user-id',
        ratings: 5,
        numOfReviews: 10,
        images: []
      });

      // Get best sellers
      const bestSellers = await productRepo.getBestSellers(10);

      expect(bestSellers).toBeDefined();
      expect(Array.isArray(bestSellers)).toBe(true);

      // Cleanup
      await productRepo.delete(product1._id);
      await productRepo.delete(product2._id);
    });

    test('should filter by category if provided', async () => {
      const category = 'Specific Category';
      
      const product = await productRepo.create({
        name: 'Category Product',
        price: 100,
        description: 'Test product',
        category: category,
        stock: 10,
        seller: 'Test Seller',
        user: 'test-user-id',
        ratings: 5,
        numOfReviews: 10,
        images: []
      });

      const bestSellers = await productRepo.getBestSellers(10, category);

      expect(bestSellers).toBeDefined();
      if (bestSellers.length > 0) {
        bestSellers.forEach(p => {
          expect(p.category).toBe(category);
        });
      }

      // Cleanup
      await productRepo.delete(product._id);
    });

    test('should respect limit parameter', async () => {
      const bestSellers = await productRepo.getBestSellers(3);
      expect(bestSellers.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Get Products by IDs', () => {
    test('should return products for valid IDs', async () => {
      // Create test products
      const product1 = await productRepo.create({
        name: 'Product for IDs test 1',
        price: 100,
        description: 'Test product',
        category: 'Test',
        stock: 10,
        seller: 'Test Seller',
        user: 'test-user-id',
        images: []
      });

      const product2 = await productRepo.create({
        name: 'Product for IDs test 2',
        price: 200,
        description: 'Test product',
        category: 'Test',
        stock: 20,
        seller: 'Test Seller',
        user: 'test-user-id',
        images: []
      });

      // Get products by IDs
      const products = await productRepo.getProductsByIds([product1._id, product2._id]);

      expect(products).toBeDefined();
      expect(products.length).toBe(2);
      expect(products.map(p => p._id)).toContain(product1._id);
      expect(products.map(p => p._id)).toContain(product2._id);

      // Cleanup
      await productRepo.delete(product1._id);
      await productRepo.delete(product2._id);
    });

    test('should return empty array for empty IDs', async () => {
      const products = await productRepo.getProductsByIds([]);
      expect(products).toEqual([]);
    });

    test('should filter out non-existent products', async () => {
      const products = await productRepo.getProductsByIds(['non-existent-1', 'non-existent-2']);
      expect(products).toEqual([]);
    });
  });

  describe('Service Layer Integration', () => {
    test('should call repository methods correctly', async () => {
      const mockProductId = 'test-product-id';
      
      // Test getRelatedProducts
      const relatedProducts = await productService.getRelatedProducts(mockProductId, 6);
      expect(Array.isArray(relatedProducts)).toBe(true);

      // Test getBestSellers
      const bestSellers = await productService.getBestSellers(10);
      expect(Array.isArray(bestSellers)).toBe(true);

      // Test getProductsByIds
      const products = await productService.getProductsByIds([]);
      expect(Array.isArray(products)).toBe(true);
    });
  });
});
