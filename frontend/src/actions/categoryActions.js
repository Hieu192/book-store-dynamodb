import axios from "axios";

import {
  NEW_CATRGORY_REQUEST,
  NEW_CATRGORY_SUCCESS,
  NEW_CATRGORY_FAIL,
  ALL_CATEGORY_REQUEST,
  ALL_CATEGORY_SUCCESS,
  ALL_CATEGORY_FAIL,
  DELETE_CATEGORY_REQUEST,
  DELETE_CATEGORY_SUCCESS,
  DELETE_CATEGORY_FAIL,
  CLEAR_ERRORS,
} from "../constants/categoryConstants";

export const newCategory = (formData) => async (dispatch) => {
  try {
    dispatch({ type: NEW_CATRGORY_REQUEST });

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    const { data } = await axios.post(
      `http://localhost:4000/api/v1/admin/genres/addgenre`,
      formData,
      {
				withCredentials: true // Cấu hình Axios để bao gồm cookie trong yêu cầu
			  },
      config
    );
    dispatch({
      type: NEW_CATRGORY_SUCCESS,
      payload: data,
    });
  } catch (error) {
    dispatch({
      type: NEW_CATRGORY_FAIL,
      payload: error,
    });
  }
};

export const getCategory = () => async (dispatch) => {
  try {
    dispatch({ type: ALL_CATEGORY_REQUEST });

    const { data } = await axios.get("http://localhost:4000/api/v1/genres",	{
      withCredentials: true // Cấu hình Axios để bao gồm cookie trong yêu cầu
      },);

    dispatch({
      type: ALL_CATEGORY_SUCCESS,
      payload: data,
    });
  } catch (error) {
    dispatch({
      type: ALL_CATEGORY_FAIL,
      payload: error,
    });
  }
};

// Delete CATEGORY (Admin)
export const dltCategory = (id) => async (dispatch) => {
  try {
    dispatch({ type: DELETE_CATEGORY_REQUEST });

    const { data } = await axios.delete(`http://localhost:4000/api/v1/movies/${id}`,	{
      withCredentials: true // Cấu hình Axios để bao gồm cookie trong yêu cầu
      },);

    dispatch({
      type: DELETE_CATEGORY_SUCCESS,
      payload: data.success,
    });
  } catch (error) {
    dispatch({
      type: DELETE_CATEGORY_FAIL,
      payload: error,
    });
  }
};

// Clear Errors
export const clearErrors = () => async (dispatch) => {
  dispatch({
    type: CLEAR_ERRORS,
  });
};
