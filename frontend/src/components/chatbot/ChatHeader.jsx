import React from 'react';
import { Box, Typography, IconButton, Tooltip, Chip } from '@mui/material';
import {
    Close as CloseIcon,
    DeleteOutline as DeleteIcon,
    Circle as CircleIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const ChatHeader = ({ connected, authenticated, onClose, onClear }) => {
    const { t } = useTranslation();

    const getStatusColor = () => {
        if (!connected) return 'error';
        if (!authenticated) return 'warning';
        return 'success';
    };

    const getStatusText = () => {
        if (!connected) return t('chatbot.disconnected') || 'Disconnected';
        if (!authenticated) return t('chatbot.authenticating') || 'Authenticating...';
        return t('chatbot.online') || 'Online';
    };

    return (
        <Box
            sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                p: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                    component="img"
                    src="/images/logo.png"
                    alt="Logo"
                    sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        border: '2px solid white',
                    }}
                />
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                        {t('chatbot.title') || 'Chatbot Hỗ Trợ'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <CircleIcon
                            sx={{
                                fontSize: 10,
                                color: getStatusColor() === 'success' ? '#4caf50' :
                                    getStatusColor() === 'warning' ? '#ff9800' : '#f44336'
                            }}
                        />
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                            {getStatusText()}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title={t('chatbot.clearHistory') || 'Clear History'}>
                    <IconButton
                        onClick={onClear}
                        size="small"
                        sx={{ color: 'white' }}
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title={t('chatbot.close') || 'Close'}>
                    <IconButton
                        onClick={onClose}
                        size="small"
                        sx={{ color: 'white' }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );
};

export default ChatHeader;
