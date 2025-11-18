import React, { Fragment, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MDBDataTable } from 'mdbreact'
import Title from "./Title"

import MetaData from '../layout/MetaData'
import Loader from '../layout/Loader'
import Sidebar from './Sidebar'

import { useAlert } from 'react-alert'
import { useDispatch, useSelector } from 'react-redux'
import { allOrders, deleteOrder, clearErrors } from '../../actions/orderActions'
import { DELETE_ORDER_RESET } from '../../constants/orderConstants'

const OrdersList = ({ history }) => {

	const alert = useAlert();
	const dispatch = useDispatch();

	const { loading, error, orders } = useSelector(state => state.allOrders);
	const { isDeleted } = useSelector(state => state.order)

	useEffect(() => {
		dispatch(allOrders());

		if (error) {
			alert.error(error);
			dispatch(clearErrors())
		}

		if (isDeleted) {
			alert.success('Order deleted successfully');
			history.push('/admin/orders');
			dispatch({ type: DELETE_ORDER_RESET })
		}

	}, [dispatch, alert, error, isDeleted, history])

	const deleteOrderHandler = (id) => {
		dispatch(deleteOrder(id))
	}

	const setOrders = () => {
		const data = {
			columns: [
				{
					label: 'ID ',
					field: 'id',
					sort: 'asc'
				},
				{
					label: 'Số lượng',
					field: 'numofItems',
					sort: 'asc'
				},
				{
					label: 'Tổng tiền',
					field: 'amount',
					sort: 'asc'
				},
				{
					label: 'Trạng thái',
					field: 'status',
					sort: 'asc'
				},
				{
					label: 'Thao tác',
					field: 'actions',
				},
			],
			rows: []
		}

		orders.forEach(order => {
			data.rows.push({
				id: order._id,
				numofItems: order.orderItems.length,
				amount: `$${order.totalPrice}`,
				status: order.orderStatus && String(order.orderStatus).includes('Delivered')
					? <p style={{ color: 'green' }}>{order.orderStatus}</p>
					: <p style={{ color: 'red' }}>{order.orderStatus}</p>,
				actions: <Fragment>
					<Link to={`/admin/order/${order._id}`} className="btn btn-primary py-1 px-2">
						<i className="fa fa-eye"></i>
					</Link>
					<button className="btn btn-danger py-1 px-2 ml-2" onClick={() => deleteOrderHandler(order._id)}>
						<i className="fa fa-trash"></i>
					</button>
				</Fragment>
			})
		})

		return data;
	}


	return (
		<Fragment>
			<MetaData title={'All Orders'} />
			<div className="row mt-5">
				<div className="col-12 col-md-2 mt-3">
					<Sidebar />
				</div>

				<div className="col-12 col-md-10 mt-5">
					<Fragment>
						
						<Title> Tất cả đơn hàng </Title>
						{loading ? <Loader /> : (
							<MDBDataTable
								data={setOrders()}
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

export default OrdersList
