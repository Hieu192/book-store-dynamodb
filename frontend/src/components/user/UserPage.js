import React from "react";
import Login from "./Login";
import Register from "./Register";
import {useState} from "react"

const UserPage = () => {
  const [show,setShow]=useState("register")
  return (
    <section class="login-section pt-100 pb-100">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-6 pl-40 pb-40" style={{width:"100%"}}>
            <img 
              width="100%"
              src="images/Login.svg">
            </img>
          </div>
          <div class="col-lg-6 rounded-lg">
            <ul
              style={{borderRadius:"10px"}}
              class="nav nav-pills justify-content-center pt-3 bg-white"
              id="pills-tab"
              role="tablist"
            >
              <li class="nav-item mb-3 mx-2" role="presentation">
                <button
                   className="rounded-lg bg-[##1976D2] px-[64px] py-[15px] text-[white] text-[20px] border-[2px] border-[#1976D2]"
                   style={show=="login"?{backgroundColor:"white",color:"#1976D2"}:{backgroundColor:"#1976D2"}}
                   id="pills-home-tab"
                  type="button"
                  role="tab"
                  aria-controls="pills-home"
                  aria-selected="true"
                  onClick={() =>{setShow("register")}}
                >
                  Đăng ký
                </button>
              </li>
              <li class="nav-item mb-3 mx-2" role="presentation">
                <button

                  className="rounded-lg bg-[#] px-[64px] py-[15px] text-[white] text-[20px] border-[2px] border-[#1976D2]"
                  style={show=="register"?{backgroundColor:"white",color:"#1976D2"}:{backgroundColor:"#1976D2"}}
                  id="pills-profile-tab"
                  type="button"
                  role="tab"
                  aria-controls="pills-profile"
                  aria-selected="false"
                  onClick={() =>{console.log("login");setShow("login")}}
                >
                  Đăng nhập
                </button>
              </li>
            </ul>
            <div class="tab-content bg-white rounded-lg" id="pills-tabContent">
              {show=="register"?
              <div
              
                id="pills-home"
                role="tabpanel"
                aria-labelledby="pills-home-tab"
              >
                <div class="form-wrap box--shadow">
                  <Register />
                </div>
              </div> :
              <div 
           
                id="pills-profile"
                role="tabpanel"
                aria-labelledby="pills-profile-tab"
              >
                <div class="form-wrap box--shadow">
                  <Login />
                </div>
              </div>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UserPage;
