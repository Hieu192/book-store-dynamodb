import { createStore, combineReducers, applyMiddleware } from "redux";
import thunk from "redux-thunk";
import { composeWithDevTools } from "redux-devtools-extension";
import storage from 'redux-persist/lib/storage'

import {
	productsReducer,
	newProductReducer,
	productReducer,
	productDetailsReducer,
	newReviewReducer,
	productReviewsReducer,
	reviewReducer,
} from "./reducers/productReducers";
import {
	authReducer,
	userReducer,
	forgotPasswordReducer,
	allUsersReducer,
	userDetailsReducer,
} from "./reducers/userReducers";
import { cartReducer } from "./reducers/cartReducers";
import {
	newOrderReducer,
	myOrdersReducer,
	orderDetailsReducer,
	allOrdersReducer,
	orderReducer,
} from "./reducers/orderReducers";
import {
	newCategoryReducer,
	categoryReducer,
	dltCategoryReducer,
} from "./reducers/categoryReducer";
import { chatbotReducer } from "./reducers/chatbotReducers";

const reducer = combineReducers({
	products: productsReducer,
	productDetails: productDetailsReducer,
	newProduct: newProductReducer,
	product: productReducer,
	productReviews: productReviewsReducer,
	review: reviewReducer,
	auth: authReducer,
	user: userReducer,
	allUsers: allUsersReducer,
	userDetails: userDetailsReducer,
	forgotPassword: forgotPasswordReducer,
	cart: cartReducer,
	newOrder: newOrderReducer,
	myOrders: myOrdersReducer,
	allOrders: allOrdersReducer,
	orderDetails: orderDetailsReducer,
	order: orderReducer,
	newReview: newReviewReducer,
	newCategory: newCategoryReducer,
	category: categoryReducer,
	dltCategory: dltCategoryReducer,
	chatbot: chatbotReducer, // Add chatbot reducer
});
let initialState = {
	cart: {
		cartItems: localStorage.getItem("cartItems")
			? JSON.parse(localStorage.getItem("cartItems"))
			: [],
		shippingInfo: localStorage.getItem("shippingInfo")
			? JSON.parse(localStorage.getItem("shippingInfo"))
			: {},
	},
};

const middlware = [thunk];
export const store = createStore(
	reducer,
	initialState,
	composeWithDevTools(applyMiddleware(...middlware))
);


