import React, { useState } from 'react';
import "react-responsive-carousel/lib/styles/carousel.min.css"; // requires a loader
import { Carousel } from 'react-responsive-carousel';

const VerticalCarousel = ({ images }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleMouseEnter = (index) => {
    setSelectedIndex(index);
  };

  const handleMouseLeave = () => {
    setSelectedIndex(0);
  };

  return (
    <Carousel 
      autoPlay
      infiniteLoop
      showArrows
      thumbWidth={100}
      selectedItem={selectedIndex}
      onMouseEnter={() => handleMouseEnter(selectedIndex)}
      onMouseLeave={handleMouseLeave}
    > 
      {images?.map((image, index) => (
        <div key={index}>
          <img src={image.url} alt={`Image ${index}`} />
          
        </div>
      ))}
    </Carousel>
  );
};

export default VerticalCarousel;
