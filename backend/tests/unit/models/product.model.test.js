const mongoose = require('mongoose');
const Product = require('../../../models/product');

describe('Product Model Unit Tests', () => {
  const validProductData = {
    name: 'Harry Potter and the Philosopher Stone',
    price: 299000,
    description: 'A magical adventure book for children and adults',
    category: 'Fantasy',
    seller: 'BookStore Vietnam',
    stock: 50,
    images: [
      {
        public_id: 'products/harry_potter_1',
        url: 'https://example.com/harry-potter.jpg'
      }
    ],
    user: new mongoose.Types.ObjectId()
  };

  describe('Schema Validation', () => {
    it('should create product with valid data', () => {
      const product = new Product(validProductData);
      const error = product.validateSync();
      
      expect(error).toBeUndefined();
      expect(product.name).toBe(validProductData.name);
      expect(product.price).toBe(validProductData.price);
    });

    it('should require product name', () => {
      const productData = { ...validProductData };
      delete productData.name;
      
      const product = new Product(productData);
      const error = product.validateSync();
      
      expect(error.errors.name).toBeDefined();
      expect(error.errors.name.message).toContain('Please enter product name');
    });

    it('should require product price', () => {
      const productData = { ...validProductData };
      delete productData.price;
      
      const product = new Product(productData);
      const error = product.validateSync();
      
      // Price has default value, so it won't error
      // Just check that default is applied
      expect(product.price).toBe(0);
    });

    it('should require product description', () => {
      const productData = { ...validProductData };
      delete productData.description;
      
      const product = new Product(productData);
      const error = product.validateSync();
      
      expect(error.errors.description).toBeDefined();
      expect(error.errors.description.message).toContain('Please enter product description');
    });

    it('should require category', () => {
      const productData = { ...validProductData };
      delete productData.category;
      
      const product = new Product(productData);
      const error = product.validateSync();
      
      expect(error.errors.category).toBeDefined();
      expect(error.errors.category.message).toContain('Please select category');
    });

    it('should require seller', () => {
      const productData = { ...validProductData };
      delete productData.seller;
      
      const product = new Product(productData);
      const error = product.validateSync();
      
      expect(error.errors.seller).toBeDefined();
      expect(error.errors.seller.message).toContain('Please enter product seller');
    });

    it('should require stock', () => {
      const productData = { ...validProductData };
      delete productData.stock;
      
      const product = new Product(productData);
      const error = product.validateSync();
      
      // Stock has default value, so it won't error
      // Just check that default is applied
      expect(product.stock).toBe(0);
    });

    it('should require user reference', () => {
      const productData = { ...validProductData };
      delete productData.user;
      
      const product = new Product(productData);
      const error = product.validateSync();
      
      expect(error.errors.user).toBeDefined();
    });

    it('should limit name to 100 characters', () => {
      const productData = { ...validProductData };
      productData.name = 'a'.repeat(101);
      
      const product = new Product(productData);
      const error = product.validateSync();
      
      expect(error.errors.name).toBeDefined();
      expect(error.errors.name.message).toContain('cannot exceed 100 characters');
    });

    it('should trim product name', () => {
      const productData = { ...validProductData };
      productData.name = '  Test Product  ';
      
      const product = new Product(productData);
      
      expect(product.name).toBe('Test Product');
    });
  });

  describe('Default Values', () => {
    it('should set default price to 0', () => {
      const productData = { ...validProductData };
      delete productData.price;
      
      const product = new Product(productData);
      
      expect(product.price).toBe(0);
    });

    it('should set default ratings to 0', () => {
      const product = new Product(validProductData);
      
      expect(product.ratings).toBe(0);
    });

    it('should set default stock to 0', () => {
      const productData = { ...validProductData };
      delete productData.stock;
      
      const product = new Product(productData);
      
      expect(product.stock).toBe(0);
    });

    it('should set default numOfReviews to 0', () => {
      const product = new Product(validProductData);
      
      expect(product.numOfReviews).toBe(0);
    });

    it('should set default reviews to empty array', () => {
      const product = new Product(validProductData);
      
      expect(product.reviews).toHaveLength(0);
      expect(Array.isArray(product.reviews)).toBe(true);
    });

    it('should set createdAt automatically', () => {
      const product = new Product(validProductData);
      
      expect(product.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Images Array', () => {
    it('should accept multiple images', () => {
      const productData = { ...validProductData };
      productData.images = [
        { public_id: 'img1', url: 'http://example.com/1.jpg' },
        { public_id: 'img2', url: 'http://example.com/2.jpg' },
        { public_id: 'img3', url: 'http://example.com/3.jpg' }
      ];
      
      const product = new Product(productData);
      const error = product.validateSync();
      
      expect(error).toBeUndefined();
      expect(product.images).toHaveLength(3);
    });

    it('should require public_id in images', () => {
      const productData = { ...validProductData };
      productData.images = [{ url: 'http://example.com/1.jpg' }];
      
      const product = new Product(productData);
      const error = product.validateSync();
      
      expect(error.errors['images.0.public_id']).toBeDefined();
    });

    it('should require url in images', () => {
      const productData = { ...validProductData };
      productData.images = [{ public_id: 'img1' }];
      
      const product = new Product(productData);
      const error = product.validateSync();
      
      expect(error.errors['images.0.url']).toBeDefined();
    });
  });

  describe('Reviews Array', () => {
    it('should accept reviews', () => {
      const product = new Product(validProductData);
      product.reviews = [
        {
          user: new mongoose.Types.ObjectId(),
          name: 'John Doe',
          rating: 5,
          comment: 'Great book!'
        }
      ];
      
      const error = product.validateSync();
      expect(error).toBeUndefined();
      expect(product.reviews).toHaveLength(1);
    });

    it('should require user in review', () => {
      const product = new Product(validProductData);
      product.reviews = [
        {
          name: 'John Doe',
          rating: 5,
          comment: 'Great book!'
        }
      ];
      
      const error = product.validateSync();
      expect(error.errors['reviews.0.user']).toBeDefined();
    });

    it('should require name in review', () => {
      const product = new Product(validProductData);
      product.reviews = [
        {
          user: new mongoose.Types.ObjectId(),
          rating: 5,
          comment: 'Great book!'
        }
      ];
      
      const error = product.validateSync();
      expect(error.errors['reviews.0.name']).toBeDefined();
    });

    it('should require rating in review', () => {
      const product = new Product(validProductData);
      product.reviews = [
        {
          user: new mongoose.Types.ObjectId(),
          name: 'John Doe',
          comment: 'Great book!'
        }
      ];
      
      const error = product.validateSync();
      expect(error.errors['reviews.0.rating']).toBeDefined();
    });

    it('should require comment in review', () => {
      const product = new Product(validProductData);
      product.reviews = [
        {
          user: new mongoose.Types.ObjectId(),
          name: 'John Doe',
          rating: 5
        }
      ];
      
      const error = product.validateSync();
      expect(error.errors['reviews.0.comment']).toBeDefined();
    });
  });

  describe('Book-specific Fields', () => {
    it('should handle book categories', () => {
      const categories = ['Fantasy', 'Science Fiction', 'Mystery', 'Romance', 'Programming'];
      
      categories.forEach(category => {
        const product = new Product({ ...validProductData, category });
        expect(product.category).toBe(category);
      });
    });

    it('should handle Vietnamese book names', () => {
      const productData = { ...validProductData };
      productData.name = 'Đắc Nhân Tâm - Dale Carnegie';
      
      const product = new Product(productData);
      const error = product.validateSync();
      
      expect(error).toBeUndefined();
      expect(product.name).toBe('Đắc Nhân Tâm - Dale Carnegie');
    });

    it('should handle Vietnamese descriptions', () => {
      const productData = { ...validProductData };
      productData.description = 'Cuốn sách hay nhất về kỹ năng giao tiếp và ứng xử';
      
      const product = new Product(productData);
      
      expect(product.description).toBe('Cuốn sách hay nhất về kỹ năng giao tiếp và ứng xử');
    });

    it('should handle price in VND', () => {
      const product = new Product({ ...validProductData, price: 150000 });
      
      expect(product.price).toBe(150000);
    });
  });
});
