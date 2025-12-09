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
    CHATBOT_TYPING_STOP,
    CHATBOT_TOGGLE_WIDGET,
    CHATBOT_CLEAR_MESSAGES,
    CHATBOT_ERROR
} from '../constants/chatbotConstants';

const initialState = {
    connected: false,
    authenticated: false,
    loading: false,
    isOpen: false,
    messages: [],
    isTyping: false,
    error: null,
    conversationId: null
};

export const chatbotReducer = (state = initialState, action) => {
    switch (action.type) {
        case CHATBOT_CONNECT_REQUEST:
            return {
                ...state,
                loading: true,
                error: null
            };

        case CHATBOT_CONNECT_SUCCESS:
            return {
                ...state,
                loading: false,
                connected: true,
                error: null
            };

        case CHATBOT_CONNECT_FAIL:
            return {
                ...state,
                loading: false,
                connected: false,
                error: action.payload
            };

        case CHATBOT_DISCONNECT:
            return {
                ...initialState,
                isOpen: state.isOpen
            };

        case CHATBOT_AUTH_SUCCESS:
            return {
                ...state,
                authenticated: true,
                error: null
            };

        case CHATBOT_AUTH_FAIL:
            return {
                ...state,
                authenticated: false,
                error: action.payload
            };

        case CHATBOT_SEND_MESSAGE_REQUEST:
            return {
                ...state,
                loading: true,
                messages: [
                    ...state.messages,
                    {
                        id: Date.now().toString(),
                        sender: 'user',
                        content: action.payload,
                        timestamp: new Date().toISOString()
                    }
                ]
            };

        case CHATBOT_SEND_MESSAGE_SUCCESS:
            return {
                ...state,
                loading: false
            };

        case CHATBOT_SEND_MESSAGE_FAIL:
            return {
                ...state,
                loading: false,
                error: action.payload
            };

        case CHATBOT_RECEIVE_MESSAGE:
            return {
                ...state,
                messages: [
                    ...state.messages,
                    action.payload
                ],
                conversationId: action.payload.conversationId || state.conversationId,
                isTyping: false
            };

        case CHATBOT_TYPING:
            return {
                ...state,
                isTyping: true
            };

        case CHATBOT_TYPING_STOP:
            return {
                ...state,
                isTyping: false
            };

        case CHATBOT_TOGGLE_WIDGET:
            return {
                ...state,
                isOpen: !state.isOpen
            };

        case CHATBOT_CLEAR_MESSAGES:
            return {
                ...state,
                messages: [],
                conversationId: null
            };

        case CHATBOT_ERROR:
            return {
                ...state,
                error: action.payload,
                loading: false,
                isTyping: false
            };

        default:
            return state;
    }
};
