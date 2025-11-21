import React, { useEffect, useState } from "react";
import axios from "axios";
import Product from "./Product";
import { Grid, CircularProgress, Box } from "@mui/material";

const RelatedProducts = ({ productId, category }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      if (!productId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data } = await axios.get(
          `http://localhost:4000/api/v1/product/${productId}/related?limit=5`,
          { withCredentials: true }
        );
        setProducts(data.products || []);
      } catch (error) {
        console.error('Error fetching related products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedProducts();
  }, [productId]);

  if (loading) {
    return (
      <section className="related-product pb-80">
        <div className="container">
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <>
      {products.length > 0 && (
        <>
          <section className="related-product pb-80">
            <div className="container">
              <div className="row">
                <div className="col-12">
                  <h3 className="eg-title1 eg-title2 mb-50">Sản phẩm liên quan</h3>
                </div>
              </div>
              
              <Grid container columnSpacing={{xs: 1, sm:2,md:2}} rowSpacing={{xs: 1, sm:2,md:2 }}>
                {products.map((product) => (
                  <Grid key={product._id} item md={2.4} xs={12} sm={4}>
                    <Product product={product} col={3} />
                  </Grid>
                ))}
              </Grid>
               
            </div>
          </section>
        </>
      )}
    </>
  );
};

export default RelatedProducts;
