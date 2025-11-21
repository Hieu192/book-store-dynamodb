import { Grid, ratingClasses } from '@mui/material'
import React, { Fragment } from 'react'
import Product from './Product'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FormControl, InputLabel, Box, Select, MenuItem } from '@mui/material'
const ProductList = ({ products, col }) => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortByPrice, setSortByPrice] = useState(searchParams.get('sortByPrice') || "");
  const productData = products;
  return (
    <Fragment >
      {productData ?
        <>
          <Box>
            <FormControl sx={{minWidth: 180, marginBottom: "1.5em", marginTop: "1.5em"}}>
              <InputLabel id="sort-by-price">{t('filter.price')}</InputLabel>
              <Select
                labelId="sort-by-price"
                id="demo-simple-select"
                value={sortByPrice}
                label="sortByPrice"
                onChange={(e) => {
                  setSortByPrice(e.target.value);
                  setSearchParams((prev) => {
                    prev.set('sortByPrice', e.target.value)
                    return prev;
                  })
                }}
              >
                <MenuItem value='asc'>{t('filter.priceAsc')}</MenuItem>
                <MenuItem value='desc'>{t('filter.priceDesc')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Grid container rowSpacing={{ xs: 3, sm: 3, md: 3 }} columnSpacing={{ xs: 1, sm: 1.5, md: 2 }}>
            {productData.map((product) => (
              <Grid key={product._id} m={0} p={0} item xs={6} sm={4} md={col} >
                <Product product={product} />
              </Grid>
            ))}
          </Grid>
        </> : <></>}
    </Fragment>
  )
}

export default ProductList
