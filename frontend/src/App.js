import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import ScrollToTop from "./components/layout/ScrollToTop";
import "./i18n/i18n";

import Home from "./components/Home";
import ProductDetails from "./components/product/ProductDetails";

// Cart Imports
import Cart from "./components/cart/Cart";
import Shipping from "./components/cart/Shipping";
import ConfirmOrder from "./components/cart/ConfirmOrder";
import Payment from "./components/cart/Payment";
import OrderSuccess from "./components/cart/OrderSuccess";

// Order Imports
import ListOrders from "./components/order/ListOrders";
import OrderDetails from "./components/order/OrderDetails";

// Auth or User imports
import Profile from "./components/user/Profile";
import UpdateProfile from "./components/user/UpdateProfile";
import UpdatePassword from "./components/user/UpdatePassword";
import ForgotPassword from "./components/user/ForgotPassword";
import NewPassword from "./components/user/NewPassword";

// Admin Imports
import Dashboard from "./components/admin/Dashboard";
import ProductsList from "./components/admin/ProductsList";
import NewProduct from "./components/admin/NewProduct";
import UpdateProduct from "./components/admin/UpdateProduct";
import OrdersList from "./components/admin/OrdersList";
import ProcessOrder from "./components/admin/ProcessOrder";
import UsersList from "./components/admin/UsersList";
import UpdateUser from "./components/admin/UpdateUser";
import ProductReviews from "./components/admin/ProductReviews";
import NewCategory from "./components/admin/NewCategory";
import CategorysList from "./components/admin/CatagoryList";

import ProtectedUserRoute from "./components/route/ProtectedUserRoute";
import ProtectedAdminRoute from "./components/route/ProtectedAdminRoute";
import { loadUser } from "./actions/userActions";
import { store } from "./store";
import axios from "axios";

// Payment
import UserPage from "./components/user/UserPage";
import Contact from "./components/Contact";
import SearchPage from "./components/SearchPage";

// Chatbot
import ChatWidget from "./components/chatbot/ChatWidget";

function App() {
  useEffect(() => {
    store.dispatch(loadUser());
  }, []);

  return (



    <div className="App">
      <ScrollToTop />
      <Header />

      <Routes>

        <Route path="/" element={<Home />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/search/:keyword" element={<SearchPage />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/login" element={<UserPage />} />
        <Route path="/password/forgot" element={<ForgotPassword />} />
        <Route path="/password/reset/:token" element={<NewPassword />} />

        <Route element={<ProtectedUserRoute />}>
          <Route path="/shipping" element={<Shipping />} />
          <Route path="/confirm" element={<ConfirmOrder />} />
          <Route path="/success" element={<OrderSuccess />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/me" element={<Profile />} />
          <Route path="/me/update" element={<UpdateProfile />} />
          <Route path="/password/update" element={<UpdatePassword />} />
          <Route path="/orders/me" element={<ListOrders />} />
          <Route path="/order/:id" element={<OrderDetails />} />
        </Route>
        <Route element={<ProtectedAdminRoute />}>
          <Route
            path="/dashboard"
            element={<Dashboard />}

          />
          <Route
            path="/admin/products"
            element={<ProductsList />}

          />
          <Route
            path="/admin/product"
            element={<NewProduct />}

          />
          <Route
            path="/admin/category"
            element={<CategorysList />}

          />
          <Route
            path="/admin/category/new"
            element={<NewCategory />}

          />
          <Route
            path="/admin/product/:id"
            element={<UpdateProduct />}

          />
          <Route
            path="/admin/orders"
            element={<OrdersList />}

          />
          <Route
            path="/admin/order/:id"
            element={<ProcessOrder />}

          />
          <Route
            path="/admin/users"
            element={<UsersList />}

          />
          <Route
            path="/admin/user/:id"
            element={<UpdateUser />}

          />
          <Route
            path="/admin/reviews"
            element={<ProductReviews />}

          />
        </Route>
      </Routes>
      <Footer />

      {/* Chatbot Widget */}
      <ChatWidget />

      {/* {!loading && (!isAuthenticated || user.role !== "admin") && } */}
    </div>


  );
}

export default App;
