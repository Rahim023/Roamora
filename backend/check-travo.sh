#!/bin/bash
# Diagnostic script to check Travo configuration

echo "🔍 Travo Configuration Diagnostic"
echo "=================================="
echo ""

# Check if .env file exists
if [ -f ".env" ]; then
    echo "✅ .env file found"
    
    # Check GEMINI_API_KEY
    if grep -q "GEMINI_API_KEY=" .env; then
        KEY=$(grep "GEMINI_API_KEY=" .env | cut -d'=' -f2)
        if [ -z "$KEY" ]; then
            echo "❌ GEMINI_API_KEY is empty"
        else
            echo "✅ GEMINI_API_KEY is set"
            echo "   Key length: ${#KEY} characters"
            echo "   First 10 chars: ${KEY:0:10}..."
        fi
    else
        echo "❌ GEMINI_API_KEY not found in .env"
    fi
    
    # Check GEMINI_MODEL
    if grep -q "GEMINI_MODEL=" .env; then
        echo "✅ GEMINI_MODEL is set"
    else
        echo "⚠️  GEMINI_MODEL not set (will use default: gemini-3.1-flash-lite)"
    fi
else
    echo "❌ .env file not found"
fi

echo ""
echo "📦 Package Status"
echo "=================="

# Check if @google/genai is in package.json
if grep -q "@google/genai" package.json; then
    echo "✅ @google/genai is in package.json"
    VERSION=$(grep "@google/genai" package.json | grep -oE '\^[0-9.]+' | head -1)
    echo "   Version: $VERSION"
else
    echo "❌ @google/genai not found in package.json"
fi

echo ""
echo "🌐 Backend Endpoints"
echo "===================="
if grep -q "'/travo'" src/routes/api.js 2>/dev/null || grep -q '"/travo"' src/routes/api.js 2>/dev/null; then
    echo "✅ /api/travo endpoint is registered"
else
    echo "❌ /travo endpoint not found"
fi

if grep -q "'/itineraries/plan'" src/routes/api.js 2>/dev/null || grep -q '"/itineraries/plan"' src/routes/api.js 2>/dev/null; then
    echo "✅ /api/itineraries/plan endpoint is registered"
else
    echo "❌ /itineraries/plan endpoint not found"
fi

echo ""
echo "✨ Recommendation"
echo "================="
echo ""
echo "If you're seeing 'Travo credential unavailable' on the live site:"
echo ""
echo "1. SSH into Render backend:"
echo "   - Go to Render dashboard"
echo "   - Click your backend service"
echo "   - Look for 'Shell' tab"
echo ""
echo "2. Run: env | grep GEMINI"
echo "   - Should show GEMINI_API_KEY=AIzaSyAV7YUh0BWNZB4DRcJPbmwhcrfgkN7FgSU"
echo ""
echo "3. If not present, add to Render Environment tab:"
echo "   - Variable: GEMINI_API_KEY"
echo "   - Value: AIzaSyAV7YUh0BWNZB4DRcJPbmwhcrfgkN7FgSU"
echo ""
echo "4. Redeploy the backend"
echo ""
