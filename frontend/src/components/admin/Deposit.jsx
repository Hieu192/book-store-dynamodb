import * as React from 'react';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import Title from './Title';
import { useNavigate } from 'react-router-dom';



const d = new Date;

export default function Deposits({totalAmout}) {

    const navigate = useNavigate();
    function preventDefault(event) {
        event.preventDefault();
        navigate("/admin/orders")
      }
  return (
    <React.Fragment>
      <Title>Doanh thu hiện tại</Title>
      <Typography component="p" variant="h4">
        {totalAmout}đ
      </Typography>
      <Typography color="text.secondary" sx={{ flex: 1 }}>
        Ngày {d.getDate()} - Tháng {d.getMonth()} - Năm {d.getFullYear()}
      </Typography>
      <div>
        <Link color="primary" onClick={preventDefault}>
          Xem chi tiết
        </Link>
      </div>
    </React.Fragment>
  );
}