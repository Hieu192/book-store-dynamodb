# Chatbot Frontend Integration Guide

## ✅ Files Created

### Redux State Management
- `src/constants/chatbotConstants.js` - Action constants
- `src/reducers/chatbotReducers.js` - Chatbot state reducer
- `src/actions/chatbotActions.js` - WebSocket actions
- Updated `src/store.js` - Added chatbot to Redux store

### UI Components (Material-UI)
- `src/components/chatbot/ChatWidget.jsx` - Main widget container
- `src/components/chatbot/ChatHeader.jsx` - Header with status
- `src/components/chatbot/ChatMessages.jsx` - Messages container
- `src/components/chatbot/ChatMessage.jsx` - Individual message
- `src/components/chatbot/ChatInput.jsx` - Input field

### i18n Translations
- `src/i18n/chatbotTranslations.js` - Vietnamese & English
- `src/i18n/extendTranslations.js` - Translation helper

---

## 🚀 Integration Steps

### 1. Install Dependencies (Optional - for date formatting)

```bash
cd frontend
npm install date-fns
```

### 2. Add ChatWidget to App

Edit `src/App.js`:

```javascript
import ChatWidget from './components/chatbot/ChatWidget';

function App() {
  return (
    <div className="App">
      {/* Existing routes and components */}
      
      {/* Add ChatWidget at the end */}
      <ChatWidget />
    </div>
  );
}
```

### 3. Configure Environment Variables

Edit `frontend/.env.development`:

```env
# Existing env vars...

# Chatbot WebSocket URL (update after Terraform deployment)
REACT_APP_CHATBOT_WS_URL=wss://your-api-id.execute-api.ap-southeast-1.amazonaws.com/prod
```

Edit `frontend/.env.production`:

```env
REACT_APP_CHATBOT_WS_URL=wss://your-api-id.execute-api.ap-southeast-1.amazonaws.com/prod
```

### 4. Update i18n Translations (If Not Using Existing Structure)

If you have custom i18n setup, merge chatbot translations:

```javascript
// src/i18n/i18n.js
import chatbotTranslations from './chatbotTranslations';

const resources = {
  vi: {
    translation: {
      ...existingViTranslations,
      ...chatbotTranslations.vi
    }
  },
  en: {
    translation: {
      ...existingEnTranslations,
      ...chatbotTranslations.en
    }
  }
};
```

### 5. Fix Token Storage (Important!)

To make chatbot authentication work, update `src/actions/userActions.js`:

```javascript
// In login() function, after successful login:
export const login = (email, password) => async (dispatch) => {
  try {
    // ... existing code ...
    
    const { data } = await axios.post(`${API_CONFIG.API_URL}/login`, ...);
    
    // ADD THIS LINE:
    localStorage.setItem("token", JSON.stringify(data.token));
    
    dispatch({
      type: LOGIN_SUCCESS,
      payload: data.user
    });
  } catch (error) {
    // ... error handling
  }
};
```

---

## 🎨 Styling

The chatbot uses Material-UI components and follows your existing theme.

### Custom Styles (Optional)

Add to `src/App.css` or component-specific styles:

```css
/* Smooth scrolling for messages */
.chatbot-messages {
  scroll-behavior: smooth;
}

/* Custom scrollbar */
.chatbot-messages::-webkit-scrollbar {
  width: 6px;
}

.chatbot-messages::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.2);
  border-radius: 3px;
}
```

---

## 🧪 Testing

### Test Locally

1. Start backend:
```bash
cd backend
npm run start
```

2. Start frontend:
```bash
cd frontend
npm start
```

3. Login as a user
4. Click chatbot button (bottom-right)
5. Send test message

### Test WebSocket Connection

Open browser console and check for:
- ✅ `WebSocket connected`
- ✅ `Chatbot WebSocket connected`
- ✅ `Authenticated!`

---

## 🔧 Troubleshooting

### Chatbot button not showing
- Check if `ChatWidget` is added to `App.js`
- Check console for import errors

### WebSocket not connecting
- Verify `REACT_APP_CHATBOT_WS_URL` in `. env`
- Check if API Gateway is deployed
- Check browser console for WebSocket errors

### Authentication fails
- Verify token is in localStorage: `localStorage.getItem('token')`
- Check if JWT_SECRET matches backend
- Check Lambda logs in CloudWatch

### Messages not appearing
- Check Redux DevTools for state updates
- Verify chatbotReducer is in store
- Check browser console for errors

---

## 📱 Features

### Implemented
- ✅ WebSocket connection with auto-reconnect
- ✅ JWT authentication
- ✅ Real-time messaging
- ✅ Typing indicator
- ✅ Message history
- ✅ Status indicator (online/offline)
- ✅ Clear history
- ✅ Responsive design (mobile/desktop)
- ✅ i18n support (Vietnamese/English)
- ✅ Source citations (for RAG responses)

### Optional Enhancements
- [ ] Message read receipts
- [ ] Sound notifications
- [ ] File upload support
- [ ] Emoji picker
- [ ] Message search
- [ ] Export conversation

---

## 🎯 Next Steps

1. Deploy Terraform infrastructure
2. Get WebSocket URL from Terraform output
3. Update `.env` files
4. Test end-to-end
5. Deploy frontend

---

## 📚 Component API

### ChatWidget Props
No props - uses Redux state

### Usage
```jsx
import ChatWidget from './components/chatbot/ChatWidget';

// Just add to App
<ChatWidget />
```

### Redux Actions
```javascript
import { connectChatbot, sendMessage, toggleChatbot } from './actions/chatbotActions';

// Connect
dispatch(connectChatbot());

// Send message
dispatch(sendMessage('Hello!'));

// Toggle widget
dispatch(toggleChatbot());
```

### Redux State
```javascript
const { chatbot } = useSelector(state => state);

// chatbot.connected - WebSocket connection status
// chatbot.authenticated - Auth status
// chatbot.messages - Array of messages
// chatbot.isTyping - Bot typing indicator
// chatbot.isOpen - Widget open/closed
```

---

## 🔒 Security Notes

- Token stored in localStorage (acceptable for this use case)
- WebSocket uses WSS (encrypted)
- JWT verified on every message
- Auto-disconnect on auth failure
- Rate limiting handled by API Gateway

---

For more details, see:
- Lambda README: `chatbot/lambda/README.md`
- Terraform config: `infrastructure/terraform/chatbot.tf`
