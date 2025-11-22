# 🔧 ENVIRONMENT VARIABLES SETUP GUIDE

## 📁 FILES CREATED

```
frontend/
├── .env.development      # Development environment
├── .env.test            # Test environment
├── .env.production      # Production environment
├── .env.example         # Example template
├── src/
│   ├── config/
│   │   └── config.js    # Centralized configuration
│   └── utils/
│       └── apiClient.js # Axios instance with interceptors
```

---

## 🚀 QUICK START

### 1. Development:
```bash
# Copy example file
cp .env.example .env.development

# Or use existing .env.development
npm start
# → Uses http://localhost:4000
```

### 2. Test:
```bash
npm test
# → Uses .env.test
```

### 3. Production:
```bash
# Update .env.production with your ALB DNS
REACT_APP_API_URL=https://your-alb-dns.elb.amazonaws.com/api/v1
REACT_APP_WS_URL=wss://your-alb-dns.elb.amazonaws.com/ws

npm run build
# → Uses .env.production
```

---

## 📝 ENVIRONMENT VARIABLES

### API Configuration:
```bash
# Base API URL (with /api/v1)
REACT_APP_API_URL=http://localhost:4000/api/v1

# Base URL (without /api/v1)
REACT_APP_API_BASE_URL=http://localhost:4000
```

### WebSocket Configuration:
```bash
# WebSocket URL
REACT_APP_WS_URL=ws://localhost:4000/ws

# Production example:
REACT_APP_WS_URL=wss://your-alb-dns.elb.amazonaws.com/ws
```

### Cloudinary Configuration:
```bash
# Cloudinary base URL for images
REACT_APP_CLOUDINARY_BASE_URL=https://res.cloudinary.com/your-cloud-name/image/upload
```

### Payment Configuration:
```bash
# Payment API URL
REACT_APP_PAYMENT_API_URL=http://localhost:4000/api/v1
```

### Contact Form:
```bash
# FormSubmit URL
REACT_APP_CONTACT_FORM_URL=https://formsubmit.co/your-email@example.com
```

### App Configuration:
```bash
# Environment name
REACT_APP_ENV=development

# Debug mode
REACT_APP_DEBUG=true
```

### Feature Flags:
```bash
# Enable/disable WebSocket
REACT_APP_ENABLE_WEBSOCKET=true

# Enable/disable notifications
REACT_APP_ENABLE_NOTIFICATIONS=true
```

---

## 💻 USAGE IN CODE

### Option 1: Use config object (Recommended):
```javascript
import config from './config/config';

// Get API URL
const apiUrl = config.API_URL;

// Get WebSocket URL
const wsUrl = config.getWsUrl();

// Get full API endpoint
const endpoint = config.getApiUrl('/products');

// Get Cloudinary image
const imageUrl = config.getCloudinaryUrl('v1657877004/features/feature-i1_kuhehk.svg');

// Check environment
if (config.isProduction()) {
  // Production-specific code
}
```

### Option 2: Use API client (Recommended for API calls):
```javascript
import apiClient, { api } from './utils/apiClient';

// GET request
const { data } = await api.get('/products');

// POST request
const { data } = await api.post('/login', { email, password });

// PUT request
const { data } = await api.put('/me/update', userData);

// DELETE request
const { data } = await api.delete(`/product/${id}`);
```

### Option 3: Direct access (Not recommended):
```javascript
// ❌ Bad: Hardcoded
const url = 'http://localhost:4000/api/v1/products';

// ✅ Good: Use environment variable
const url = `${process.env.REACT_APP_API_URL}/products`;

// ✅ Better: Use config
import config from './config/config';
const url = config.getApiUrl('/products');

// ✅ Best: Use API client
import { api } from './utils/apiClient';
const { data } = await api.get('/products');
```

---

## 🔄 MIGRATION GUIDE

### Before (Hardcoded):
```javascript
// ❌ Old way
const { data } = await axios.get(
  'http://localhost:4000/api/v1/products',
  { withCredentials: true }
);
```

### After (Environment Variables):
```javascript
// ✅ New way
import { api } from '../utils/apiClient';

const { data } = await api.get('/products');
// → Automatically uses REACT_APP_API_URL
// → Automatically includes withCredentials
// → Automatically adds auth token
```

---

## 🏗️ FILES TO UPDATE

### Already Updated:
- ✅ `.env.development`
- ✅ `.env.test`
- ✅ `.env.production`
- ✅ `src/config/config.js`
- ✅ `src/utils/apiClient.js`

### Need to Update (Manual):
```
src/actions/
├── userActions.js       # Replace all axios calls
├── productActions.js    # Replace all axios calls
├── orderActions.js      # Replace all axios calls
├── categoryActions.js   # Replace all axios calls
└── cartActions.js       # Replace all axios calls

src/components/
├── layout/
│   ├── Search.js        # Replace axios call
│   ├── NotificationBell.js  # Replace WebSocket URL
│   └── Features.js      # Replace Cloudinary URLs
├── cart/
│   └── ConfirmOrder.js  # Replace fetch call
└── Contact.js           # Replace form action URL
```

---

## 🔧 EXAMPLE UPDATES

### 1. Update userActions.js:
```javascript
// Before:
import axios from 'axios';
const { data } = await axios.post(
  'http://localhost:4000/api/v1/login',
  { email, password },
  { withCredentials: true }
);

// After:
import { api } from '../utils/apiClient';
const { data } = await api.post('/login', { email, password });
```

### 2. Update NotificationBell.js:
```javascript
// Before:
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${protocol}//${window.location.hostname}:4000/ws`;
const ws = new WebSocket(wsUrl);

// After:
import config from '../../config/config';
const wsUrl = config.getWsUrl();
const ws = new WebSocket(wsUrl);
```

### 3. Update Features.js:
```javascript
// Before:
<img src="https://res.cloudinary.com/hba-solver/image/upload/v1657877004/features/feature-i1_kuhehk.svg" />

// After:
import config from '../../config/config';
<img src={config.getCloudinaryUrl('v1657877004/features/feature-i1_kuhehk.svg')} />
```

---

## 🚀 DEPLOYMENT

### Development:
```bash
npm start
# → Uses .env.development
# → http://localhost:4000
```

### Test:
```bash
npm test
# → Uses .env.test
```

### Production Build:
```bash
# 1. Update .env.production
REACT_APP_API_URL=https://your-alb-dns.elb.amazonaws.com/api/v1
REACT_APP_WS_URL=wss://your-alb-dns.elb.amazonaws.com/ws

# 2. Build
npm run build

# 3. Upload to S3
aws s3 sync build/ s3://your-bucket/
```

---

## 🔍 DEBUGGING

### Check current configuration:
```javascript
import config from './config/config';

// Log all config (development only)
config.logConfig();

// Check specific values
console.log('API URL:', config.API_URL);
console.log('WS URL:', config.WS_URL);
console.log('Environment:', config.ENV);
console.log('Is Production:', config.isProduction());
```

### Check environment variables:
```javascript
console.log('All env vars:', process.env);
console.log('API URL:', process.env.REACT_APP_API_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
```

---

## ⚠️ IMPORTANT NOTES

1. **Environment variables must start with `REACT_APP_`**
   - ✅ `REACT_APP_API_URL`
   - ❌ `API_URL` (won't work)

2. **Restart development server after changing .env files**
   ```bash
   # Stop server (Ctrl+C)
   npm start  # Start again
   ```

3. **Don't commit .env files with secrets**
   ```bash
   # .gitignore should include:
   .env.local
   .env.development.local
   .env.test.local
   .env.production.local
   ```

4. **Production values are embedded at build time**
   - Environment variables are embedded during `npm run build`
   - Cannot change after build
   - Must rebuild to update values

---

## 🎯 NEXT STEPS

1. ✅ Environment files created
2. ✅ Config file created
3. ✅ API client created
4. ⏳ Update all action files (manual)
5. ⏳ Update all component files (manual)
6. ⏳ Test in development
7. ⏳ Test in production

**Estimated time to update all files: 1-2 hours**
