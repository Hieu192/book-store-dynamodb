import React, { useEffect, useState } from 'react';
import { Grid, Typography, Box, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import Product from './Product';

const BestSellers = ({ limit = 10, category = null }) => {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBestSellers = async () => {
      try {
        setLoading(true);
        const categoryParam = category ? `&category=${category}` : '';
        const { data } = await axios.get(
          `http://localhost:4000/api/v1/products/bestsellers?limit=${limit}${categoryParam}`,
          { withCredentials: true }
        );
        setProducts(data.products || []);
      } catch (error) {
        console.error('Error fetching best sellers:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBestSellers();
  }, [limit, category]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

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
        {t('recommendations.bestSellers')}
      </Typography>
      <Grid container spacing={2}>
        {products.map((product) => (
          <Grid key={product._id} item xs={6} sm={4} md={2.4}>
            <Product product={product} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default BestSellers;
