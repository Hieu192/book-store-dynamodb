import {
    CHATBOT_CONNECT_REQUEST,
    CHATBOT_CONNECT_SUCCESS,
    CHATBOT_CONNECT_FAIL,
    CHATBOT_DISCONNECT,
    CHATBOT_AUTH_SUCCESS,
    CHATBOT_AUTH_FAIL,
    CHATBOT_SEND_MESSAGE_REQUEST,
    CHATBOT_SEND_MESSAGE_SUCCESS,
    CHATBOT_SEND_MESSAGE_FAIL,
    CHATBOT_RECEIVE_MESSAGE,
    CHATBOT_TYPING,
    CHATBOT_TOGGLE_WIDGET,
    CHATBOT_CLEAR_MESSAGES,
    CHATBOT_ERROR
} from '../constants/chatbotConstants';
import axios from 'axios';
import API_CONFIG from '../config/config';

// WebSocket instance
let ws = null;

/**
 * Connect to chatbot WebSocket
 * Gets fresh token from backend API
 */
export const connectChatbot = () => async (dispatch, getState) => {
    try {
        dispatch({ type: CHATBOT_CONNECT_REQUEST });

        const { auth } = getState();

        if (!auth.isAuthenticated) {
            throw new Error('User must be logged in to use chatbot');
        }

        // Get WebSocket URL from environment
        const wsUrl = process.env.REACT_APP_CHATBOT_WS_URL;

        if (!wsUrl) {
            throw new Error('REACT_APP_CHATBOT_WS_URL not configured in .env');
        }

        // Connect with temporary token
        ws = new WebSocket(`${wsUrl}?temp=${Date.now()}`);

        ws.onopen = () => {
            console.log('✅ Chatbot WebSocket connected');
            dispatch({ type: CHATBOT_CONNECT_SUCCESS });

            // Get token from localStorage (stored during login)
            const token = localStorage.getItem('token');

            if (token) {
                console.log('🔑 Sending authentication with token');
                ws.send(JSON.stringify({
                    type: 'authenticate',
                    token: token
                }));
            } else {
                console.warn('⚠️ No token found in localStorage');
                dispatch({
                    type: CHATBOT_AUTH_FAIL,
                    payload: 'Please log in to use chatbot'
                });
            }
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('📨 Chatbot message:', data);

            switch (data.type) {
                case 'auth_success':
                    dispatch({ type: CHATBOT_AUTH_SUCCESS });
                    break;

                case 'auth_error':
                    dispatch({
                        type: CHATBOT_AUTH_FAIL,
                        payload: data.message
                    });
                    break;

                case 'typing':
                    dispatch({ type: CHATBOT_TYPING });
                    break;

                case 'chat_response':
                    dispatch({
                        type: CHATBOT_RECEIVE_MESSAGE,
                        payload: {
                            id: data.message.id,
                            sender: 'bot',
                            content: data.message.content,
                            timestamp: data.message.timestamp,
                            conversationId: data.conversationId,
                            sources: data.message.sources
                        }
                    });
                    dispatch({ type: CHATBOT_SEND_MESSAGE_SUCCESS });
                    break;

                case 'error':
                    dispatch({
                        type: CHATBOT_ERROR,
                        payload: data.message
                    });
                    break;

                case 'pong':
                    console.log('🏓 Pong received');
                    break;

                default:
                    console.warn('Unknown message type:', data.type);
            }
        };

        ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            dispatch({
                type: CHATBOT_CONNECT_FAIL,
                payload: 'WebSocket connection error'
            });
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            dispatch({ type: CHATBOT_DISCONNECT });
        };

    } catch (error) {
        dispatch({
            type: CHATBOT_CONNECT_FAIL,
            payload: error.message
        });
    }
};

/**
 * Send message to chatbot
 */
export const sendMessage = (message) => async (dispatch, getState) => {
    try {
        const { chatbot } = getState();

        if (!chatbot.connected || !chatbot.authenticated) {
            throw new Error('Chatbot not connected or authenticated');
        }

        if (!message || message.trim().length === 0) {
            return;
        }

        dispatch({
            type: CHATBOT_SEND_MESSAGE_REQUEST,
            payload: message
        });

        // Send message via WebSocket
        ws.send(JSON.stringify({
            type: 'chat_message',
            message: message.trim(),
            conversationId: chatbot.conversationId
        }));

    } catch (error) {
        dispatch({
            type: CHATBOT_SEND_MESSAGE_FAIL,
            payload: error.message
        });
    }
};

/**
 * Disconnect from chatbot
 */
export const disconnectChatbot = () => (dispatch) => {
    if (ws) {
        ws.close();
        ws = null;
    }
    dispatch({ type: CHATBOT_DISCONNECT });
};

/**
 * Toggle chatbot widget
 */
export const toggleChatbot = () => (dispatch) => {
    dispatch({ type: CHATBOT_TOGGLE_WIDGET });
};

/**
 * Clear chat messages
 */
export const clearMessages = () => (dispatch) => {
    dispatch({ type: CHATBOT_CLEAR_MESSAGES });
};
