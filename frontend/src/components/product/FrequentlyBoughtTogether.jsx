import React, { useEffect, useState } from 'react';
import { Grid, Typography, Box, CircularProgress, Button, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import Product from './Product';
import { addItemToCart } from '../../actions/cartActions';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import Swal from 'sweetalert2';

const FrequentlyBoughtTogether = ({ productId, currentProduct }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalOrders, setTotalOrders] = useState(0);

  useEffect(() => {
    const fetchBoughtTogether = async () => {
      if (!productId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data } = await axios.get(
          `http://localhost:4000/api/v1/product/${productId}/bought-together?limit=3`,
          { withCredentials: true }
        );
        setProducts(data.products || []);
        setTotalOrders(data.totalOrders || 0);
      } catch (error) {
        console.error('Error fetching bought together:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBoughtTogether();
  }, [productId]);

  const handleAddAllToCart = () => {
    // Add current product
    if (currentProduct) {
      dispatch(addItemToCart(currentProduct._id, 1));
    }

    // Add all related products
    products.forEach(product => {
      dispatch(addItemToCart(product._id, 1));
    });

    Swal.fire({
      title: t('common.success'),
      text: `Đã thêm ${products.length + 1} sản phẩm vào giỏ hàng`,
      icon: 'success'
    });
  };

  const calculateTotalPrice = () => {
    const currentPrice = currentProduct?.price || 0;
    const othersPrice = products.reduce((sum, p) => sum + p.price, 0);
    return currentPrice + othersPrice;
  };

  const calculateDiscount = () => {
    const total = calculateTotalPrice();
    return Math.round(total * 0.05); // 5% discount
  };

  if (loading) {
    return (
      <section className="bought-together pb-80">
        <div className="container">
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        </div>
      </section>
    );
  }

  // Show message if no data yet (for testing)
  if (products.length === 0 || totalOrders < 2) {
    return (
      <section className="bought-together pb-80">
        <div className="container">
          <Box my={4} p={3} sx={{ backgroundColor: '#f5f5f5', borderRadius: 2 }}>
            <Typography variant="h6" color="text.secondary" textAlign="center">
              💡 {t('recommendations.frequentlyBoughtTogether')}
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" mt={1}>
              (Chưa có dữ liệu - Cần ít nhất 2 đơn hàng chứa sản phẩm này)
            </Typography>
          </Box>
        </div>
      </section>
    );
  }

  return (
    <section className="bought-together pb-80">
      <div className="container">
        <Box my={6}>
          <Box display="flex" alignItems="center" mb={3}>
            <Typography 
              variant="h3" 
              fontWeight={700}
              className="eg-title1 eg-title2"
            >
              {t('recommendations.frequentlyBoughtTogether')}
            </Typography>
            <Chip 
              label={`${totalOrders} đơn hàng`}
              color="primary"
              size="small"
              sx={{ ml: 2 }}
            />
          </Box>

          <Box 
            sx={{ 
              border: '2px solid #e0e0e0', 
              borderRadius: 2, 
              p: 3,
              backgroundColor: '#f9f9f9'
            }}
          >
            <Grid container spacing={2} alignItems="center">
              {/* Current Product */}
              {currentProduct && (
                <Grid item xs={12} sm={6} md={3}>
                  <Box textAlign="center">
                    <img 
                      src={currentProduct.images?.[0]?.url || '/images/default-product.png'}
                      alt={currentProduct.name}
                      style={{ width: '100%', maxWidth: 150, height: 'auto' }}
                    />
                    <Typography variant="body2" mt={1} fontWeight={500}>
                      {currentProduct.name}
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {currentProduct.price?.toLocaleString()} đ
                    </Typography>
                  </Box>
                </Grid>
              )}

              {/* Plus signs and other products */}
              {products.map((product, index) => (
                <React.Fragment key={product._id}>
                  <Grid item xs={12} sm={1} md={1}>
                    <Typography variant="h4" textAlign="center" color="text.secondary">
                      +
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={5} md={2}>
                    <Box textAlign="center">
                      <img 
                        src={product.images?.[0]?.url || '/images/default-product.png'}
                        alt={product.name}
                        style={{ width: '100%', maxWidth: 120, height: 'auto' }}
                      />
                      <Typography variant="body2" mt={1} fontSize={13}>
                        {product.name}
                      </Typography>
                      <Typography variant="body1" color="primary" fontWeight={500}>
                        {product.price?.toLocaleString()} đ
                      </Typography>
                    </Box>
                  </Grid>
                </React.Fragment>
              ))}

              {/* Action Box */}
              <Grid item xs={12} md={3}>
                <Box 
                  sx={{ 
                    border: '2px dashed #1976d2', 
                    borderRadius: 2, 
                    p: 2,
                    backgroundColor: 'white'
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Tổng cộng:
                  </Typography>
                  <Typography 
                    variant="h5" 
                    color="primary" 
                    fontWeight={700}
                    sx={{ textDecoration: 'line-through', opacity: 0.6 }}
                  >
                    {calculateTotalPrice().toLocaleString()} đ
                  </Typography>
                  <Typography variant="h4" color="error" fontWeight={700} mb={2}>
                    {(calculateTotalPrice() - calculateDiscount()).toLocaleString()} đ
                  </Typography>
                  <Chip 
                    label={`Tiết kiệm ${calculateDiscount().toLocaleString()} đ`}
                    color="success"
                    size="small"
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<AddShoppingCartIcon />}
                    onClick={handleAddAllToCart}
                    sx={{ 
                      backgroundColor: '#ff6b35',
                      '&:hover': { backgroundColor: '#ff5722' }
                    }}
                  >
                    Mua combo (Giảm 5%)
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </div>
    </section>
  );
};

export default FrequentlyBoughtTogether;
