import React, { Fragment } from "react";
import { Link, useNavigate } from "react-router-dom";

import MetaData from "../layout/MetaData";
import {useState,useEffect} from "react"
import { useAlert } from "react-alert";
import { useDispatch, useSelector } from "react-redux";
import { addItemToCart, removeItemFromCart,addDiscountToCart } from "../../actions/cartActions";
import { Box, Container, Divider, Grid, LinearProgress, Stack, Typography } from "@mui/material";
import DiscountIcon from '@mui/icons-material/Discount';
import { Button } from "react-bootstrap";
const Cart = () => {
  const [discount,setDiscount]=useState(0)
  const [total,setTotal]=useState(0)
  const navigate=useNavigate()
  const { isAuthenticated} = useSelector(
    (state) => state.auth
  );
  const dispatch = useDispatch();

  const { cartItems } = useSelector((state) => state.cart);

  const removeCartItemHandler = (id) => {
    dispatch(removeItemFromCart(id));
  };

  const increaseQty = (id, quantity, stock) => {
    const newQty = quantity + 1;

    if (newQty > stock) return;

    dispatch(addItemToCart(id, newQty));
  };

  const decreaseQty = (id, quantity) => { 
    const newQty = quantity - 1;

    if (newQty <= 0) return;

    dispatch(addItemToCart(id, newQty));
  };
  const addDiscount=(discount)=>{
    setDiscount(discount)
    dispatch(addDiscountToCart(discount));
  }

  const checkoutHandler = () => {
    if(!isAuthenticated)
    navigate("/login");
  else navigate("/shipping");
  };
  useEffect(() =>{
  const tongtien=cartItems
  .reduce(
    (acc, item) => acc + item.quantity * item.price,
    -discount
  )
  .toFixed(2)
  console.log(tongtien)
  setTotal(tongtien);
}
  ,[cartItems]);
  return (
    <Fragment>
      <MetaData title={"Giỏ hàng của bạn"} />
      {cartItems.length === 0 ? (
        <h2 style={{ marginTop: "200px",fontSize:"25px",textAlign:"center" }}>GIỎ HÀNG CỦA BẠN ĐANG TRỐNG</h2>
      ) : (
        <Container>
          <Grid container>
            <Grid container md={12} sm={12} sx={12} my={3}>
              <Grid container>
                <Typography variant="h5" mt="80px">
                  Giỏ hàng: <b>{cartItems.length} sản phẩm</b>
                </Typography>
              </Grid>
              
            </Grid>
            <Grid item md={8} sx={{background:"white", borderRadius:"15px"}} justifyContent="center" alignItems="center"> 
              {cartItems.map((item) => (
                <Fragment>
                  
                  <div className="cart-item" key={item.product}>
                    <Grid container>
                      <Grid item md={3} sm={4}>
        
                        <img
                          src={item.image}
                          alt="Laptop"
                          height="90"
                          width="115"
                        />
                      
                      </Grid>


                      <div className="col-5 col-lg-3" style={{justifyContent:"center", alignItems:"center", display:"flex"}}>
                        <Link to={`/products/${item.product}`}>
                          {item.name}
                        </Link>
                      </div>

                      <div className="col-4 col-lg-2 mt-4 mt-lg-0" style={{justifyContent:"center", alignItems:"center", display:"flex"}}>
                        <p id="card_item_price">{item.price} đ</p>
                      </div>

                      <div className="col-4 col-lg-3 mt-4 mt-lg-0" style={{justifyContent:"center", alignItems:"center", display:"flex"}}>
                        <div className="stockCounter d-inline">
                          <span
                            className="btn btn-danger minus"
                            onClick={() =>
                              decreaseQty(item.product, item.quantity)
                            }
                          >
                            -
                          </span>

                          <input
                            type="number"
                            className="form-control count d-inline"
                            value={item.quantity}
                            readOnly
                          />

                          <span
                            className="btn btn-primary plus"
                            onClick={() =>
                              increaseQty(
                                item.product,
                                item.quantity,
                                item.stock
                              )
                            }
                          >
                            +
                          </span>
                        </div>
                      </div>

                      <div className="col-4 col-lg-1 mt-4 mt-lg-0" style={{justifyContent:"center", alignItems:"center", display:"flex"}}>
                        <i
                          id="delete_cart_item"
                          className="fa fa-trash btn btn-danger"
                          onClick={() => removeCartItemHandler(item.product)}
                        ></i>
                      </div>
                    </Grid> 
                  </div>
                  
                  <Divider/>
                </Fragment>
              ))}
            
            </Grid>
            <Grid item md={4} pl={2}>
              <Stack id="sale" sx={{background:"white"}}>
                <Box flexDirection="row" display="flex" my={2}>
                    <DiscountIcon color="primary"/>
                    <Typography ml={1} color="primary">
                      Khuyến mãi
                    </Typography>
                </Box>
                <Divider/>
                  <Box>
                    <Box my={2}>
                      <Typography fontWeight={550}>
                        MÃ GIẢM 50K - ĐƠN HÀNG TỪ 500K
                      </Typography>
                      <Typography fontSize={14} fontWeight={300} color="#7A7E7F">
                        Áp dụng cho tất cả sản phẩm
                      </Typography>
                    </Box>
                    <Box mb={2} sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ width: '70%', mr: 1 }}>
                        <LinearProgress variant="determinate" value={50} fontSize={10}/>
                      </Box>
                      <Box sx={{ minWidth: 35}} >
                        <Button className="btn-apply"
                        disabled={total<500000}
                        onClick={()=>{addDiscount(50000)}}>
                          Áp dụng
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                <Divider/>

                <Divider/>
                  <Box>
                    <Box my={2}>
                      <Typography fontWeight={550}>
                        MÃ GIẢM 100K - ĐƠN HÀNG TỪ 1 TRIỆU
                      </Typography>
                      <Typography fontSize={14} fontWeight={300} color="#7A7E7F">
                        Áp dụng cho tất cả sản phẩm
                      </Typography>
                    </Box>
                    <Box mb={2} sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ width: '70%', mr: 1 }}>
                        <LinearProgress variant="determinate" value={50} fontSize={10}/>
                      </Box>
                      <Box sx={{ minWidth: 35}} >
                        <Button className="btn-apply"
                         disabled={total<1000000}
                         onClick={()=>{addDiscount(100000)}}>
                          Áp dụng
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                <Divider/>
              </Stack>
              <Box mt={2} id="order_summary" sx={{background:"white"}}>
                <h4>Thành tiền</h4>
                <hr />
                <p>
                  Số lượng:{" "}
                  <span className="order-summary-values">
                    {cartItems.reduce(
                      (acc, item) => acc + Number(item.quantity),
                      0
                    )}{" "}
                    (Sản phẩm)
                  </span>
                </p>
                <p>
                  Thành tiền:{" "}
                  <span className="order-summary-values">
                    {cartItems
                      .reduce(
                        (acc, item) => acc + item.quantity * item.price,
                        -discount
                      )
                      .toFixed(2)}
                      đ
                  </span>
                </p>

                <hr />
                <Box textAlign="center" width="100%" margin="0 auto" display="flex">
                  <button
                    style={{width:"100%"}}
                    id="checkout_btn"
                    className="btn btn-primary btn-block"
                    onClick={checkoutHandler}
                  >
                    Thanh toán
                  </button>
                </Box>
                
              </Box>
            </Grid>
          </Grid>
        </Container>
      )}
    </Fragment>
  );
};

export default Cart;
