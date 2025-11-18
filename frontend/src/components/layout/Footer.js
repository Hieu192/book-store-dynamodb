import { Container, Grid } from "@mui/material";
import React from "react";
import { Link } from "react-router-dom";
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import EmailIcon from '@mui/icons-material/Email';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';  
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import PinterestIcon from '@mui/icons-material/Pinterest';
import YouTubeIcon from '@mui/icons-material/YouTube';
import LocationOnIcon from '@mui/icons-material/LocationOn';

const Footer = () => {
  return (
    <>
      <footer className="footer-area footer-design-1">
        <Container sx={{marginTop:"8rem"}}>
          <Grid container p="80px 0" justifyContent="" alignItems="center">
            <Grid item md={3}>
              <div className="single-widget">
                <div className="footer-title">
                  <h3>Về chúng tôi</h3>
                </div>
                <div className="footerabout-content">
                  <p>
                    Web bán truyện tranh
                    </p>
                </div>
                <div className="footer-address">
                  <ul>
                    <li>
                      <PhoneInTalkIcon/>
                        <span>
                          <Link to="/">+1234 5678 9123</Link>
                          <br />
                          <Link to="/">+1234 5678 9123</Link>
                        </span>
                    </li>
                  </ul>
                </div>
              </div>
            </Grid>
            <Grid item md={7} container justifyContent="center" alignItems="center">
              <div className="single-widget text-lg-center">
                <div className="footer-logo">
                  <Link to="/">
                    <img src="" alt="" />
                  </Link>
                </div>
                <div className="form-design form-design-1"></div>
                <div className="footer-social pt-50">
                  <ul>
                    <li>
                      <Link to="/">
                        <FacebookIcon color="primary"/>
                      </Link>
                    </li>
                    <li>
                      <Link to="/">
                        <InstagramIcon color="primary"/>
                      </Link>
                    </li>
                    <li>
                      <Link to="/">
                        <LinkedInIcon color="secondary" fontSize="large"/>
                      </Link>
                    </li>
                    <li>
                      <Link to="/">
                        <PinterestIcon color="success"/>
                      </Link>
                    </li>
                    <li>
                      <Link to="/">
                        <YouTubeIcon color="primary"/>
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </Grid>

            <Grid item md={2}>
              <div className="single-widget">
                      <div className="footer-title">
                        <h3>Company</h3>
                      </div>
                  </div>
            </Grid>
          </Grid>
          <div className="row g-3 copy-right-section align-items-center">
            <div className="col-xl-6 col-lg-6 col-md-12 col-sm-12 col-12 text-lg-start text-center">
              <div className="copy-right-area">
                <p className="copy-text">
                  Copyright 2024
                  <Link to="/">Bán sách</Link>
                </p>
              </div>
            </div>
            <div className="col-xl-6 col-lg-6 col-md-12 col-sm-12 col-12">
              <div className="footer-card-support text-lg-end text-center"></div>
            </div>
          </div>
        </Container>
      </footer>
    </>
  );
};

export default Footer;
