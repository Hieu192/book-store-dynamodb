const APIFeatures = require('../../../utils/apiFeatures');

// Mock Mongoose Query
class MockQuery {
  constructor(data = []) {
    this.data = data;
    this.filters = {};
    this.sortOptions = {};
    this.limitValue = null;
    this.skipValue = 0;
  }

  find(filter = {}) {
    // Convert price[$gte] or price[gte] format to nested object format
    const processedFilter = {};
    Object.keys(filter).forEach(key => {
      const match = key.match(/^(\w+)\[\$?(\w+)\]$/);
      if (match) {
        const [, field, operator] = match;
        if (!processedFilter[field]) {
          processedFilter[field] = {};
        }
        processedFilter[field][operator] = filter[key];
      } else {
        processedFilter[key] = filter[key];
      }
    });
    
    this.filters = { ...this.filters, ...processedFilter };
    return this;
  }

  sort(sortOptions) {
    this.sortOptions = sortOptions;
    return this;
  }

  limit(limit) {
    this.limitValue = limit;
    return this;
  }

  skip(skip) {
    this.skipValue = skip;
    return this;
  }

  // Simulate query execution
  then(resolve) {
    let result = [...this.data];

    // Apply filters
    if (this.filters.name && this.filters.name.$regex) {
      const regex = new RegExp(this.filters.name.$regex, this.filters.name.$options);
      result = result.filter(item => regex.test(item.name));
    }

    // Handle price filters (both with and without $)
    if (this.filters.price !== undefined) {
      const priceFilter = this.filters.price;
      
      // If it's a number, it's an exact match
      if (typeof priceFilter === 'number') {
        result = result.filter(item => item.price === priceFilter);
      } else if (typeof priceFilter === 'object') {
        // It's a range filter
        if (priceFilter.$gte !== undefined || priceFilter.gte !== undefined) {
          const minPrice = priceFilter.$gte || priceFilter.gte;
          result = result.filter(item => item.price >= minPrice);
        }
        if (priceFilter.$lte !== undefined || priceFilter.lte !== undefined) {
          const maxPrice = priceFilter.$lte || priceFilter.lte;
          result = result.filter(item => item.price <= maxPrice);
        }
        if (priceFilter.$gt !== undefined || priceFilter.gt !== undefined) {
          const minPrice = priceFilter.$gt || priceFilter.gt;
          result = result.filter(item => item.price > minPrice);
        }
        if (priceFilter.$lt !== undefined || priceFilter.lt !== undefined) {
          const maxPrice = priceFilter.$lt || priceFilter.lt;
          result = result.filter(item => item.price < maxPrice);
        }
      }
    }

    // Handle ratings filters (both with and without $)
    if (this.filters.ratings) {
      const ratingsFilter = this.filters.ratings;
      if (ratingsFilter.$gte !== undefined || ratingsFilter.gte !== undefined) {
        const minRating = ratingsFilter.$gte || ratingsFilter.gte;
        result = result.filter(item => item.ratings >= minRating);
      }
      if (ratingsFilter.$lte !== undefined || ratingsFilter.lte !== undefined) {
        const maxRating = ratingsFilter.$lte || ratingsFilter.lte;
        result = result.filter(item => item.ratings <= maxRating);
      }
    }

    // Apply sorting
    if (this.sortOptions.price) {
      result.sort((a, b) => this.sortOptions.price === 1 ? a.price - b.price : b.price - a.price);
    }
    if (this.sortOptions.name) {
      result.sort((a, b) => this.sortOptions.name === 1 ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
    }

    // Apply pagination
    if (this.limitValue) {
      result = result.slice(this.skipValue, this.skipValue + this.limitValue);
    }

    resolve(result);
    return Promise.resolve(result);
  }
}

describe('APIFeatures Unit Tests', () => {
  let mockData;

  beforeEach(() => {
    mockData = [
      { name: 'Apple iPhone 13', price: 800, ratings: 4.5 },
      { name: 'Samsung Galaxy', price: 700, ratings: 4.2 },
      { name: 'Apple MacBook', price: 1200, ratings: 4.8 },
      { name: 'Cheap Product', price: 50, ratings: 2.0 },
      { name: 'Medium Product', price: 150, ratings: 3.5 },
      { name: 'Expensive Product', price: 500, ratings: 4.0 }
    ];
  });

  describe('search()', () => {
    it('should search products by keyword', async () => {
      const queryStr = { keyword: 'Apple' };
      const mockQuery = new MockQuery(mockData);
      const apiFeatures = new APIFeatures(mockQuery, queryStr).search();
      const products = await apiFeatures.query;

      expect(products).toHaveLength(2);
      expect(products[0].name).toContain('Apple');
    });

    it('should return all products when no keyword', async () => {
      const queryStr = {};
      const mockQuery = new MockQuery(mockData);
      const apiFeatures = new APIFeatures(mockQuery, queryStr).search();
      const products = await apiFeatures.query;

      expect(products).toHaveLength(6);
    });

    it('should be case insensitive', async () => {
      const testData = [{ name: 'LAPTOP', price: 1000, ratings: 4.0 }];
      const queryStr = { keyword: 'laptop' };
      const mockQuery = new MockQuery(testData);
      const apiFeatures = new APIFeatures(mockQuery, queryStr).search();
      const products = await apiFeatures.query;

      expect(products).toHaveLength(1);
    });
  });

  describe('filter()', () => {
    it('should filter products by price range', async () => {
      const queryStr = { 'price[gte]': 100, 'price[lte]': 200 };
      const mockQuery = new MockQuery(mockData);
      const apiFeatures = new APIFeatures(mockQuery, queryStr).filter();
      const products = await apiFeatures.query;

      expect(products).toHaveLength(1);
      expect(products[0].name).toBe('Medium Product');
    });

    it('should filter products by ratings', async () => {
      const queryStr = { 'ratings[gte]': 4 };
      const mockQuery = new MockQuery(mockData);
      const apiFeatures = new APIFeatures(mockQuery, queryStr).filter();
      const products = await apiFeatures.query;

      expect(products).toHaveLength(4);
      products.forEach(product => {
        expect(product.ratings).toBeGreaterThanOrEqual(4);
      });
    });

    it('should remove non-filter fields', async () => {
      const queryStr = { 
        keyword: 'test', 
        page: 1, 
        limit: 10,
        sortByPrice: 1,
        price: 150
      };
      
      const mockQuery = new MockQuery(mockData);
      const apiFeatures = new APIFeatures(mockQuery, queryStr).filter();
      const products = await apiFeatures.query;

      expect(products).toHaveLength(1);
      expect(products[0].price).toBe(150);
    });
  });

  describe('sort()', () => {
    it('should sort products by price ascending', async () => {
      const queryStr = { sortByPrice: 1 };
      const mockQuery = new MockQuery(mockData);
      const apiFeatures = new APIFeatures(mockQuery, queryStr).sort();
      const products = await apiFeatures.query;

      expect(products[0].price).toBe(50);
      expect(products[1].price).toBe(150);
      expect(products[2].price).toBe(500);
    });

    it('should sort products by price descending', async () => {
      const queryStr = { sortByPrice: -1 };
      const mockQuery = new MockQuery(mockData);
      const apiFeatures = new APIFeatures(mockQuery, queryStr).sort();
      const products = await apiFeatures.query;

      expect(products[0].price).toBe(1200);
      expect(products[1].price).toBe(800);
      expect(products[2].price).toBe(700);
    });

    it('should sort by custom field', async () => {
      const queryStr = { sort: 'name' };
      const mockQuery = new MockQuery(mockData);
      const apiFeatures = new APIFeatures(mockQuery, queryStr).sort();
      const products = await apiFeatures.query;

      expect(products[0].name).toBe('Apple iPhone 13');
    });
  });

  describe('pagination()', () => {
    it('should paginate products', async () => {
      const largeData = [];
      for (let i = 1; i <= 15; i++) {
        largeData.push({ name: `Product ${i}`, price: i * 100, ratings: 4.0 });
      }

      const queryStr = { page: 1 };
      const mockQuery = new MockQuery(largeData);
      const apiFeatures = new APIFeatures(mockQuery, queryStr).pagination(10);
      const products = await apiFeatures.query;

      expect(products).toHaveLength(10);
    });

    it('should get second page', async () => {
      const largeData = [];
      for (let i = 1; i <= 15; i++) {
        largeData.push({ name: `Product ${i}`, price: i * 100, ratings: 4.0 });
      }

      const queryStr = { page: 2 };
      const mockQuery = new MockQuery(largeData);
      const apiFeatures = new APIFeatures(mockQuery, queryStr).pagination(10);
      const products = await apiFeatures.query;

      expect(products).toHaveLength(5);
    });

    it('should default to page 1', async () => {
      const queryStr = {};
      const mockQuery = new MockQuery(mockData);
      const apiFeatures = new APIFeatures(mockQuery, queryStr).pagination(10);
      const products = await apiFeatures.query;

      expect(products).toHaveLength(6);
    });
  });

  describe('chaining methods', () => {
    it('should chain search, filter, sort, and pagination', async () => {
      const queryStr = { 
        keyword: 'Apple',
        'price[gte]': 500,
        sortByPrice: 1,
        page: 1
      };

      const mockQuery = new MockQuery(mockData);
      const apiFeatures = new APIFeatures(mockQuery, queryStr)
        .search()
        .filter()
        .sort()
        .pagination(10);

      const products = await apiFeatures.query;

      expect(products).toHaveLength(2);
      expect(products[0].name).toContain('Apple');
      expect(products[0].price).toBeLessThanOrEqual(products[1].price);
    });
  });
});
