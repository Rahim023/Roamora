# 🔴 Travo 503 Error - Root Cause & Fix

## Problem
Getting **503 "Travo credentials are unavailable"** error when trying to use the Travo chat feature.

## Root Cause Analysis

The error occurs when:
1. ✅ GEMINI_API_KEY is present in `.env` → `AIzaSyAV7YUh0BWNZB4DRcJPbmwhcrfgkN7FgSU`
2. ✅ Backend is running and can see the key → "✅ Travo: Configured" on startup
3. ❌ **Google API is returning 401/403 error** → Key is invalid or restricted

## Why the Key is Failing

The API key `AIzaSyAV7YUh0BWNZB4DRcJPbmwhcrfgkN7FgSU` is likely:
- **Expired** (created too long ago without use)
- **Revoked** (deleted from Google Cloud Console)
- **Has wrong permissions** (not enabled for Generative AI API)
- **IP restricted** (locked to different IPs)
- **Quota exceeded** (rate limited by Google)

## ✅ Fix Steps

### Step 1: Generate a NEW API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Create API Key"**
3. Select **"Create in existing project"** or create new project
4. Click **"Create API Key in Google Cloud"**
5. **Copy the new key** immediately

### Step 2: Update Local `.env`

Replace the old key with the new one:

```bash
# File: backend/.env
GEMINI_API_KEY=<NEW_KEY_HERE>
GEMINI_MODEL=gemini-3.1-flash-lite
```

### Step 3: Update Render Environment Variables

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click your **Backend Service**
3. Click **Environment** tab
4. Find `GEMINI_API_KEY` variable
5. Update value with the new key
6. Click **Save**
7. Render automatically redeploys

### Step 4: Test Locally First

```bash
# Terminal 1
cd backend
npm run dev

# Terminal 2 - Wait for server to show "✅ Travo: Configured"
# Then test:
curl -X POST http://localhost:5000/api/travo \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","text":"Show me beach trips"}]}'

# Should respond with: {"reply":"...Travo response..."}
```

### Step 5: Deploy to Production

After testing locally:

1. Backend on Render:
   - Wait for "Deployment successful" in logs
   - Should show "✅ Travo: Configured" on boot

2. Frontend on Netlify:
   - Clear browser cache (Ctrl+Shift+Delete)
   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
   - Visit https://roamoraa.netlify.app/travo
   - Try sending a message

## 🧪 Testing the Fix

### Local Test (Before Deploying)
```javascript
// In browser DevTools console while running locally
fetch('http://localhost:5000/api/travo', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', text: 'Hello Travo' }]
  })
})
  .then(r => r.json())
  .then(d => console.log(d.reply))
  .catch(e => console.error(e))
```

### Production Test
1. Go to https://roamoraa.netlify.app/travo
2. Type: "Show me adventure trips in Thailand"
3. Wait for response
4. If it works → ✅ Done!
5. If 503 error → Check Render logs

## 🔍 Troubleshooting

### "Still getting 503 after updating key"

**Step 1:** Verify the key was updated on Render
```bash
# SSH into Render (via dashboard Shell tab)
env | grep GEMINI
```

Should show your new key. If not, it wasn't saved.

**Step 2:** Redeploy backend
- Click **Redeploy** button in Render dashboard
- Wait for logs to show "✅ Travo: Configured"

**Step 3:** Check Google Cloud API is enabled
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Find your project
3. Search for "Google Generative AI API"
4. Click to open and verify it says "Enabled"
5. If disabled, click **Enable**

### "Getting different error (404, 500, etc.)"

| Error | Cause | Fix |
|-------|-------|-----|
| 404 | Endpoint doesn't exist | Restart backend |
| 500 | Backend crash | Check server logs |
| 429 | Google API rate limit | Wait a few minutes |
| 504 | Timeout | Check network, try again |

### "Response is empty or incomplete"

This usually means:
1. Google API quota exceeded for today
2. API is rate limiting requests
3. Network timeout

**Solution:** Wait 1-2 hours and retry

## 📋 Checklist Before Production

- [ ] New API key generated from Google AI Studio
- [ ] `.env` file updated locally with new key
- [ ] `npm run dev` shows "✅ Travo: Configured"
- [ ] Local test works: `/api/travo` returns valid response
- [ ] Render Environment tab has new GEMINI_API_KEY
- [ ] Render deployment shows "Deployment successful"
- [ ] Render logs show "✅ Travo: Configured"
- [ ] Browser cache cleared
- [ ] Hard refresh done on Netlify app
- [ ] Production test works: Chat responds in Travo page

## 🚀 Expected Behavior After Fix

✅ Travo page loads  
✅ Type message → "thinking..." appears  
✅ Response streams character by character  
✅ Can have conversation back and forth  
✅ No 503 errors  

## 📞 If Issue Persists

1. Verify API key is valid: https://aistudio.google.com/app/apikey
2. Confirm Google Generative AI API is enabled
3. Check Render logs for exact error message
4. Try a simple test query: "What is a vacation?"
5. Check network tab in DevTools for actual response

---

**Updated**: November 17, 2026
**Key Issue**: Google API returning 401/403 (invalid/revoked key)
**Solution**: Generate new API key and update on Render
