import React, { useState } from "react";
import { TextField, InputAdornment, IconButton } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import {useNavigate} from "react-router-dom"

function Search({ search }) {
    const [keyword, setKeyword] = useState("");
    const navigate = useNavigate();
  
    const searchHandler = (e) => {
      e.preventDefault();
  
      if (keyword.trim()) {
        navigate(`/search?keyword=${keyword}`);
      } else {
        navigate("/");
      }
    };

  return (
    <form onSubmit={searchHandler}>
      <TextField
        type="search"
        placeholder="Tìm kiếm..."
        variant="outlined"
        onChange={(e) => setKeyword(e.target.value)}
        InputProps={{
          sx: {
            backgroundColor: "#fff", // Màu xanh nước biển
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "#00796b", // Màu viền
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#004d40", // Màu viền khi hover
            },
            width:"500px",
            height:"45px"
          },
          startAdornment: (
            <InputAdornment position="end">
              <IconButton type="submit">
                <SearchIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    </form>
  );
}

export default Search;
