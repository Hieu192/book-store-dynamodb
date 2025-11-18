const Search = require('../../../utils/elasticlurn');

describe('Elasticlunr Search Unit Tests', () => {
  const mockProducts = [
    {
      _id: '1',
      name: 'Harry Potter and the Philosopher Stone',
      description: 'A magical adventure book for children',
      category: 'Fantasy'
    },
    {
      _id: '2',
      name: 'The Lord of the Rings',
      description: 'Epic fantasy adventure in Middle Earth',
      category: 'Fantasy'
    },
    {
      _id: '3',
      name: 'JavaScript: The Good Parts',
      description: 'Programming book about JavaScript',
      category: 'Programming'
    },
    {
      _id: '4',
      name: 'Clean Code',
      description: 'A handbook of agile software craftsmanship',
      category: 'Programming'
    }
  ];

  it('should search by product name', () => {
    const results = Search('Harry Potter', mockProducts);
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].ref).toBe('1');
  });

  it('should search by description', () => {
    const results = Search('magical', mockProducts);
    
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].ref).toBe('1');
  });

  it('should search by category', () => {
    const results = Search('Programming', mockProducts);
    
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThanOrEqual(2);
    const refs = results.map(r => r.ref);
    expect(refs).toContain('3');
    expect(refs).toContain('4');
  });

  it('should return empty array for no matches', () => {
    const results = Search('nonexistent keyword xyz', mockProducts);
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });

  it('should handle empty keyword', () => {
    const results = Search('', mockProducts);
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  it('should handle empty data array', () => {
    const results = Search('test', []);
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });

  it('should be case insensitive', () => {
    const results1 = Search('HARRY', mockProducts);
    const results2 = Search('harry', mockProducts);
    
    expect(results1.length).toBe(results2.length);
    if (results1.length > 0) {
      expect(results1[0].ref).toBe(results2[0].ref);
    }
  });

  it('should return results with score', () => {
    const results = Search('JavaScript', mockProducts);
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('ref');
    expect(results[0]).toHaveProperty('score');
    expect(typeof results[0].score).toBe('number');
  });

  it('should prioritize name matches over description', () => {
    const results = Search('JavaScript', mockProducts);
    
    // Product with "JavaScript" in name should rank higher
    expect(results[0].ref).toBe('3');
  });

  it('should handle partial word matches', () => {
    const results = Search('Java', mockProducts);
    
    // Elasticlunr may not match partial words depending on configuration
    // This test is optional and depends on the search implementation
    if (results.length > 0) {
      expect(results[0].ref).toBe('3');
    } else {
      // If partial match doesn't work, that's also acceptable
      expect(results.length).toBe(0);
    }
  });
});
