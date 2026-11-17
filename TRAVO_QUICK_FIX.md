# Quick Fix: Travo "Credential Unavailable" Error

## 🔴 Problem
When accessing `/travo` page or Travo feature, you see:
> "Travo is not configured yet" or "Travo credential unavailable"

## ✅ Solution (3 Steps)

### Step 1: Verify Local `.env` File
```bash
# In backend directory
cat .env | grep GEMINI
```

Should show:
```
GEMINI_API_KEY=AIzaSyAV7YUh0BWNZB4DRcJPbmwhcrfgkN7FgSU
```

✅ If present → Go to Step 2
❌ If missing → Add it to `.env` file

### Step 2: Add to Render Environment Variables
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click your **Backend Service**
3. Click **Environment** tab
4. Add this variable:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: `AIzaSyAV7YUh0BWNZB4DRcJPbmwhcrfgkN7FgSU`
5. Click **Save**

### Step 3: Redeploy Backend
1. After saving, Render automatically redeploys
2. Watch the **Logs** tab
3. Look for: `✅ Travo: Configured (Gemini API key present)`
4. Wait for "Deployment successful"

---

## 🧪 Test It Works

### Local Testing:
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev

# Browser: http://localhost:5173/travo
# Try sending a message
```

### Production Testing:
1. Wait for Render deployment to complete
2. Clear browser cache (Ctrl+Shift+Delete)
3. Go to https://roamoraa.netlify.app/travo
4. Try sending a message to Travo

---

## 🔍 Troubleshooting

### "Still getting credential error after adding env var"
1. **Wait 2-3 minutes** for Render redeployment
2. Go to **Logs** in Render dashboard
3. Look for `✅ Travo: Configured` message
4. If not there, restart deployment:
   - Click **Redeploy** button
   - Confirm and wait

### "Travo responds slowly or times out"
1. This is likely Google API quota issue
2. Check [Google Cloud Console](https://console.cloud.google.com)
3. Look for API quota usage
4. If quota exceeded, wait for reset or upgrade plan

### "Getting 404 error from /api/travo"
1. Backend not running
2. CORS misconfigured
3. Try accessing backend directly:
   ```bash
   curl https://your-render-backend/api/travo
   # Should show 400 (Bad Request) for missing messages
   # Not 404 or 503
   ```

---

## ✨ Expected Behavior

### When Working:
✅ Message sent
✅ Shows "thinking..." indicator
✅ Travo responds in 2-10 seconds
✅ Response streams character by character

### When Not Working:
❌ 503 Service Unavailable → Missing GEMINI_API_KEY
❌ 404 Not Found → Backend not running
❌ CORS error → Frontend URL not in CORS origins
❌ Timeout → Google API slow/quota exceeded

---

## 📞 Still Not Working?

Check these in order:
1. ✅ GEMINI_API_KEY in Render **Environment** tab (not just .env)
2. ✅ Render shows "Deployment successful"
3. ✅ Logs show `✅ Travo: Configured`
4. ✅ Browser cache cleared
5. ✅ Wait 2+ minutes after adding env var
6. ✅ Try in incognito/private window
7. ✅ Check network tab in DevTools for actual error

---

**Last Updated**: November 17, 2026
**Key Location**: `AIzaSyAV7YUh0BWNZB4DRcJPbmwhcrfgkN7FgSU`
