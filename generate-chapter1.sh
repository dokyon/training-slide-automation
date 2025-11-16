#!/bin/bash

echo "🚀 Starting Chapter 1 narration generation (Paid tier mode)"
echo "📊 Estimated time: ~25 seconds"
echo ""

cd /Users/dosakakyohei/dev/training-slide-automation

GEMINI_API_KEY=AIzaSyAGJY8kAl6wQjMOypKcxZgBGZV2mSC-SJA npm run narration scripts/chapter1-detailed.json
