import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton, Menu, MenuItem, Box, Typography } from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentLang, setCurrentLang] = useState(i18n.language || 'vi');
  const open = Boolean(anchorEl);

  useEffect(() => {
    // Update current language when i18n language changes
    setCurrentLang(i18n.language);
  }, [i18n.language]);

  const handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const changeLanguage = async (lng) => {
    try {
      await i18n.changeLanguage(lng);
      setCurrentLang(lng);
      localStorage.setItem('i18nextLng', lng);
      console.log('Language changed to:', lng);
      handleClose();
      // Force page refresh to update all components
      window.location.reload();
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const getCurrentLanguage = () => {
    return currentLang === 'vi' ? 'VI' : 'EN';
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <IconButton
        onClick={handleClick}
        size="small"
        sx={{ 
          color: 'white',
          display: 'flex',
          gap: 0.5,
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          }
        }}
        aria-controls={open ? 'language-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
      >
        <LanguageIcon />
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {getCurrentLanguage()}
        </Typography>
      </IconButton>
      <Menu
        id="language-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'language-button',
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem 
          onClick={() => changeLanguage('vi')}
          selected={currentLang === 'vi'}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>🇻🇳</span>
            <Typography>Tiếng Việt</Typography>
          </Box>
        </MenuItem>
        <MenuItem 
          onClick={() => changeLanguage('en')}
          selected={currentLang === 'en'}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>🇬🇧</span>
            <Typography>English</Typography>
          </Box>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default LanguageSwitcher;
