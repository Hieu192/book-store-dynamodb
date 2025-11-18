import React, { Fragment, useState, useEffect } from "react";

import MetaData from "../layout/MetaData";
import Sidebar from "./Sidebar";
import Swal from "sweetalert2";

import { useAlert } from "react-alert";
import { useDispatch, useSelector } from "react-redux";
import { NEW_CATRGORY_RESET } from "../../constants/categoryConstants";
import { newCategory, clearErrors } from "../../actions/categoryActions";
import Loader from "../layout/Loader";
import {useNavigate} from "react-router-dom"

const NewCategory = () => {
    const navigate=useNavigate()
	const [name, setName] = useState("");
	const [images, setImages] = useState([]);
	const [imagesPreview, setImagesPreview] = useState([]);

	const alert = useAlert();
	const dispatch = useDispatch();

	const { error, loading, success } = useSelector((state) => state.newCategory);

	useEffect(() => {
		if (error) {
			alert.error(error);
			dispatch(clearErrors());
		}

		if (success) {
			navigate("/admin/category");
			Swal.fire({
				title: "Đã thêm!",
				text: "Thêm danh mục thành công.",
				icon: "success"
			  });
			dispatch({ type: NEW_CATRGORY_RESET });
		}
	}, [dispatch, alert, error, success]);

	const submitHandler = (e) => {
		e.preventDefault();
		const formData = new FormData();
		formData.set("name", name);
		images.forEach((image) => {
			formData.append("images", image);
		});

		dispatch(newCategory(formData));
	};
	const onChange = (e) => {
		const files = Array.from(e.target.files);

		setImagesPreview([]);
		setImages([]);

		files.forEach((file) => {
			const reader = new FileReader();

			reader.onload = () => {
				if (reader.readyState === 2) {
					setImagesPreview((oldArray) => [...oldArray, reader.result]);
					setImages((oldArray) => [...oldArray, reader.result]);
				}
			};

			reader.readAsDataURL(file);
		});
	};

	return (
		<Fragment>
			<MetaData title={"New CATRGORY"} />
			{loading ? (
				<>
					<Loader />
				</>
			) : (
				<>
					<div className="row mt-5">
						<div className="col-12 col-md-2 mt-3">
							<Sidebar />
						</div>

						<div className="col-12 col-md-10 mt-5">
							<Fragment>
								<div className="wrapper my-5">
									<form
										className="shadow-lg"
										onSubmit={submitHandler}
										encType="multipart/form-data"
									>
										<h1 className="mb-4">Danh mục mới </h1>

										<div className="form-group">
											<label htmlFor="name_field">Tên</label>
											<input
												type="text"
												id="name_field"
												className="form-control"
												value={name}
												onChange={(e) => setName(e.target.value)}
											/>
										</div>
										<div className="form-group">
											<label>Ảnh</label>

											<div className="custom-file">
												<input
													type="file"
													name="product_images"
													className="custom-file-input"
													id="customFile"
													onChange={onChange}
													multiple
												/>
												<label
													className="custom-file-label"
													htmlFor="customFile"
												>
													Chọn ảnh
												</label>
											</div>

											{imagesPreview.map((img) => (
												<img
													src={img}
													key={img}
													alt="Images Preview"
													className="mt-3 mr-2"
													width="55"
													height="52"
												/>
											))}
										</div>

										<button
											id="login_button"
											type="submit"
											className="btn btn-block py-3"
											disabled={loading ? true : false}
										>
											Tạo
										</button>
									</form>
								</div>
							</Fragment>
						</div>
					</div>
				</>
			)}
		</Fragment>
	);
};

export default NewCategory;