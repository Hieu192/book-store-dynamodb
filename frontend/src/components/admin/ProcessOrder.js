import React, { Fragment, useState, useEffect } from 'react'
import { Link,useParams } from 'react-router-dom'
import Swal from 'sweetalert2'

import MetaData from '../layout/MetaData'
import Loader from '../layout/Loader'
import Sidebar from './Sidebar'

import { useAlert } from 'react-alert'
import { useDispatch, useSelector } from 'react-redux'
import { getOrderDetails, updateOrder, clearErrors } from '../../actions/orderActions'
import { UPDATE_ORDER_RESET } from '../../constants/orderConstants'

const ProcessOrder = () => {

	const params = useParams();

	const [status, setStatus] = useState('');

	const alert = useAlert();
	const dispatch = useDispatch();

	const { loading, order = {} } = useSelector(state => state.orderDetails)
	const { shippingInfo, orderItems, paymentInfo, user, totalPrice, orderStatus } = order
	const { error, isUpdated } = useSelector(state => state.order)

	const orderId = params.id;

	useEffect(() => {

		dispatch(getOrderDetails(orderId))

		if (error) {
			alert.error(error);
			dispatch(clearErrors())
		}


		if (isUpdated) {
			Swal.fire({
				title: "Đã cập nhật!",
				text: "Cập nhật thành công.",
				icon: "success"
			  });
			dispatch({ type: UPDATE_ORDER_RESET })
		}

	}, [dispatch, alert, error, isUpdated, orderId])


	const updateOrderHandler = (id) => {

		const formData = new FormData();
		formData.set('status', status);

		dispatch(updateOrder(id, formData))
	}

	const shippingDetails = shippingInfo && `${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.postalCode}, ${shippingInfo.country}`
	const isPaid = paymentInfo && paymentInfo.status === 'succeeded' ? true : false

	return (
		<Fragment>
			<MetaData title={`Chi tiết đơn # ${order && order._id}`} />
			<div className="row mt-5 bg-white">
				<div className="col-12 col-md-2 mt-3">
					<Sidebar />
				</div>

				<div className="col-12 col-md-10 mt-5">
					<Fragment>
						{loading ? <Loader /> : (
							<div className="row d-flex justify-content-around">
								<div className="col-12 col-lg-7 order-details bg-white" 
									
								>

									<h2 className="my-5">Đơn hàng # {order._id}</h2>

									<h4 className="mb-4">Thông tin vận chuyển</h4>
									<p><b>Tên:</b> {user && user.name}</p>
									<p><b>Số điện thoại:</b> {shippingInfo && shippingInfo.phoneNo}</p>
									<p className="mb-4"><b>Address:</b>{shippingDetails}</p>
									<p><b>Tổng giá tiền:</b> ${totalPrice}</p>

									<hr />

									<h4 className="my-4">Thanh toán</h4>
									<p className={isPaid ? "greenColor" : "redColor"}><b>{isPaid ? "ĐÃ THANH TOÁN" : "CHƯA THANH TOÁN"}</b></p>

									<h4 className="my-4">Stripe ID</h4>
									<p><b>{paymentInfo && paymentInfo.id}</b></p>

									<h4 className="my-4">Trạng thái đơn hàng:</h4>
									<p className={order.orderStatus && String(order.orderStatus).includes('Delivered') ? "greenColor" : "redColor"} ><b>{orderStatus}</b></p>



									<h4 className="my-4">Chi tiết đơn hàng:</h4>

									<hr />
									<div className="cart-item my-1">
										{orderItems && orderItems.map(item => (
											<div key={item.product} className="row my-5">
												<div className="col-4 col-lg-2">
													<img src={item.image} alt={item.name} height="45" width="65" />
												</div>

												<div className="col-5 col-lg-5">
													<Link to={`/products/${item.product}`}>{item.name}</Link>
												</div>


												<div className="col-4 col-lg-2 mt-4 mt-lg-0">
													<p>{item.price} đ</p>
												</div>

												<div className="col-4 col-lg-3 mt-4 mt-lg-0">
													<p>{item.quantity} Piece(s)</p>
												</div>
											</div>
										))}
									</div>
									<hr />
								</div>

								<div className="col-12 col-lg-4 bg-white" 
									
								>
									<h4 className="my-4"><b> Trạng thái đơn hàng </b></h4>

									<div className="form-group">
										<select
											className="form-control"
											name='status'
											value={status}
											onChange={(e) => setStatus(e.target.value)}
										>
											<option value="Processing">Đang vận chuyển</option>
											<option value="Shipped">Đã giao</option>
											<option value="Delivered">Đã nhận</option>
										</select>
									</div>

									<button className="btn btn-primary btn-block" onClick={() => updateOrderHandler(order._id)}>
										Cập nhật trạng thái
									</button>
								</div>

							</div>
						)}
					</Fragment>
				</div>
			</div>

		</Fragment>
	)
}

export default ProcessOrder
