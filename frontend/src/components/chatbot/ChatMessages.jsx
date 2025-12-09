import React from 'react';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import ChatMessage from './ChatMessage';
import { useDispatch } from 'react-redux';
import { connectChatbot } from '../../actions/chatbotActions';

const ChatMessages = ({
    messages,
    isTyping,
    messagesEndRef,
    error,
    connected,
    authenticated
}) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    const handleRetryConnect = () => {
        dispatch(connectChatbot());
    };

    return (
        <Box
            sx={{
                flex: 1,
                overflowY: 'auto',
                p: 2,
                bgcolor: '#f5f5f5',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
            }}
        >
            {/* Connection Error */}
            {error && (
                <Alert severity="error" sx={{ mb: 1 }}>
                    {error}
                    {!connected && (
                        <Button
                            size="small"
                            onClick={handleRetryConnect}
                            sx={{ mt: 1 }}
                        >
                            {t('chatbot.retry') || 'Retry'}
                        </Button>
                    )}
                </Alert>
            )}

            {/* Welcome Message */}
            {messages.length === 0 && connected && authenticated && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        👋 {t('chatbot.welcome') || 'Xin chào! Tôi có thể giúp gì cho bạn?'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {t('chatbot.hint') || 'Hỏi tôi về sản phẩm, đơn hàng, hoặc chính sách cửa hàng'}
                    </Typography>
                </Box>
            )}

            {/* Connecting State */}
            {!connected && !error && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <CircularProgress size={40} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        {t('chatbot.connecting') || 'Đang kết nối...'}
                    </Typography>
                </Box>
            )}

            {/* Authenticating State */}
            {connected && !authenticated && !error && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <CircularProgress size={40} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        {t('chatbot.authenticating') || 'Đang xác thực...'}
                    </Typography>
                </Box>
            )}

            {/* Messages List */}
            {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
            ))}

            {/* Typing Indicator */}
            {isTyping && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        pl: 2,
                    }}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            gap: 0.5,
                            bgcolor: 'white',
                            px: 2,
                            py: 1,
                            borderRadius: 3,
                            boxShadow: 1,
                        }}
                    >
                        <Box
                            className="typing-dot"
                            sx={{
                                width: 8,
                                height: 8,
                                bgcolor: 'primary.main',
                                borderRadius: '50%',
                                animation: 'typing 1.4s infinite',
                                animationDelay: '0s',
                            }}
                        />
                        <Box
                            className="typing-dot"
                            sx={{
                                width: 8,
                                height: 8,
                                bgcolor: 'primary.main',
                                borderRadius: '50%',
                                animation: 'typing 1.4s infinite',
                                animationDelay: '0.2s',
                            }}
                        />
                        <Box
                            className="typing-dot"
                            sx={{
                                width: 8,
                                height: 8,
                                bgcolor: 'primary.main',
                                borderRadius: '50%',
                                animation: 'typing 1.4s infinite',
                                animationDelay: '0.4s',
                            }}
                        />
                    </Box>
                </Box>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />

            {/* CSS for typing animation */}
            <style>
                {`
          @keyframes typing {
            0%, 60%, 100% {
              transform: translateY(0);
              opacity: 0.7;
            }
            30% {
              transform: translateY(-10px);
              opacity: 1;
            }
          }
        `}
            </style>
        </Box>
    );
};

export default ChatMessages;
