/**
 * APIFeatures Sort Test
 * Test sorting functionality with different formats
 */

const APIFeatures = require('../../../utils/apiFeatures');

describe('APIFeatures Sort Tests', () => {
  let mockQuery;

  beforeEach(() => {
    mockQuery = {
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis()
    };
  });

  describe('sortByPrice with string format', () => {
    test('should sort ascending with "asc"', () => {
      const queryStr = { sortByPrice: 'asc' };
      const apiFeatures = new APIFeatures(mockQuery, queryStr);
      
      apiFeatures.sort();
      
      expect(mockQuery.sort).toHaveBeenCalledWith({ price: 1 });
    });

    test('should sort descending with "desc"', () => {
      const queryStr = { sortByPrice: 'desc' };
      const apiFeatures = new APIFeatures(mockQuery, queryStr);
      
      apiFeatures.sort();
      
      expect(mockQuery.sort).toHaveBeenCalledWith({ price: -1 });
    });
  });

  describe('sortByPrice with numeric format', () => {
    test('should sort ascending with "1"', () => {
      const queryStr = { sortByPrice: '1' };
      const apiFeatures = new APIFeatures(mockQuery, queryStr);
      
      apiFeatures.sort();
      
      expect(mockQuery.sort).toHaveBeenCalledWith({ price: 1 });
    });

    test('should sort ascending with 1', () => {
      const queryStr = { sortByPrice: 1 };
      const apiFeatures = new APIFeatures(mockQuery, queryStr);
      
      apiFeatures.sort();
      
      expect(mockQuery.sort).toHaveBeenCalledWith({ price: 1 });
    });

    test('should sort descending with "-1"', () => {
      const queryStr = { sortByPrice: '-1' };
      const apiFeatures = new APIFeatures(mockQuery, queryStr);
      
      apiFeatures.sort();
      
      expect(mockQuery.sort).toHaveBeenCalledWith({ price: -1 });
    });

    test('should sort descending with -1', () => {
      const queryStr = { sortByPrice: -1 };
      const apiFeatures = new APIFeatures(mockQuery, queryStr);
      
      apiFeatures.sort();
      
      expect(mockQuery.sort).toHaveBeenCalledWith({ price: -1 });
    });
  });

  describe('default sorting', () => {
    test('should sort by createdAt descending when no sortByPrice', () => {
      const queryStr = {};
      const apiFeatures = new APIFeatures(mockQuery, queryStr);
      
      apiFeatures.sort();
      
      expect(mockQuery.sort).toHaveBeenCalledWith('-createdAt');
    });
  });

  describe('custom sort', () => {
    test('should handle custom sort parameter', () => {
      const queryStr = { sort: 'name,price' };
      const apiFeatures = new APIFeatures(mockQuery, queryStr);
      
      apiFeatures.sort();
      
      expect(mockQuery.sort).toHaveBeenCalledWith('name price');
    });
  });
});
