import * as React from 'react';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import Link from '@mui/material/Link';
import HomeIcon from '@mui/icons-material/Home';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import GrainIcon from '@mui/icons-material/Grain';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

export default function IconBreadcrumbs() {
  const { t } = useTranslation();
  const location = useLocation();
  const { product } = useSelector((state) => state.productDetails);

  // Determine current page
  const isProductDetail = location.pathname.includes('/product/');
  const isSearch = location.pathname.includes('/search');

  return (
    <div role="presentation" style={{ marginBottom: '20px' }}>
      <Breadcrumbs aria-label="breadcrumb">
        {/* Home */}
        <Link
          component={RouterLink}
          to="/"
          underline="hover"
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            color: 'inherit',
            '&:hover': {
              color: '#1976d2',
              textDecoration: 'underline'
            }
          }}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          {t('nav.home')}
        </Link>

        {/* Products */}
        {(isProductDetail || isSearch) && (
          <Link
            component={RouterLink}
            to="/search"
            underline="hover"
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              color: 'inherit',
              '&:hover': {
                color: '#1976d2',
                textDecoration: 'underline'
              }
            }}
          >
            <WhatshotIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            {t('nav.products')}
          </Link>
        )}

        {/* Product Name (current page) */}
        {isProductDetail && product && (
          <Typography
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              color: 'text.primary',
              fontWeight: 500
            }}
          >
            <GrainIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            {product.name}
          </Typography>
        )}
      </Breadcrumbs>
    </div>
  );
}
