import React, { Fragment, useState, useEffect } from "react";
import Pagination from "react-js-pagination";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

import MetaData from "./layout/MetaData";
import Product from "./product/Product";
import Loader from "./layout/Loader";
import ProductList from "./product/ProductList"

import { useDispatch, useSelector } from "react-redux";
import { useAlert } from "react-alert";
import { getProducts } from "../actions/productActions";
import { getCategory } from "../actions/categoryActions";
import Banner from "./layout/Banner";
import { useLocation, useSearchParams } from "react-router-dom";
import CategorySection from "./layout/CategorySection";
import Features from "./layout/Features";
import { Container, FormControlLabel, FormGroup, Grid } from "@mui/material";
import Banner2 from "./layout/Banner2"
import Checkbox from "@mui/material/Checkbox";
import InputSlider from "./layout/InputSlider";
import LatestProduct from "./product/LatestProduct";

const { createSliderWithTooltip } = Slider;
const Range = createSliderWithTooltip(Slider.Range);
const maxPrice = 1000000;
const Home = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [catagory, setCatagory] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const { category } = useSelector((state) => state.category);

  const alert = useAlert();
  const dispatch = useDispatch();

  const {
    loading,
    products,
    error,
    productsCount,
    resPerPage,
    filteredProductsCount,
  } = useSelector((state) => state.products);

  useEffect(() => {
    if (error) {
      return alert.error(error);
    }
    dispatch(getProducts(searchParams));
  }, [dispatch, alert, error, searchParams]);
  function setCurrentPageNo(pageNumber) {
    setCurrentPage(pageNumber);
    setSearchParams((prev) => {
      prev.set('page', pageNumber)
      return prev;
    })
  }

  let count = productsCount;
  let ishome = false;
  if (location.pathname === "/") {
    ishome = true;
  }

  const handleChange = (catName) => {
    setCatagory(catName);
  };

  return (
    <Fragment>
      {loading ? (
        <Loader />
      ) : (
        <Fragment>
          <MetaData title={"Shop sách online"} />
          {ishome && (
            <Banner2/>
          )}
          {ishome && <CategorySection setCatagory={setCatagory}/>}

          {ishome ? (
            <div class="col-lg-12 mt-5">
              <div class="section-head-style-one">
                <h2>Các cuốn sách best seller!</h2>
                <p>Các cuốn sách được độc giả yêu thích nhất</p>
              </div>
            </div>
          ) : (
            <>
              <div class="col-lg-12 mt-100">
                <div class="section-head-style-one">
                  <h2>Danh sách sản phẩm</h2>
                </div>
              </div>
            </>
          )}

        <Container>
            <ProductList products={products} col={2.4}/>
          </Container>

          {resPerPage <= count && (
            <div className="d-flex justify-content-center mt-5">
              <Pagination
                activePage={currentPage}
                itemsCountPerPage={resPerPage}
                totalItemsCount={productsCount}
                onChange={setCurrentPageNo}
                nextPageText={"Next"}
                prevPageText={"Prev"}
                firstPageText={"First"}
                lastPageText={"Last"}
                itemClass="page-item"
                linkClass="page-link"
                activeLinkClass="bg-f96822"
              />
            </div>
          )}

          <Features />
        </Fragment>
      )}
    </Fragment>
  );
};

export default Home;
