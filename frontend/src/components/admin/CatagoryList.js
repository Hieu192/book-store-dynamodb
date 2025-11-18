import React, { Fragment, useEffect } from "react";
import { MDBDataTable } from "mdbreact";
import Swal from "sweetalert2";

import MetaData from "../layout/MetaData";
import Loader from "../layout/Loader";
import Sidebar from "./Sidebar";

import { useAlert } from "react-alert";
import { useDispatch, useSelector } from "react-redux";
import {
	getCategory,
	dltCategory,
	clearErrors,
} from "../../actions/categoryActions";
import { DELETE_CATEGORY_RESET } from "../../constants/categoryConstants";
import { useNavigate } from "react-router-dom";

const CategorysList = () => {
	const alert = useAlert();
	const dispatch = useDispatch();
	const history = useNavigate();

	const { loading, error, category } = useSelector((state) => state.category);
	const { error: deleteError, isDeleted } = useSelector(
		(state) => state.dltCategory
	);

	useEffect(() => {
		dispatch(getCategory());

		if (error) {
			alert.error(error);
			dispatch(clearErrors());
		}

		if (deleteError) {
			alert.error(deleteError);
			dispatch(clearErrors());
		}

		if (isDeleted) {
			
			history("/admin/Category");
			dispatch({ type: DELETE_CATEGORY_RESET });
		}
	}, [dispatch, alert, error, deleteError, isDeleted, history]);

	const setCategorys = () => {
		const data = {
			columns: [
				{
					label: "ID",
					field: "id",
					sort: "asc",
				},
				{
					label: "Name",
					field: "name",
					sort: "asc",
				},
				{
					label: "Action",
					field: "actions",
				},
			],
			rows: [],
		};

		category.forEach((category) => {
			data.rows.push({
				id: category._id,
				name: category.name,
				actions: (
					<Fragment>
						<button
							className="btn btn-danger py-1 px-2 ml-2"
							onClick={() => deleteCategoryHandler(category._id)}
						>
							<i className="fa fa-trash"></i>
						</button>
					</Fragment>
				),
			});
		});

		return data;
	};

	const deleteCategoryHandler = (id) => {
		Swal.fire({
			title: "Bạn có muốn xóa",
			text: "Bạn không thể hoàn tác lại!",
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#3085d6",
			cancelButtonColor: "#d33",
			confirmButtonText: "Tiếp tục xóa!"
		  }).then((result) => {
			if (result.isConfirmed) {
			  Swal.fire({
				title: "Đã xóa!",
				text: "Lựa chọn đã được xóa.",
				icon: "success"
			  });
			  dispatch(dltCategory(id));
			}
		  });
		
	};

	return (
		<Fragment>
			<MetaData title={"All Category"} />
			<div className="row mt-5">
				<div className="col-12 col-md-2 mt-3">
					<Sidebar />
				</div>

				<div className="col-12 col-md-10 mt-5">
					<Fragment>
						<h1 className="my-5">All Categorys</h1>

						{loading ? (
							<Loader />
						) : (
							<MDBDataTable
								data={setCategorys()}
								className="px-3"
								bordered
								striped
								hover
							/>
						)}
					</Fragment>
				</div>
			</div>
		</Fragment>
	);
};

export default CategorysList;
