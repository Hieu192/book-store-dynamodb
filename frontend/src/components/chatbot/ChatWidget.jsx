import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    Box,
    Paper,
    IconButton,
    Fab,
    Badge,
    Tooltip,
    Fade,
    Zoom
} from '@mui/material';
import {
    Chat as ChatIcon,
    Close as CloseIcon,
    DeleteOutline as DeleteIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

import {
    connectChatbot,
    disconnectChatbot,
    toggleChatbot,
    sendMessage,
    clearMessages,
    loadConversationHistory,
    startNewConversation
} from '../../actions/chatbotActions';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import ChatHeader from './ChatHeader';

const ChatWidget = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const messagesEndRef = useRef(null);

    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const { isOpen, connected, authenticated, messages, isTyping, error, conversationId, loadingHistory } = useSelector(
        (state) => state.chatbot
    );

    // Auto-connect when user is authenticated and widget opens
    useEffect(() => {
        if (isAuthenticated && isOpen && !connected) {
            dispatch(connectChatbot());
        }
    }, [isAuthenticated, isOpen, connected, dispatch]);

    // Load conversation history when authenticated
    useEffect(() => {
        if (authenticated && connected && !loadingHistory) {
            // Check if there's a saved conversationId in localStorage
            const savedConversationId = localStorage.getItem('chatbot_conversationId');

            if (savedConversationId && messages.length === 0) {
                console.log('📜 Loading conversation history:', savedConversationId);
                dispatch(loadConversationHistory(savedConversationId));
            }
        }
    }, [authenticated, connected, dispatch, loadingHistory]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (connected) {
                dispatch(disconnectChatbot());
            }
        };
    }, [connected, dispatch]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleToggle = () => {
        dispatch(toggleChatbot());
    };

    const handleSendMessage = (message) => {
        dispatch(sendMessage(message));
    };

    const handleClearMessages = () => {
        dispatch(clearMessages());
    };

    const handleNewConversation = () => {
        dispatch(startNewConversation());
    };

    // Get unread message count (simple implementation)
    const unreadCount = messages.filter((msg) => msg.sender === 'bot').length > 0 && !isOpen ? 1 : 0;

    return (
        <>
            {/* Floating Action Button */}
            <Zoom in={!isOpen}>
                <Box
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        zIndex: 1300,
                    }}
                >
                    <Tooltip title={t('chatbot.openChat') || 'Open Chatbot'} placement="left">
                        <Fab
                            color="primary"
                            aria-label="chat"
                            onClick={handleToggle}
                            size="large"
                        >
                            <Badge badgeContent={unreadCount} color="secondary">
                                <ChatIcon sx={{ fontSize: 28 }} />
                            </Badge>
                        </Fab>
                    </Tooltip>
                </Box>
            </Zoom>

            {/* Chat Window */}
            <Fade in={isOpen}>
                <Paper
                    elevation={8}
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        width: { xs: '90vw', sm: 400 },
                        height: { xs: '70vh', sm: 600 },
                        maxHeight: '80vh',
                        zIndex: 1400,
                        borderRadius: 3,
                        display: isOpen ? 'flex' : 'none',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                    }}
                >
                    {/* Header */}
                    <ChatHeader
                        connected={connected}
                        authenticated={authenticated}
                        onClose={handleToggle}
                        onClear={handleClearMessages}
                        onNewConversation={handleNewConversation}
                    />

                    {/* Messages */}
                    <ChatMessages
                        messages={messages}
                        isTyping={isTyping}
                        messagesEndRef={messagesEndRef}
                        error={error}
                        connected={connected}
                        authenticated={authenticated}
                        loadingHistory={loadingHistory}
                    />

                    {/* Input */}
                    <ChatInput
                        onSend={handleSendMessage}
                        disabled={!connected || !authenticated}
                        isTyping={isTyping}
                    />
                </Paper>
            </Fade>
        </>
    );
};

export default ChatWidget;
