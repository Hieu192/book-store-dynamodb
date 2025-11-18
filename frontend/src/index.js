import React from "react";
import ReactDOM from "react-dom";
import "./index.css"
import App from "./App";
import { PersistGate } from 'redux-persist/integration/react'
import {store,persistor} from './store'
import { Provider } from "react-redux";
import {BrowserRouter as Router} from "react-router-dom"
import { GoogleOAuthProvider } from '@react-oauth/google';
import { positions, transitions, Provider as AlertProvider } from "react-alert";
import AlertTemplate from "react-alert-template-basic";
const clientId="1015015226249-sfuoi6ejbpii4pbdkd6k5ft21sh2j48i.apps.googleusercontent.com"
const options = {
  timeout: 5000,
  position: positions.BOTTOM_CENTER,
  transition: transitions.SCALE,
};

ReactDOM.render(
  <Provider store={store}>
      <GoogleOAuthProvider clientId={clientId}>
    <AlertProvider template={AlertTemplate} {...options}>
      <Router>
        <App />
      </Router>
    </AlertProvider>
    </GoogleOAuthProvider>
  </Provider>,
  document.getElementById("root")
);