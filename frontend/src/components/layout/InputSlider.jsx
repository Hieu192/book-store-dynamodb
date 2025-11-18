import * as React from 'react';
import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import { Typography } from '@mui/material';

function valuetext(value) {
  return `${value}Đ`;
}

const maxPrice = 100000;
export default function RangeSlider({ setPrice, price }) {
  const [value, setValue] = React.useState([0, 10000000]);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  // Sử dụng newValue thay vì value
  };

  const marks = [
    {
      value: 0,
      label: '0Đ',
    },
    {
      value: maxPrice,
      label: `${maxPrice}Đ`,
    },
  ];

  return (
    <Box sx={{ width: 200 }}>
      <Typography id="input-slider" gutterBottom>
        Giá
      </Typography>
      <Slider
        value={value}
        onChange={handleChange}
        valueLabelDisplay="on"
        getAriaValueText={valuetext}
        marks={marks}
      />
    </Box>
  );
}
