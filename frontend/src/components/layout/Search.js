import { TextField  } from "@mui/material";
import React, { useState } from "react";
import {useNavigate} from "react-router-dom"

const Search = () => {
  const [keyword, setKeyword] = useState("");
  const navigate = useNavigate();

  const searchHandler = (e) => {
    e.preventDefault();

    if (keyword.trim()) {
      navigate(`/search/${keyword}`);
    } else {
      navigate("/");
    }
  };
  
  return (
    <form method="post" id="search_form-one" onSubmit={searchHandler}>
      <div class="hero-search-form search-form-style-one">
        <input 
          type="text"
          placeholder="Tìm kiếm sản phẩm ..."
          class="search-field"
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button type="submit" class="search-submit" onClick={searchHandler}>
          Tìm kiếm
        </button>
      </div>
    </form>
  );
};

export default Search;
