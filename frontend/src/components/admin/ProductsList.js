import React, { Fragment, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MDBDataTable } from 'mdbreact'
import Swal from "sweetalert2"

import MetaData from '../layout/MetaData'
import Loader from '../layout/Loader'
import Sidebar from './Sidebar'

import { useAlert } from 'react-alert'
import { useDispatch, useSelector } from 'react-redux'
import { getAdminProducts, deleteProduct, clearErrors } from '../../actions/productActions'
import { DELETE_PRODUCT_RESET } from '../../constants/productConstants'
import Title from './Title'


const ProductsList = () => {
	const navigate = useNavigate();
	const alert = useAlert();
	const dispatch = useDispatch();

	const { loading, error, products } = useSelector(state => state.products);
	const { error: deleteError, isDeleted } = useSelector(state => state.product)

	useEffect(() => {
		dispatch(getAdminProducts());

		if (error) {
			alert.error(error);
			dispatch(clearErrors())
		}

		if (deleteError) {
			alert.error(deleteError);
			dispatch(clearErrors())
		}

		if (isDeleted) {
			navigate('/admin/products');
			dispatch({ type: DELETE_PRODUCT_RESET })
		}

	}, [dispatch, alert, error, deleteError, isDeleted, navigate])

	const setProducts = () => {
		const data = {
			columns: [
				{
					label: 'ID',
					field: 'id',
					sort: 'asc'
				},
				{
					label: 'Tên sản phẩm',
					field: 'name',
					sort: 'asc'
				},
				{
					label: 'Giá',
					field: 'price',
					sort: 'asc'
				},
				{
					label: 'Trong kho',
					field: 'stock',
					sort: 'asc'
				},
				{
					label: 'Danh mục',
					field: 'category',
					sort: 'asc'
				},
				{
					label: 'Thao tác',
					field: 'actions',
				},
			],
			rows: []
		}

		products.forEach(product => {
			data.rows.push({
				id: product._id,
				name: product.name,
				price: `$${product.price}`,
				stock: product.stock,
				category: product.category,
				actions: <Fragment>
					<Link to={`/admin/product/${product._id}`} className="btn btn-primary py-1 px-2">
						<i className="fa fa-pencil"></i>
					</Link>
					<button className="btn btn-danger py-1 px-2 ml-2" onClick={() => deleteProductHandler(product._id)}>
						<i className="fa fa-trash"></i>
					</button>
				</Fragment>
			})
		})

		return data;
	}

	const deleteProductHandler = (id) => {
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
			dispatch(deleteProduct(id));
		  }
		});
	  };

	return (
		<Fragment>
			<MetaData title={'All Products'} />
			<div className="row mt-5">
				<div className="col-12 col-md-2 mt-3">
					<Sidebar />
				</div>

				<div className="col-12 col-md-10 mt-5">
					<Fragment>
						<Title> Danh sách sản phẩm</Title>

						{loading ? <Loader /> : (
							<MDBDataTable
								data={setProducts()}
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
	)
}

export default ProductsList
