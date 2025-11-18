import axios from 'axios'
import { ADD_TO_CART, REMOVE_ITEM_CART, SAVE_SHIPPING_INFO,ADD_DISCOUNT

 } from '../constants/cartConstants'

export const addItemToCart = (id, quantity) => async (dispatch, getState) => {

    const { data } = await axios.get(`http://localhost:4000/api/v1/product/${id}`,	{
        withCredentials: true // Cấu hình Axios để bao gồm cookie trong yêu cầu
      },)

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
}
export const addDiscountToCart=(discount)=>async (dispatch, getState) => {

    dispatch({
        type: ADD_DISCOUNT,
        payload:discount
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