import React from 'react';
import { useState,useEffect } from 'react';
import { Box, Card, CardContent, CardMedia, Rating, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { AddShoppingCart, VisibilityOutlined } from '@mui/icons-material';
import IconButton from '@mui/material/IconButton';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import {useParams}  from "react-router-dom"
import { useDispatch, useSelector } from "react-redux";
import { addItemToCart } from "../../actions/cartActions";
import {
  getProducts,
  getProductDetails,
  newReview,
  clearErrors,
} from "../../actions/productActions";

import Alert from '@mui/material/Alert';
import CheckIcon from '@mui/icons-material/Check';
import { useNavigate } from 'react-router-dom';

const Product = ({ product }) => {
  const [value, setValue] = React.useState(2);
  const [showAlert, setShowAlert] = useState();
  const [quantity, setQuantity] = useState(1);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const goToProduct = ()=>{
      navigate(`/product/${product._id}`)
  }

  const addToCart = (id) => {
    setShowAlert(true);
    dispatch(addItemToCart(id, quantity));
  };

  return (
    <Card 
      className='product-card'  
      sx={{ 
        position: 'relative',
        transition: 'transform 0.2s ease-in-out',
        '&:hover': { 
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
          transform: 'scale(1.05)'
        } 
      }}
    >

      
      <Box width="174px" margin="0 auto" height="174px" marginTop="24px">
        <Link to={`/product/${product._id}`} >
          <CardMedia
            sx={{ padding: "16px", height: '174px' }}
            component="img"
            width="100%"
            image={product.images && product.images[0] ? product.images[0].url : '/images/default-product.png'}
            alt="Product"
          />
        </Link >
      </Box>

      <CardContent>
        <Link to={`/product/${product._id}`}>
          <Typography className='product-name' gutterBottom variant="h6" fontSize={16} fontWeight={600}>
            {product.name}
          </Typography>
        </Link>

        { product.salePrice ? (
          <Stack direction="row" className='product-special-price'>
            <Typography className='price' variant="h6" mr={3} fontSize={4}>
              {product.salePrice}đ
            </Typography>

            <Typography 
              top={10}
              right={10}
              position="absolute" 
              className='discount-percent' 
              variant='h6' fontSize={14}>
              {product.salePrice ? <> {Math.round((product.salePrice/product.price)*100)}%</> : <> 0%</>}
            </Typography>
            
            <Typography className='product-old-price' variant="body2">
            {Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
            </Typography>
          </Stack>
         ) : (
          
            <Typography className='price' variant="h6" mr={3} fontSize={4} fontWeight={500}>
              {Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
            </Typography>
        
         )
        }


        <Stack direction="row" className='ratting-sold'>
          {(product.ratings && product.ratings) > 0 ? (
            <>
            <Rating
              className='rating-custom'
              size="small"
              name="simple-controlled"
              value={product.ratings}
              onChange={(event, newValue) => {
                setValue(newValue);
              }}
            />
            <Box component="div" className='sold-container'>
              <Typography component="div" className='sold-qty-num' fontSize="12px">
                <Typography component="span" fontSize="13px" mr={0.5}>
                  | Đã bán
                </Typography>
                {product.soldQty}
              </Typography>
            </Box>
          </>
          ) : (
            <Box component="div" className='sold-container'>
              <Typography component="div" className='sold-qty-num' fontSize="12px">
                <Typography component="span" fontSize="13px" mr={0.5}>
                  | Đã bán 0
                </Typography>
                {product.soldQty}
              </Typography>
            </Box>
          )}
        </Stack>

        {/* StackButton sử dụng position absolute */}
        <Stack 
          direction="row" 
          spacing={4} 
          className='stack-button'
          
        >
          {showAlert && ( 
        <Alert 
          sx={{position:"absolute"}}
          icon={<CheckIcon fontSize="inherit" />} 
          severity="success"
         
        >
          Đã thêm vào giỏ hàng
        </Alert>
      )}

          <IconButton color="primary" aria-label="add to wishlist cart"
            
            onClick={() => addToCart(product._id)}
          >
            {showAlert ? <></> : <AddShoppingCart />}
          </IconButton>

          <IconButton color="primary" aria-label="add to shopping cart"
            onClick={goToProduct}
          >
            {showAlert ? <></> : <VisibilityOutlined/>}
          </IconButton>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default Product;
