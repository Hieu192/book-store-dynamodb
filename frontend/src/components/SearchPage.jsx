
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

import { useSearchParams } from "react-router-dom";
import { Container, FormControlLabel, FormGroup, Grid } from "@mui/material";
import Checkbox from "@mui/material/Checkbox";
import InputSlider from "./layout/InputSlider";
import {Input} from "@mui/material";

const { createSliderWithTooltip } = Slider;
const Range = createSliderWithTooltip(Slider.Range);
const maxPrice = 1000000;
const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(Number.parseInt(searchParams.get('page') || '1'));
  const defaultPriceRange = [Number.parseInt(searchParams.get('price[gte]')||'0'), 
                            Number.parseInt(searchParams.get('price[lte]')||'1000000')]
  const [price, setPrice] = useState(defaultPriceRange);
  const [catagory, setCatagory] = useState(searchParams.getAll('category[]'));
  const [rating, setRating] = useState(Number.parseInt(searchParams.get('ratings[gte]') || '0'));
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
    setSearchParams((prev) => {
      prev.set('page', pageNumber);
      return prev;
    })
    setCurrentPage(pageNumber);
  }
  function setCurrentCategory(e, category) {
    setSearchParams((prev) => {
      if (e.target.checked)
        prev.append('category[]', category.name);
      else
        prev.delete('category[]', category.name);
      return prev; 
    })
    setCatagory(searchParams.getAll('category[]'));
  }
  function setCurrentPrice(e, idx) {
    setPrice((prev) => {
      prev[idx] = Number.parseInt(e.target.value)
      console.log(prev)
      return prev;
    })
    setSearchParams((prev) => {
      prev.set('price[gte]', price[0]);
      prev.set('price[lte]', price[1]);
      return prev;
    })
  }
  let count = filteredProductsCount;
  return (
    <Container>
      <Fragment>
        <Grid container mt={10}>
          <Grid item md={3} my={3}>
            <div className="px-5">
              <h4 className="mb-3"
                  style={{ color: "#1976d2", fontSize: "22px", fontWeight: "700" }}
                >
                  Lọc theo giá
                </h4>
              <span>Giá tối thiểu</span>
              <Input type='text' id='minPrice' defaultValue={price[0]} onChange={(e) => {
                setCurrentPrice(e, 0)
              }}/>
              <span>Giá tối đa</span>
              <Input type='text' id='maxPrice' defaultValue={price[1]} onChange={(e) => {
                setCurrentPrice(e, 1)
              }} />
              <hr className="my-5" />

              <div className="mt-5">
                <h4 className="mb-3"
                  style={{ color: "#1976d2", fontSize: "22px", fontWeight: "700" }}
                >
                  Danh mục
                </h4>

                <FormGroup>
                  {category.map((cat) => (
                    <FormControlLabel
                      sx={{ color: "#0F0F0F" }}
                      key={cat._id}
                      control={
                        <Checkbox
                          onChange={(e) => setCurrentCategory(e, cat)}
                          checked={catagory.includes(cat.name)}
                        />
                      }
                      label={cat.name}
                    />
                  ))}
                </FormGroup>
              </div>

              <hr className="my-3" />
              
              <div className="mt-5">
              <h4 className="mb-3"
                  style={{ color: "#1976d2", fontSize: "22px", fontWeight: "700" }}
                >
                  Ratings
                </h4>

                <ul className="pl-0">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <li
                      style={{
                        cursor: "pointer",
                        listStyleType: "none",
                      }}
                      key={star}
                      onClick={() => {
                        setRating(star);
                        setSearchParams((prev) => {
                          if(prev.get('ratings[gte]')) {
                            prev.delete('ratings[gte]')
                            setRating(0)
                          }
                          else 
                            prev.set('ratings[gte]', star);
                          return prev;
                        })
                      }}
                    >
                      <div 
                        className="rating-outer"
                        style={{
                          backgroundColor: star == rating ? '#5a5454' : '',
                        }}
                      >
                        <div
                          className="rating-inner"
                          style={{
                            width: `${star * 20}%`,
                          }}
                        ></div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </Grid>
          <Grid item md={9}>
            <ProductList products={products} col={3} />
          </Grid>
        </Grid>
      </Fragment>

      {(resPerPage <= count || currentPage > 1) && (
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
    </Container>
  )
}

export default SearchPage
