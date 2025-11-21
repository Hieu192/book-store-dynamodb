import { Autocomplete, TextField, Box, Typography } from "@mui/material";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Search = () => {
  const [keyword, setKeyword] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const isComposingRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (keyword.trim().length > 1) {
      const delayDebounceFn = setTimeout(() => {
        fetchSuggestions(keyword);
      }, 300);

      return () => clearTimeout(delayDebounceFn);
    } else {
      setOptions([]);
    }
  }, [keyword]);

  const fetchSuggestions = async (searchTerm) => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `http://localhost:4000/api/v1/products?keyword=${searchTerm}`,
        { withCredentials: true }
      );
      setOptions(data.products || []);
      setOpen(true);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const searchHandler = (e) => {
    e.preventDefault();

    if (keyword.trim()) {
      navigate(`/search?keyword=${keyword}`);
    } else {
      navigate("/");
    }
  };

  const handleSelect = (event, value) => {
    if (value && value._id && !isComposingRef.current) {
      // Xóa text search
      setKeyword("");
      // Đóng dropdown
      setOpen(false);
      // Xóa options
      setOptions([]);
      // Navigate đến trang chi tiết
      navigate(`/product/${value._id}`);
    }
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;
  };

  return (
    <form method="post" id="search_form-one" onSubmit={searchHandler}>
      <div className="hero-search-form search-form-style-one">
        <Autocomplete
          freeSolo
          value={keyword}
          inputValue={keyword}
          open={open}
          onOpen={() => {
            if (options.length > 0) setOpen(true);
          }}
          onClose={() => setOpen(false)}
          options={options}
          loading={loading}
          getOptionLabel={(option) => (typeof option === 'string' ? option : option.name || '')}
          onInputChange={(event, newValue) => {
            setKeyword(newValue);
          }}
          onChange={handleSelect}
          renderOption={(props, option) => (
            <Box 
              component="li" 
              {...props}
              onMouseDown={(e) => {
                // Ngăn blur khi đang composing
                if (isComposingRef.current) {
                  e.preventDefault();
                }
              }}
              sx={{ display: 'flex', alignItems: 'center', gap: 2, padding: '8px 16px' }}
            >
              <img
                src={option.images && option.images[0] ? option.images[0].url : '/images/default-product.png'}
                alt={option.name}
                style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }}
              />
              <Box>
                <Typography variant="body2" fontWeight={500}>
                  {option.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.price?.toLocaleString()} đ
                </Typography>
              </Box>
            </Box>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Tìm kiếm sản phẩm ..."
              className="search-field"
              variant="standard"
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              InputProps={{
                ...params.InputProps,
                disableUnderline: true,
              }}
              sx={{
                '& .MuiInputBase-root': {
                  padding: '0 !important',
                  height: '100%',
                },
                '& input': {
                  padding: '0 20px !important',
                  height: '100%',
                }
              }}
            />
          )}
          sx={{
            flex: 1,
            '& .MuiAutocomplete-inputRoot': {
              padding: '0 !important',
            }
          }}
        />
        <button type="submit" className="search-submit" onClick={searchHandler}>
          Tìm kiếm
        </button>
      </div>
    </form>
  );
};

export default Search;
