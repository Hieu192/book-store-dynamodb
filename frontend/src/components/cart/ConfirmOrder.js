import React, { Fragment } from 'react'
import { Link,useNavigate } from 'react-router-dom'

import MetaData from '../layout/MetaData'
import CheckoutSteps from './CheckoutSteps'

import { useDispatch, useSelector } from 'react-redux'
import { Box, Divider, Grid, Stack } from '@mui/material'
import { Container } from 'react-bootstrap'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { createOrder, clearErrors } from "../../actions/orderActions";

const ConfirmOrder = () => {

    const navigate= useNavigate();
    const dispatch = useDispatch();
    const { cartItems, shippingInfo } = useSelector(state => state.cart)
    const { user } = useSelector(state => state.auth)
    const {discount} = useSelector(state => state.cart)

    // Calculate Order Prices
    const itemsPrice = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0)
    const shippingPrice = itemsPrice > 200 ? 0 : 25000
    const taxPrice = Number((0.05 * itemsPrice).toFixed(2))
    const discountAmount = Number(discount) || 0; // Fix NaN when discount is undefined/null
    const totalPrice = (itemsPrice + shippingPrice + taxPrice - discountAmount).toFixed(2);
    const randomNumber = Math.floor(Math.random() * 1000000);

    const processToPayment = async () => {
        const data = {
            orderCode:randomNumber,
            itemsPrice: Math.floor(itemsPrice),
            shippingPrice,
            taxPrice,
            totalPrice:Math.floor(totalPrice)
        }

        sessionStorage.setItem('orderInfo', JSON.stringify(data))
        const order = {
            orderItems: cartItems,
            shippingInfo,
            ...data
          };
          dispatch(createOrder(order));
        
       
        const res=await fetch('http://localhost:4000/api/v1/create-payment-link',{
            method: 'POST', 
            headers: {
              'Content-Type': 'application/json' 
            },
            body: JSON.stringify(data) 
          })
          const {checkoutUrl}=await res.json()
       window.location.href=checkoutUrl

    }

    return (
        <Fragment>

            <MetaData title={'Confirm Order'} />

            <CheckoutSteps shipping confirmOrder />

            <Container>
                <Grid container>
                    <Grid item mt={5} md={8}> 
                        <Box sx={{borderRadius:"1rem", background:"white", padding:"20px"}}>
            
                            <h3 className="mb-3" style={{fontWeight:'700', marginTop:"5px"}}><PlaceOutlinedIcon/> Địa chỉ</h3>
                            <p
                                style={{
                                    fontWeight:"600",
                                    fontSize:"20px",
                                    color:"#1976d2"
                                }}
                            >{user && user.name}</p>
                            <p><b>Số điện thoại:</b> {shippingInfo.phoneNo}</p>
                            <p className="mb-4"><b>Địa chỉ:</b> {`${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.postalCode}, ${shippingInfo.country}`}</p>
                            <Link to="/shipping"> 
                                <p
                                    style={{
                                        fontSize:"18px",
                                        fontWeight:"500",
                                        color:"#1976d2"
                                    }}
                                >Chỉnh sửa địa chỉ</p>
                            </Link>
                        </Box>    
                        
                        <h4 className="m-4 font-normal"><b>Giỏ hàng</b> ( {cartItems.length} sản phẩm )
                        </h4>
                        <Box sx={{borderRadius:"1rem", background:"white", padding:"20px"}}>
                            {cartItems.map(item => (
                                <Fragment>
                                    <div className="cart-item my-1" key={item.product}>
                                        <div className="row">
                                            <div className="col-4 col-lg-2">
                                                <img src={item.image} alt="Laptop" height="45" width="65" />
                                            </div>

                                            <div className="col-5 col-lg-6">
                                                <Link to={`/product/${item.product}`}>{item.name}</Link>
                                            </div>


                                            <div className="col-4 col-lg-4 mt-4 mt-lg-0">
                                                <p>{item.quantity} x {item.price} đ = <b>{(item.quantity * item.price).toFixed(2)} đ</b></p>
                                            </div>

                                        </div>
                                    </div>
                                    <Divider/>
                                </Fragment>
                            ))}
                        </Box>
                        
                    </Grid>
                    <Grid item pl={3} my={4} md={4}>
                        <div id="order_summary" className='bg-white'>
                            <h3 className='mb-4 text-xl'><b>Thành tiền</b></h3>
                        
                            <p>Đơn giá:  <span className="order-summary-values">{itemsPrice} đ</span></p>
                            {discountAmount > 0 && (
                                <p>Mã giảm giá: <span className="order-summary-values">-{discountAmount} đ</span></p>
                            )}
                            <p>Tiền vận chuyển: <span className="order-summary-values">+{shippingPrice} đ</span></p>
                            <p>Thuế VAT:  <span className="order-summary-values">+{taxPrice} đ</span></p>
                            <p className='mt-4' style={{color:"#028C2E", fontSize:"22px", fontWeight:"700"}}>Tổng cộng: <span className="order-summary-values">{totalPrice} đ</span></p>

                            <Divider/>


                            <button id="checkout_btn" className="btn btn-primary btn-block" onClick={processToPayment}>Tiến hành thanh toán</button>
                        </div>
                    </Grid>
                </Grid>
            </Container>

            <div className="row d-flex justify-content-between">
                <div className="col-12 col-lg-8 mt-5 order-confirm">
                </div>

                <div className="col-12 col-lg-3 my-4">
                    
                </div>
            </div>

        </Fragment>
    )
}

export default ConfirmOrder
