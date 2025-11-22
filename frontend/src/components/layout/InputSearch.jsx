import React, { useState, useEffect, useRef } from "react";
import API_CONFIG from '../../config/config';
import { Autocomplete, TextField, InputAdornment, IconButton, Box, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Search({ search }) {
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
        `${API_CONFIG.API_URL}/products?keyword=${searchTerm}`,
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
    <form onSubmit={searchHandler}>
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
            sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
          >
            <img
              src={option.images && option.images[0] ? option.images[0].url : '/images/default-product.png'}
              alt={option.name}
              style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
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
            placeholder="Tìm kiếm..."
            variant="outlined"
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            InputProps={{
              ...params.InputProps,
              sx: {
                backgroundColor: "#fff",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#00796b",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#004d40",
                },
                width: "500px",
                height: "45px"
              },
              startAdornment: (
                <>
                  <InputAdornment position="start">
                    <IconButton type="submit">
                      <SearchIcon />
                    </IconButton>
                  </InputAdornment>
                  {params.InputProps.startAdornment}
                </>
              ),
            }}
          />
        )}
      />
    </form>
  );
}

export default Search;
