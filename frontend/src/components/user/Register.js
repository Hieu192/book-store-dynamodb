import React, { Fragment, useState, useEffect } from "react";

import MetaData from "../layout/MetaData";

import { useAlert } from "react-alert";
import { useDispatch, useSelector } from "react-redux";
import { register, clearErrors } from "../../actions/userActions";
import { Link, useNavigate } from "react-router-dom";
import { getErrorMessage } from "../../utils/errorHandler";

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState({
    name: "",
    email: "",
    password: "",
  });

  const { name, email, password } = user;

  const [avatar, setAvatar] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(
    "/images/default_avatar.jpg"
  );

  const alert = useAlert();
  const dispatch = useDispatch();

  const { isAuthenticated, error, loading } = useSelector(
    (state) => state.auth
  );
  const history = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      alert.success("Đăng ký tài khoản thành công!");
      history("/");
    }

    if (error) {
      alert.error(getErrorMessage(error));
      dispatch(clearErrors());
    }
  }, [dispatch, alert, isAuthenticated, error, history]);

  const submitHandler = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set("name", name);
    formData.set("email", email);
    formData.set("password", password);
    formData.set("avatar", avatar);
    dispatch(register(formData));
  };

  const onchange = (e) => {
    if (e.target.name === "avatar") {
      const reader = new FileReader();

      reader.onload = () => {
        if (reader.readyState === 2) {
          setAvatarPreview(reader.result);
          setAvatar(reader.result);
        }
      };

      reader.readAsDataURL(e.target.files[0]);
    } else {
      setUser({ ...user, [e.target.name]: e.target.value });
    }
  };

  return (
    <Fragment>
      <MetaData title={"Đăng kí tài khoản"} />

      <h3 className="title-30 text-center mb-20">Đăng kí tài khoản</h3>

      <form
        className="login-form"
        encType="multipart/form-data"
        onSubmit={submitHandler}
      >
        <div className="row">
          <div className="col-12">
            <div className="form-inner">
              <label htmlFor="name_field">Tên</label>
              <input
                type="name"
                name="name"
                placeholder="Tên của bạn"
                value={name}
                onChange={onchange}
              />
            </div>
          </div>
          <div className="col-12">
            <div className="form-inner">
              <label htmlFor="email_field">Email</label>
              <input
                type="email"
                name="email"
                placeholder="Email của bạn"
                value={email}
                onChange={onchange}
              />
            </div>
          </div>
          <div className="col-12">
              <label htmlFor="password_field">Mật khẩu </label>
            <div className="form-inner flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="abcdef*****"
                value={password}
                onChange={onchange}
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
          <div className="form-group">
            <label htmlFor="avatar_upload">Avatar</label>
            <div className="d-flex align-items-center">
              <div>
                <figure className="border-[50%] w-[60px] h-[60px] overflow-hidden mr-[16px]">
                  <img
                    src={avatarPreview}
                    className="rounded-pill"
                    alt="Avatar Preview"
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                    }}
                  />
                </figure>
              </div>
              <div className="custom-file">
                <input
                  type="file"
                  name="avatar"
                  className="custom-file-input"
                  id="customFile"
                  onChange={onchange}
                />
                <label className="custom-file-label" htmlFor="customFile">
                  Chọn avatar
                </label>
              </div>
            </div>
          </div>
          <div className="col-12 mt-5">
            <div className="form-inner">
              <button
                className="px-[16px] py-[16px] text-[white] hover:opacity-[0.8]"
                type="submit"
                style={{ border: "none", background: "#1976D2" }}
                // disabled={loading ? true : false}
              >
                  Tạo tài khoản
         
              </button>
            </div>
          </div>
        </div>
      </form>
    </Fragment>
  );
};

export default Register;
