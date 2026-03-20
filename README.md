# 🔔 Halli Galli 德国心脏病

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vue 3](https://img.shields.io/badge/Vue-3.4-42b883)](https://vuejs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933)](https://nodejs.org/)

经典的德国心脏病卡牌游戏 - 支持局域网双人对战

**🎮 在线演示**: 即将上线

---

## 🎯 游戏模式

### 经典模式 (Classic) 🍌
- 60 张牌
- 1 种按铃条件：**5 张同种水果**
- 难度：⭐⭐
- 适合新手入门

### 极限模式 (Extreme) 🐵
- 72 张牌（64 水果 + 8 动物）
- 5 种按铃条件：
  1. 5 张同种水果
  2. 5 张动物牌
  3. 4 种不同水果/动物
  4. 2 对相同的牌
  5. 连续数字的水果牌
- 难度：⭐⭐⭐⭐⭐
- 适合进阶挑战

---

## 🚀 快速开始

### 前置要求
- Node.js 18+
- npm 或 yarn

### 安装

```bash
# 克隆仓库
git clone https://github.com/wangjiean/halli-galli.git
cd halli-galli

# 安装依赖
npm install
cd client && npm install
cd ..
```

### 开发模式

```bash
# 同时启动后端和前端
npm run dev
```

访问：**http://localhost:5173**

### 生产部署

```bash
# 构建前端
npm run build

# 启动生产服务器
npm start
```

---

## 🎮 游戏操作

### 出牌
- 轮到你时（名字旁有 ▶ 标志）
- 点击底部手牌出牌

### 按铃 🔔
- 观察中央牌堆
- 满足条件时点击按铃按钮
- 正确按铃赢得所有牌
- 错误按铃被罚牌

### 胜利条件
赢得所有牌的玩家获胜！

---

## 📋 测试

```bash
# 运行所有测试
npm test

# 运行特定测试套件
npm run test:auth        # 认证测试
npm run test:rooms       # 房间管理测试
npm run test:gameplay    # 游戏流程测试
npm run test:bell        # 按铃判定测试
npm run test:leaderboard # 排行榜测试
```

**测试覆盖**: 28 个 E2E 测试用例

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **后端** | Node.js + Express + Socket.IO |
| **前端** | Vue 3 + Vite + Pinia |
| **UI** | Naive UI |
| **认证** | JWT (7 天有效期) |
| **数据库** | lowdb (JSON 文件) |
| **测试** | Playwright |

---

## 📁 项目结构

```
halli-galli/
├── server/                    # 后端服务
│   ├── index.js              # Express + Socket.IO
│   ├── auth/                 # 认证模块
│   ├── db/                   # 数据库
│   ├── game/                 # 游戏逻辑
│   │   ├── room.manager.js   # 房间管理
│   │   ├── socket.handlers.js# Socket 事件
│   │   ├── deck.js           # 牌组生成
│   │   └── bell.validator.js # 按铃验证
│   └── leaderboard/          # 排行榜
├── client/                    # 前端应用
│   ├── src/
│   │   ├── views/            # 页面组件
│   │   ├── stores/           # 状态管理
│   │   └── services/         # API 服务
│   └── vite.config.js
├── tests/                     # Playwright 测试
│   ├── halli-galli-auth.spec.js
│   ├── halli-galli-rooms.spec.js
│   ├── halli-galli-gameplay.spec.js
│   ├── halli-galli-bell.spec.js
│   └── halli-galli-leaderboard.spec.js
└── package.json
```

---

## 📖 文档

- **[玩家说明](./玩家说明.md)** - 详细的游戏规则和新手教程
- [需求文档](./需求文档.md) - 技术需求规格

---

## ⚙️ 配置

### 环境变量

```bash
# .env (可选)
PORT=7779
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
```

### 端口说明
- 后端服务器：7779
- 前端开发服务器：5173

---

## 🤝 贡献

欢迎贡献代码、报告问题或提出建议！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

- 游戏灵感来自经典桌游 Halli Galli (德国心脏病)
- 使用 [Vue 3](https://vuejs.org/) 构建前端
- 使用 [Socket.IO](https://socket.io/) 实现实时通信

---

**🎮 祝你游戏愉快！**
