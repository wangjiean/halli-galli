# 🔔 Halli Galli 德国心脏病

经典的德国心脏病卡牌游戏 - 支持局域网双人对战

## 游戏模式

### 经典模式 (Classic)
- 60 张牌
- 只有一种按铃条件：**5 张同种水果**

### 极限模式 (Extreme)
- 72 张牌（64 水果 + 8 动物）
- 5 种按铃条件：5 张同种水果、5 张动物、4 种不同、2 对牌、连续数字

## 快速开始

```bash
# 安装依赖
npm install
cd client && npm install

# 开发模式
npm run dev

# 运行测试
npm test
```

访问：http://localhost:5173

## 技术栈

- **后端**: Node.js + Express + Socket.IO
- **前端**: Vue 3 + Vite + Pinia + Naive UI
- **数据库**: lowdb (JSON 文件)
- **测试**: Playwright

完整文档见项目文件。
