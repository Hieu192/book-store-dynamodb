import React, { useEffect, useState } from 'react';
import { Grid, Typography, Box, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import Product from './Product';

const CustomersAlsoViewed = ({ productId }) => {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlsoViewed = async () => {
      if (!productId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data } = await axios.get(
          `http://localhost:4000/api/v1/product/${productId}/also-viewed?limit=5`,
          { withCredentials: true }
        );
        setProducts(data.products || []);
      } catch (error) {
        console.error('Error fetching also viewed:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlsoViewed();
  }, [productId]);

  // Track view when component mounts
  useEffect(() => {
    const trackView = async () => {
      if (!productId) return;

      try {
        await axios.post(
          `http://localhost:4000/api/v1/product/${productId}/view`,
          {},
          { withCredentials: true }
        );
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    };

    trackView();
  }, [productId]);

  if (loading) {
    return (
      <section className="also-viewed pb-80">
        <div className="container">
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        </div>
      </section>
    );
  }

  // Show message if no data yet (for testing)
  if (products.length === 0) {
    return (
      <section className="also-viewed pb-80">
        <div className="container">
          <Box my={4} p={3} sx={{ backgroundColor: '#f5f5f5', borderRadius: 2 }}>
            <Typography variant="h6" color="text.secondary" textAlign="center">
              👥 {t('recommendations.customersAlsoViewed')}
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" mt={1}>
              (Chưa có dữ liệu - Hãy xem thêm vài sản phẩm khác để tạo gợi ý)
            </Typography>
          </Box>
        </div>
      </section>
    );
  }

  return (
    <section className="also-viewed pb-80">
      <div className="container">
        <Box my={6}>
          <Typography 
            variant="h3" 
            fontWeight={700} 
            mb={4}
            className="eg-title1 eg-title2"
          >
            {t('recommendations.customersAlsoViewed')}
          </Typography>
          <Grid container columnSpacing={{xs: 1, sm:2,md:2}} rowSpacing={{xs: 1, sm:2,md:2}}>
            {products.map((product) => (
              <Grid key={product._id} item md={2.4} xs={12} sm={4}>
                <Product product={product} col={3} />
              </Grid>
            ))}
          </Grid>
        </Box>
      </div>
    </section>
  );
};

export default CustomersAlsoViewed;
