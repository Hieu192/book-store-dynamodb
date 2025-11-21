import React, { useEffect, useState } from 'react';
import { Grid, Typography, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import Product from './Product';

const RecentlyViewed = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchRecentlyViewed = async () => {
      try {
        // Get recently viewed IDs from localStorage
        const recentlyViewedIds = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
        
        if (recentlyViewedIds.length === 0) {
          return;
        }

        // Fetch products by IDs
        const { data } = await axios.get(
          `http://localhost:4000/api/v1/products/by-ids?ids=${recentlyViewedIds.join(',')}`,
          { withCredentials: true }
        );
        
        // Sort products to match the order in localStorage (most recent first)
        const sortedProducts = recentlyViewedIds
          .map(id => data.products.find(p => p._id === id))
          .filter(p => p !== undefined);
        
        setProducts(sortedProducts);
      } catch (error) {
        console.error('Error fetching recently viewed:', error);
        setProducts([]);
      }
    };

    fetchRecentlyViewed();

    // Listen for storage changes
    const handleStorageChange = () => {
      fetchRecentlyViewed();
    };

    window.addEventListener('recentlyViewedUpdated', handleStorageChange);
    return () => {
      window.removeEventListener('recentlyViewedUpdated', handleStorageChange);
    };
  }, []);

  if (products.length === 0) {
    return null;
  }

  return (
    <Box my={6}>
      <Typography 
        variant="h4" 
        fontWeight={700} 
        mb={3}
        textAlign="center"
        sx={{ color: '#1976d2' }}
      >
        {t('recommendations.recentlyViewed')}
      </Typography>
      <Grid container spacing={2}>
        {products.slice(0, 6).map((product) => (
          <Grid key={product._id} item xs={6} sm={4} md={2.4}>
            <Product product={product} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default RecentlyViewed;
