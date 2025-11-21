import { Box, Container, Grid } from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";

const Features = () => {
  const { t } = useTranslation();
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
                <h5>{t('features.freeShipping')}</h5>
                <p>{t('features.freeShippingDesc')}</p>
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
                <h5>{t('features.support')}</h5>
                <p>{t('features.supportDesc')}</p>
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
                <h5>{t('features.moneyBack')}</h5>
                <p>{t('features.moneyBackDesc')}</p>
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
                <h5>{t('features.securePayment')}</h5>
                <p>{t('features.securePaymentDesc')}</p>
              </div>
            </div>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Features;
