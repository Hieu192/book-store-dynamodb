import React, { Fragment, useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

import Loader from "../layout/Loader";
import MetaData from "../layout/MetaData";

import { useAlert } from "react-alert";
import { useDispatch, useSelector } from "react-redux";
import { login,loginWithGoogle, clearErrors } from "../../actions/userActions";
import {  useGoogleLogin } from "@react-oauth/google";
import Swal from "sweetalert2";
import { getErrorMessage } from "../../utils/errorHandler";
import { useTranslation } from "react-i18next";

const Login = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const alert = useAlert();
  const dispatch = useDispatch();
  const history = useNavigate();
  const loginSuccess = async ({ access_token }) => {
    const response = await fetch(
      `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${access_token}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${access_token}`,
          Accept: "application/json",
        },
      }
    );
    const data = await response.json();
    dispatch(loginWithGoogle(data));
    Swal.fire({
      title: t('common.success'),
      text: t('auth.loginSuccess'),
      icon: "success"
    });
  };
  const loginFailure = (response) => {
    console.log("Login failure", response);
    Swal.fire({
      title: t('common.error'),
      text: t('auth.loginFailed'),
      icon: "error"
    });
  };
  const loginGoogle = useGoogleLogin({
    onSuccess: loginSuccess,
    onError: loginFailure,
  });
  const { isAuthenticated, error, loading } = useSelector(
    (state) => state.auth
  );
  const location = useLocation();
  const redirect = location.search ? location.search.split("=")[1] : "/";

  useEffect(() => {
    if (isAuthenticated) {
      Swal.fire({
        title: t('common.success'),
        text: t('auth.loginSuccess'),
        icon: "success",
        timer: 2000,
        showConfirmButton: false
      });
      history(redirect);
    }

    if (error) {
      alert.error(getErrorMessage(error));
      dispatch(clearErrors());
    }
  }, [dispatch, alert, isAuthenticated, error, history, redirect]);

  const submitHandler = (e) => {
    e.preventDefault();
    dispatch(login(email, password));
  };

  return (
    <Fragment>
      {loading ? (
        <Loader />
      ) : (
        <Fragment>
          <MetaData title={"Login"} />

          <h3 className="title-30 text-center mb-35">{t('auth.loginTitle')}</h3>
          <form className="login-form" onSubmit={submitHandler} noValidate>
            <div className="row">
              <div className="col-12">
                <div className="form-inner">
                  <label htmlFor="email_field">{t('auth.email')}</label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    name="fname"
                    placeholder={t('auth.emailPlaceholder')}
                    required={false}
                  />
                </div>
              </div>
              <div className="col-12">
                  <label htmlFor="email_password">{t('auth.password')}</label>
                <div className="form-inner flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="name"
                    placeholder={t('auth.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={false}
                  />
                <div
            className="absolute right-[32px] "
            onClick={() => {
              setShowPassword(!showPassword);
            }}
          >
            {showPassword ? (
              <i className="fa-solid fa-eye-slash"></i>
            ) : (
              <i className="fa-solid fa-eye"></i>
            )}
          </div>
                </div>
              </div>
              <div className="col-12">
                <div className="form-inner d-flex justify-content-between">
                  <label></label>
                  <Link to="/password/forgot" className="forget-password">
                    {t('auth.forgotPassword')}
                  </Link>
                </div>
              </div>
            
              <div className="col-12">
                <div className="form-inner flex justify-center">
                  <button
                    className="px-[20px] py-[10px] text-[white] hover:text-[#1976D2] bg-[#1976D2] border-[1px] border-[#1976D2]  hover:bg-[white]"
                    type="submit"
                  >
                     {t('auth.login')}
                  </button>
                </div>
              </div>
              <div className="w-[100%] text-center">{t('common.or')}</div>
              <div className="flex justify-center w-[100%]">

              <button
          type="button"
          className="hover:opacity-[0.9] flex justify-center bg-[#3f81f9] text-white py-[10px] mt-[25px] rounded px-[10px]"
          onClick={(e) => {
            e.preventDefault();
            loginGoogle();
          }}
        >
          <img
            src="images/google.png"
            className="w-[30px] h-[30px] bg-white rounded p-[5px] mr-[15px]"
            alt="Google"
            />
          {t('auth.loginWithGoogle')}
        </button>
            </div>
            </div>
          </form>
        </Fragment>
      )}
    </Fragment>
  );
};

export default Login;
