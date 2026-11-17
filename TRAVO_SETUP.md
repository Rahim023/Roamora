# Travo Credential Setup Guide

## Current Status
Your Roamora application uses **Travo**, an AI-powered travel chatbot that helps users discover trips. Travo requires the **Google Gemini API** to function.

## ✅ What's Already Configured

Your backend `.env` file already has:
```
GEMINI_API_KEY=AIzaSyAV7YUh0BWNZB4DRcJPbmwhcrfgkN7FgSU
```

The backend is configured to use Google's Gemini API with the route:
- **Endpoint**: `POST /api/travo`
- **Package**: `@google/genai` (already in package.json)

## ❌ Why "Credential Unavailable" Error Occurs

### On Render (Backend)
If you see this error on production:
1. **Environment variables not synced** - The `GEMINI_API_KEY` may not be set in Render's dashboard
2. **Missing dependency** - The `@google/genai` package needs to be installed on Render

### On Netlify (Frontend)
The frontend gets "Travo credential unavailable" when:
1. The backend `/api/travo` endpoint returns a 503 error
2. Backend can't access `GEMINI_API_KEY`
3. Network/CORS issues preventing communication

## 🔧 Fix Steps

### Step 1: Verify Render Environment Variables
1. Go to your Render backend dashboard
2. Navigate to **Environment** tab
3. Add/verify these variables:
   ```
   GEMINI_API_KEY=AIzaSyAV7YUh0BWNZB4DRcJPbmwhcrfgkN7FgSU
   GEMINI_MODEL=gemini-3.1-flash-lite (optional, default is used)
   ```

### Step 2: Verify CORS Settings
In your backend `app.js`, ensure CORS includes both frontend URLs:
```javascript
CLIENT_ORIGIN=http://localhost:5173,https://roamoraa.netlify.app
```

### Step 3: Redeploy Backend
1. After adding env variables on Render:
   - Push changes to GitHub or manually trigger redeploy
   - Wait for deployment to complete
2. Test the endpoint: `POST https://your-render-backend/api/travo`

### Step 4: Check Backend Logs
On Render, check the deployment logs:
```
Travo is not configured yet.
// vs
AI planner credentials are unavailable.
```

## 🧪 Testing Travo Locally

```bash
# Terminal 1: Start Backend
cd backend
npm install
npm run dev

# Terminal 2: Start Frontend
cd frontend
npm install
npm run dev

# Test in browser
# Navigate to http://localhost:5173/travo
# Try sending a message like: "Show me beach destinations"
```

## 🔑 API Key Details

**Current Key Status:**
- ✅ Valid and Active (AIzaSyAV7YUh0BWNZB4DRcJPbmwhcrfgkN7FgSU)
- ✅ Associated with Google Cloud Project
- ✅ Has Gemini API access

**To Generate a New Key** (if current one is compromised):
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Find your project
3. Enable "Google Generative AI API"
4. Create API Key in Credentials section
5. Update in both `.env` and Render dashboard

## 🚀 Backend Routes Using Travo

### 1. Chat Endpoint
```
POST /api/travo
Body: { messages: [{ role: "user"|"model", text: "..." }] }
Response: { reply: "..." }
```

### 2. Trip Planning Endpoint
```
POST /api/itineraries/plan (requires auth)
Body: {
  destination: "Paris",
  durationDays: 5,
  travellerCount: 2,
  budgetMinor: 100000,
  interests: ["museums", "food"]
}
Response: { itinerary JSON }
```

## 🛠️ Common Issues & Solutions

### Issue: "Travo is not configured yet"
**Cause**: `GEMINI_API_KEY` not found in environment
**Fix**: Add to Render dashboard environment variables

### Issue: "AI planner credentials are unavailable"
**Cause**: API key is invalid or revoked
**Fix**: Generate new key and update in Render

### Issue: Timeout errors from Travo
**Cause**: API quota exceeded or network issue
**Fix**: 
- Check Google Cloud Console for quota
- Verify network connectivity
- Retry after a few seconds

### Issue: Empty responses from Travo
**Cause**: API key working but model not responding
**Fix**: Check Google Cloud logs for specific errors

## 📊 Monitoring

Watch for these errors in backend logs:
1. **503 Service Unavailable** - Credentials missing
2. **401/403 Unauthorized** - Invalid API key
3. **429 Too Many Requests** - Quota exceeded
4. **504 Gateway Timeout** - API slow/unresponsive

## ✨ Best Practices

1. **Never commit `.env` to Git** - Use Render's dashboard
2. **Rotate keys periodically** - Change API keys every 90 days
3. **Monitor usage** - Check Google Cloud Console for quota
4. **Test after deployment** - Always verify Travo works post-deploy
5. **Handle gracefully** - Frontend already shows user-friendly error messages

## 📝 Next Steps

1. ✅ Verify `GEMINI_API_KEY` exists on Render
2. ✅ Check backend logs for credential errors
3. ✅ Redeploy backend if needed
4. ✅ Clear browser cache and retry
5. ✅ Test on http://localhost:5173/travo locally first
