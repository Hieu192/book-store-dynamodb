import React, { useEffect, useState } from 'react';
import API_CONFIG from '../../config/config';
import { Grid, Typography, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import Product from './Product';

const RecentlyViewed = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchRecentlyViewed = async () => {
      try {
        // Get recently viewed IDs from localStorage
        const recentlyViewedIds = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');

        if (recentlyViewedIds.length === 0) {
          return;
        }

        // Fetch products by IDs
        const { data } = await axios.get(
          `${API_CONFIG.API_URL}/products/by-ids?ids=${recentlyViewedIds.join(',')}`,
          {
            withCredentials: true,
            signal: abortController.signal
          }
        );

        // Sort products to match the order in localStorage (most recent first)
        const sortedProducts = recentlyViewedIds
          .map(id => data.products.find(p => p._id === id))
          .filter(p => p !== undefined);

        if (isMounted) {
          setProducts(sortedProducts);
        }
      } catch (error) {
        if (error.name !== 'CanceledError' && isMounted) {
          console.error('Error fetching recently viewed:', error);
          setProducts([]);
        }
      }
    };

    fetchRecentlyViewed();

    // Listen for storage changes
    const handleStorageChange = () => {
      if (isMounted) {
        fetchRecentlyViewed();
      }
    };

    window.addEventListener('recentlyViewedUpdated', handleStorageChange);

    return () => {
      isMounted = false;
      abortController.abort();
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
        {products.slice(0, 10).map((product) => (
          <Grid key={product._id} item xs={6} sm={4} md={2.4}>
            <Product product={product} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default RecentlyViewed;
