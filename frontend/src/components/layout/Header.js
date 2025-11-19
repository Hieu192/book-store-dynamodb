
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import Container from '@mui/material/Container';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import { Badge, MailIcon, Stack } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Search from './Search';
import InputSearch from './InputSearch'
import Swal from 'sweetalert2'

import React, { Fragment, useEffect } from "react";
import { Route, Link } from "react-router-dom";

import { useDispatch, useSelector } from "react-redux";
import { useAlert } from "react-alert";
import { logout } from "../../actions/userActions";
import { googleLogout } from '@react-oauth/google';
import "../../App.css";
import { getCategory } from "../../actions/categoryActions";
import Login from '@mui/icons-material/Login';
import NotificationBell from './NotificationBell';
import LanguageSwitcher from './LanguageSwitcher';

const pages = [
	{
		name:"Trang chủ",
		des:'/',
	},
	{
		name:"Sản phẩm",
		des:"/search"
	}
];
const settings = ['Thông tin cá nhân', 'Tài khoản', 'ADMIN', 'Đăng xuất'];

function Header() {
  const [anchorElCat, setAnchorElCat] = React.useState(null);
  const [anchorElNav, setAnchorElNav] = React.useState(null);
  const [anchorElUser, setAnchorElUser] = React.useState(null);

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };
  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleCloseCat = () => {
	setAnchorElCat(null);
  }

  const dispatch = useDispatch();
  useEffect(() => {
	  dispatch(getCategory());
  }, [dispatch]);

  const { isAuthenticated, user } = useSelector((state) => state.auth);
  console.log(user?.avatar?.url)
  const { category } = useSelector((state) => state.category);
  const { cartItems } = useSelector((state) => state.cart);
  const logoutHandler = () => {
	  dispatch(logout());
	  googleLogout();
	  Swal.fire({
		title: "Thành công",
		text: "Đăng xuất thành công",
		icon: "success"
	  });
  };


  return (
    <AppBar position='fixed'>
		<Container maxWidth="xl">
			<Toolbar disableGutters>
				<Typography
					variant='h6'
					noWrap
					sx={{
						mr:2,
						display: {xs:"none", md:"flex"},
						fontFamily:"monospace",
						fontWeight:700,
						letterSpacing: '.3rem',
						color:'inherit',
						textDecoration:'none'
					}}	
				>
					<img src="images/logo.png"width="50px"className="rounded-[50%] ml-[32px]"></img>
				</Typography>

				<Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
					<IconButton
						size="large"
						aria-label="account of current user"
						aria-controls="menu-appbar"
						aria-haspopup="true"
						onClick={handleOpenNavMenu}
						color="inherit"
					>
					<MenuIcon />
					</IconButton>
					<Menu
						id="menu-appbar"
						anchorEl={anchorElNav}
						anchorOrigin={{
							vertical: 'bottom',
							horizontal: 'left',
						}}
						keepMounted
						transformOrigin={{
							vertical: 'top',
							horizontal: 'left',
						}}
						open={Boolean(anchorElNav)}
						onClose={handleCloseNavMenu}
						sx={{
							display: { xs: 'block', md: 'none' },
						}}
					>
						{pages.map((page) => (
							<MenuItem key={page.des} onClick={handleCloseNavMenu}>
								<Link to={page.des}>
										<Typography textAlign="center">{page.name}</Typography>
									
								</Link>
							</MenuItem>
						))}
					</Menu>
				</Box>
				<CollectionsBookmarkIcon sx={{ display: { xs: 'flex', md: 'none' }, mr: 1 }} />
				<Typography
					variant="h5"
					noWrap
					component="a"
					href="#app-bar-with-responsive-menu"
					sx={{
					mr: 2,
					display: { xs: 'flex', md: 'none' },
					flexGrow: 1,
					fontFamily: 'monospace',
					fontWeight: 700,
					letterSpacing: '.3rem',
					color: 'inherit',
					textDecoration: 'none',
					}}
				>
					LOGO
				</Typography>
				
				<Box sx={{ flexGrow: 5, display: { xs: 'none', md: 'flex' } }}>
					{pages.map((page) => (
						<Button 
							key={page.des}
							onClick={handleCloseNavMenu}
							sx={{ my:2, color:'white', display:'block' }}
						>
								<Link to={page.des}>
										<Typography textAlign="center">{page.name}</Typography>
									
								</Link>	
						</Button>
					))}
				</Box>

				<Box sx={{ flexGrow: 6, display: { xs: 'none', md: 'flex' } }}>
    <InputSearch/>
</Box>

				<Box sx={{ flexGrow: 0, mr: 2 }}>
					<LanguageSwitcher />
				</Box>

				{ (user && isAuthenticated) ? (
					<>
					<Box sx ={{flexGrow: 0, mr:2, position:'relative'}}>

					<Box title='Giỏ hàng' sx={{display:'flex', flexDirection:'row'}}> 
						<Link style={{display:"flex"}} to="/cart">
							<Typography mr={5}>Giỏ hàng</Typography>
							<Badge badgeContent={cartItems.length} color="secondary">
								<ShoppingCartOutlinedIcon/>
							</Badge>
						</Link>	
					</Box>
					</Box>
					
					{/* Notification Bell */}
					<Box sx ={{flexGrow: 0, mr:2}}>
						<NotificationBell />
					</Box>

					<Box sx ={{flexGrow: 0}}>
						<Tooltip title="Mở cài đặt">
							<IconButton onClick={handleOpenUserMenu} sx={{p:0}}>
								<Avatar src={user.avatar.url} alt='User Avatar'></Avatar>
							</IconButton>
						</Tooltip>
						<Menu
							sx={{mt:'45px'}}
							id='menu-appbar'
							anchorEl={anchorElUser}
							anchorOrigin={{
								vertical:'top',
								horizontal:'right'
							}}
							keepMounted
							transformOrigin={{
								vertical:'top',
								horizontal:'right'
							}}
							open = {Boolean(anchorElUser)}
							onClose={handleCloseUserMenu}
						>	
							{user && user.role !== 'admin' ? (
								<MenuItem onClick={handleCloseUserMenu}>
									<Link to="/orders/me">
										<Typography textAlign="center">Đơn hàng</Typography>
									</Link>
								</MenuItem>
								
								
							) : (
								<MenuItem onClick={handleCloseUserMenu}>
									<Link to="/dashboard">
										<Typography textAlign="center">Trang ADMIN</Typography>
									</Link>
								</MenuItem>
							)}
							
							
							<MenuItem onClick={handleCloseUserMenu}>
								<Link to="/me" >
									<Typography textAlign="center">Tài khoản</Typography>
								</Link>
							</MenuItem>

							<MenuItem onClick={handleCloseUserMenu}>
								<Link to="/" onClick={logoutHandler}>
									<Typography textAlign="center">Đăng xuất</Typography>
								</Link>
							</MenuItem>
						</Menu>
						
						
					</Box>
					</>
				) : (
					<>
						<Box sx ={{flexGrow: 0, display:"flex", flexDirection:"row"}} >
							<Link to="/login">
								<Stack display="flex" direction="row" title="Đăng nhập">
									<Typography mr="10px">
										Đăng ký |
									</Typography>

								</Stack>
							</Link>
							<Link to="/login">
								<Stack display="flex" direction="row" title="Đăng nhập">
									<Typography mr="10px">
										Đăng nhập
									</Typography>
									<AccountCircleIcon/>	
								</Stack>
							</Link>
						</Box>	

					</>
				)}
			</Toolbar>
		</Container>
	</AppBar>
  );
}
export default Header;
