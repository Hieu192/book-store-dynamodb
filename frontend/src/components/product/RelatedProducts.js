import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import Product from "./Product";
import { Grid } from "@mui/material";

const RelatedProducts = ({ category }) => {
  const { products } = useSelector((state) => state.products);
  const i = 0;
  return (
    <>
      {category ? (
        <>
          <section className="related-product pb-80">
            <div className="container">
              <div className="row">
                <div className="col-12">
                  <h3 className="eg-title1 eg-title2 mb-50">Sản phẩm liên quan</h3>
                </div>
              </div>
              
              <Grid container columnSpacing={{xs: 1, sm:2,md:2}} rowSpacing={{xs: 1, sm:2,md:2 }}>
                {products.map(function (product) {
                    if (product.category === category) {
                      return (
                        <>
                          <Grid key={product._id} item md={2.4} xs={12} sm={4} >
                            <Product  product={product} col={3} />
                          </Grid>                          
                        </>
                      );
                    }
                  })}
              </Grid>
               
            </div>
          </section>
        </>
      ) : (
        <></>
      )}
    </>
  );
};

export default RelatedProducts;
