import { Box, Container, Grid } from "@mui/material";
import React from "react";

const Features = () => {
  return (
    <Container className="feature-area feature-style-one mb-100 pt-76">
      <Grid container display="flex">
        <Grid item md={3}> 
        <div class="feature-card-alpha">
              <div class="feature-icon">
                <img
                  src="https://res.cloudinary.com/hba-solver/image/upload/v1657877004/features/feature-i1_kuhehk.svg"
                  alt=""
                />
              </div>
              <div class="feature-content">
                <h5>Fast Free Shipping</h5>
                <p>Around the world</p>
              </div>
            </div>
        </Grid>
        <Grid md={3}>
        <div class="feature-card-alpha">
              <div class="feature-icon">
                <img
                  src="https://res.cloudinary.com/hba-solver/image/upload/v1657877004/features/feature-i2_a22qln.svg"
                  alt=""
                />
              </div>
              <div class="feature-content">
                <h5>24/7 Supports</h5>
                <p>Contact us 24 hours</p>
              </div>
            </div>
        </Grid>
        <Grid md={3}>
        <div class="feature-card-alpha">
              <div class="feature-icon">
                <img
                  src="https://res.cloudinary.com/hba-solver/image/upload/v1657877004/features/feature-i3_n1cql4.svg"
                  alt=""
                />
              </div>
              <div class="feature-content">
                <h5>100% Money Back</h5>
                <p>Guarantee of money retun</p>
              </div>
            </div>
        </Grid>

        <Grid md={3}>
          <div class="feature-card-alpha">
              <div class="feature-icon">
                <img
                  src="https://res.cloudinary.com/hba-solver/image/upload/v1657877004/features/feature-i4_aavhpz.svg"
                  alt=""
                />
              </div>
              <div class="feature-content">
                <h5>100% Secure Payment</h5>
                <p>Your payment are safe with us.</p>
              </div>
            </div>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Features;
