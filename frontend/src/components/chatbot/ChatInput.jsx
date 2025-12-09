import React, { useState } from 'react';
import { Box, TextField, IconButton, Tooltip } from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const ChatInput = ({ onSend, disabled, isTyping }) => {
    const { t } = useTranslation();
    const [message, setMessage] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();

        if (message.trim() && !disabled && !isTyping) {
            onSend(message.trim());
            setMessage('');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
                p: 2,
                borderTop: '1px solid #e0e0e0',
                bgcolor: 'white',
                display: 'flex',
                gap: 1,
                alignItems: 'flex-end',
            }}
        >
            <TextField
                fullWidth
                multiline
                maxRows={4}
                size="small"
                placeholder={
                    disabled
                        ? t('chatbot.connectingPlaceholder') || 'Đang kết nối...'
                        : t('chatbot.placeholder') || 'Nhập tin nhắn...'
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={disabled || isTyping}
                variant="outlined"
                sx={{
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        bgcolor: '#f5f5f5',
                    },
                }}
            />

            <Tooltip title={t('chatbot.send') || 'Gửi'}>
                <span>
                    <IconButton
                        type="submit"
                        color="primary"
                        disabled={disabled || isTyping || !message.trim()}
                        sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            '&:hover': {
                                bgcolor: 'primary.dark',
                            },
                            '&.Mui-disabled': {
                                bgcolor: 'action.disabledBackground',
                                color: 'action.disabled',
                            },
                        }}
                    >
                        <SendIcon />
                    </IconButton>
                </span>
            </Tooltip>
        </Box>
    );
};

export default ChatInput;
