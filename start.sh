#!/bin/bash

echo "🚀 启动 Halli Galli 德国心脏病游戏服务器..."

# 停止旧进程
pkill -f "node server/index.js" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 1

# 启动开发服务器
npm run dev

echo "✅ 服务器已启动"
echo "🔔 前端：http://localhost:5173"
echo "🔌 后端：http://localhost:7779"
