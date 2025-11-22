import axios from 'axios'
import API_CONFIG from '../config/config';
import { ADD_TO_CART, REMOVE_ITEM_CART, SAVE_SHIPPING_INFO, ADD_DISCOUNT, CLEAR_CART } from '../constants/cartConstants'

export const addItemToCart = (id, quantity) => async (dispatch, getState) => {
    try {
        const { data } = await axios.get(`${API_CONFIG.API_URL}/product/${id}`, {
            withCredentials: true // Cấu hình Axios để bao gồm cookie trong yêu cầu
        })

        dispatch({
            type: ADD_TO_CART,
            payload: {
                product: data.product._id,
                name: data.product.name,
                price: data.product.price,
                image: data.product.images && data.product.images[0] ? data.product.images[0].url : '/images/default-product.png',
                stock: data.product.stock,
                quantity
            }
        })

        localStorage.setItem('cartItems', JSON.stringify(getState().cart.cartItems))
    } catch (error) {
        console.error('❌ Error adding item to cart:', error);
        console.error('🔗 API URL:', `${API_CONFIG.API_URL}/product/${id}`);
        console.error('📋 Error details:', error.response?.data || error.message);
        alert('Không thể thêm sản phẩm vào giỏ hàng. Vui lòng kiểm tra:\n1. Backend đang chạy?\n2. URL API đúng chưa?');
    }
}

export const addDiscountToCart = (discount) => async (dispatch, getState) => {
    dispatch({
        type: ADD_DISCOUNT,
        payload: discount
    })
}

export const removeItemFromCart = (id) => async (dispatch, getState) => {
    dispatch({
        type: REMOVE_ITEM_CART,
        payload: id
    })

    localStorage.setItem('cartItems', JSON.stringify(getState().cart.cartItems))
}

export const saveShippingInfo = (data) => async (dispatch) => {
    dispatch({
        type: SAVE_SHIPPING_INFO,
        payload: data
    })

    localStorage.setItem('shippingInfo', JSON.stringify(data))
}

export const clearCart = () => async (dispatch) => {
    dispatch({
        type: CLEAR_CART
    })
}