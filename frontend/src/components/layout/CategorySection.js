import React from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import "../../App1.css";
import { Box, Card, CardContent, CardMedia, Container, Grid, Typography } from "@mui/material";


const CategorySection = ({setCatagory}) => {
  const { category } = useSelector((state) => state.category);
  return (
    <div class="category-area-start category-style-one mt-10 position-relative">
      <div style={{ width: "80%", marginLeft: "auto", marginRight: "auto" }}>
        <div class="row">
          <div class="col-lg-12">
            <div class="section-head-style-one">
              <h2>Bạn đang tìm kiếm gì ?</h2>
              <p>Chúng tôi có sẳn tất cả các danh mục</p>
            </div>
          </div>
        </div>
        <Container>
          <Grid container spacing={2}>
               {category.map((category, idx) => {
            return (
              <Grid key={category._id} item md={2} margin="0 auto">
                <Card 
                  className="category_card"
                  sx={{
                       width: "180px", 
                       height: "180px", 
                       margin: "0 auto",
                       transition: "transform 0.3s, box-shadow .3s", "&:hover": { transform: "scale(1.05)", boxShadow:" 0 0 20px rgba(33,33,33,.2)" } }}
                  onClick={() => { setCatagory(category.name) }}
                >
                  <Link to={`/search?category[]=${category.name}`}>
                    <Box
                      sx={{ height: 100,width:100 , margin:"20px auto 0", p:"10px", overflow:"hidden" }}
                    >
                      <img src={category.images && category.images[0] ? category.images[0].url : '/images/default-category.png'} alt={category.name}></img>
                    </Box>
                  </Link>
                  
                <CardContent sx={{textAlign:"center"}}>
                  <Typography
                    className="category-name_text"
                    fontWeight={700} 
                    fontSize={15}
                    variant="body2" onClick={
                  ()=>{ setCatagory(category.name)}}>
                    <Link to={`/search?category[]=${category.name}`}>{category.name}</Link> 
                  </Typography>
                </CardContent>
  
                </Card>
              </Grid>
            );
          })}
          </Grid>
         

        </Container>
      </div>
    </div>
  );
};

export default CategorySection;
