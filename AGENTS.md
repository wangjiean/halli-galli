# AGENTS.md - 开发指南

## 项目概述

**Halli Galli 德国心脏病** - 局域网多人卡牌对战游戏

### 游戏模式
- **经典模式**: 60 张牌，5 张同种水果按铃
- **极限模式**: 72 张牌（64 水果 + 8 动物），5 种按铃条件

### 技术栈
| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite + Pinia + Naive UI |
| 后端 | Express + Socket.IO + JWT + lowdb |
| 测试 | Playwright |

---

## 开发命令

### 开发环境
```bash
npm run dev          # 启动后端(7779) + 前端(5173)
npm run dev:server   # 仅后端
npm run dev:client   # 仅前端
```

### 生产环境
```bash
npm run build        # 构建前端
npm start            # 启动生产服务器
```

### 测试
```bash
npm test                    # 所有测试
npm run test:auth          # 认证测试
npm run test:rooms         # 房间测试
npm run test:gameplay      # 游戏流程测试
npm run test:bell          # 按铃测试
npm run test:leaderboard   # 排行榜测试
```

---

## 项目结构

```
halli-galli/
├── server/                      # 后端 (ES modules)
│   ├── index.js                 # 入口: Express + Socket.IO
│   ├── config.js                # 配置: PORT=7779, JWT_SECRET
│   ├── utils/logger.js          # 日志工具
│   ├── auth/                    # 认证模块
│   │   ├── auth.middleware.js   # 注册/登录/JWT
│   │   └── auth.routes.js       # API 路由
│   ├── db/
│   │   ├── store.js             # Database 类 (lowdb)
│   │   └── data.json            # 数据文件
│   ├── game/                    # 游戏逻辑
│   │   ├── room.manager.js      # RoomManager 类
│   │   ├── socket.handlers.js   # Socket.IO 事件
│   │   ├── deck.js              # 牌组生成
│   │   └── bell.validator.js    # 按铃验证
│   └── leaderboard/             # 排行榜
│       ├── score.routes.js      # 分数提交
│       └── leaderboard.routes.js
│
├── client/                      # 前端 (Vue 3)
│   ├── vite.config.js           # Vite 配置
│   └── src/
│       ├── main.js              # Vue 入口
│       ├── App.vue              # 根组件
│       ├── router/index.js      # 路由配置
│       ├── stores/              # Pinia 状态
│       │   ├── auth.js          # 认证状态
│       │   └── socket.js        # Socket 管理
│       ├── services/api.js      # Axios 实例
│       └── views/               # 页面组件
│           ├── LoginView.vue
│           ├── RegisterView.vue
│           ├── HomeView.vue
│           ├── LobbyView.vue
│           └── BattleView.vue
│
├── tests/                       # Playwright 测试
│   ├── halli-galli-auth.spec.js
│   ├── halli-galli-rooms.spec.js
│   ├── halli-galli-gameplay.spec.js
│   ├── halli-galli-bell.spec.js
│   ├── halli-galli-leaderboard.spec.js
│   └── helpers.js
│
├── 需求文档.md                  # 需求规格
├── 未完成功能清单.md            # 功能进度
├── 玩家说明.md                  # 游戏教程
├── AGENTS.md                    # 本文档
└── README.md                    # 项目说明
```

---

## 代码规范

### 语言与模块
- **纯 JavaScript** - 不使用 TypeScript
- **ES Modules** - 所有文件使用 `import/export`
- **服务端导入** - 必须包含 `.js` 扩展名
- **客户端导入** - Vite 自动解析，省略扩展名

### 命名约定

| 元素 | 规范 | 示例 |
|------|------|------|
| 服务器文件 | kebab-case.dot | `auth.middleware.js` |
| Vue 组件 | PascalCase | `BattleView.vue` |
| 类 | PascalCase | `RoomManager` |
| 函数/变量 | camelCase | `handleLogin` |
| 常量 | UPPER_SNAKE_CASE | `JWT_SECRET` |
| Pinia stores | useXxxStore | `useAuthStore` |

### 导入顺序
```javascript
// 1. 外部库
import express from 'express';
import { Server } from 'socket.io';

// 2. 本地模块
import { PORT } from './config.js';
import authRoutes from './auth/auth.routes.js';
```

### 格式化
- 缩进：2 空格
- 分号：必须
- 引号：单引号
- 行宽：~100 字符
- 尾随逗号：多行对象/数组需要

---

## Vue 组件规范

### 使用 `<script setup>`
```vue
<template>
  <div class="page">
    <n-button @click="handleAction" :loading="loading">
      操作
    </n-button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useMessage } from 'naive-ui';
import { useAuthStore } from '../stores/auth';

const message = useMessage();
const authStore = useAuthStore();
const loading = ref(false);

async function handleAction() {
  loading.value = true;
  try {
    // 业务逻辑
  } catch (err) {
    message.error('操作失败');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.page { padding: 24px; }
</style>
```

### Naive UI 使用
- 组件已全局注册，直接使用 `<n-button>` 等
- 暗色主题在 `App.vue` 中全局配置
- 使用 `useMessage()` 显示消息

---

## 错误处理

### 后端路由
```javascript
// 业务逻辑抛出错误
if (!username) {
  throw new Error('用户名不能为空');
}

// 路由捕获错误
router.post('/login', async (req, res) => {
  try {
    const user = await login(username, password);
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});
```

### Socket.IO 事件
```javascript
socket.on('room:create', async (options, callback) => {
  try {
    const room = await roomManager.createRoom(userId, options);
    callback({ success: true, room });
  } catch (err) {
    callback({ success: false, error: err.message });
  }
});
```

### 前端处理
```javascript
const result = await authStore.login(username, password);
if (result.success) {
  message.success('登录成功');
} else {
  message.error(result.error);
}
```

---

## API 响应格式

所有 REST API 返回统一格式：

```javascript
// 成功
{ success: true, user: {...} }

// 失败
{ success: false, error: "错误信息" }
```

---

## 数据库操作

### 使用 Database 类
```javascript
import { db } from './db/store.js';

// 用户操作
await db.addUser(user);
await db.getUserById(id);
await db.updateUser(id, updates);

// 房间操作
await db.addRoom(room);
await db.getRoomById(id);
await db.updateRoom(id, updates);
await db.deleteRoom(id);

// 排行榜
await db.getLeaderboard(limit);
```

---

## Socket.IO 事件

### 房间事件
| 事件 | 参数 | 响应 |
|------|------|------|
| `room:create` | `{name, maxPlayers, enableAnimals}` | `{success, room}` |
| `room:join` | `roomId, playerName` | `{success, room}` |
| `room:leave` | - | `{success}` |
| `room:ready` | - | `{success, room}` |
| `room:start` | - | `{success, room}` |
| `rooms:list` | - | `{success, rooms[]}` |

### 游戏事件
| 事件 | 参数 | 响应 |
|------|------|------|
| `game:play-card` | - | `{success}` |
| `game:bell` | `{cardPlayedTime?}` | `{success, bellValidation}` |
| `game:bell-result` | `{valid, winnerId}` | `{success}` |

---

## 测试编写

### 测试文件命名
`halli-galli-<功能>.spec.js`

### 使用 helpers.js
```javascript
import { registerUser, loginUser, uniqueUser } from './helpers';

test('测试用例', async ({ page }) => {
  const username = uniqueUser('test');
  await registerUser(page, username, 'password123');
  await loginUser(page, username, 'password123');
});
```

### 多玩家测试
```javascript
test('双人对战', async ({ browser }) => {
  const player1 = await browser.newPage();
  const player2 = await browser.newPage();
  
  // 分别登录
  await loginUser(player1, 'user1', 'password');
  await loginUser(player2, 'user2', 'password');
  
  // 测试交互
  // ...
  
  await player1.close();
  await player2.close();
});
```

---

## 端口配置

| 服务 | 端口 | 说明 |
|------|------|------|
| 后端 API | 7779 | Express + Socket.IO |
| 前端开发 | 5173 | Vite dev server |

---

## 环境变量

```bash
PORT=7779                      # 服务器端口
HOST=0.0.0.0                   # 监听地址
JWT_SECRET=your-secret-key     # JWT 密钥（生产环境必须修改）
JWT_EXPIRES_IN=7d              # Token 有效期
LOG_LEVEL=INFO                 # 日志级别
```

---

## 常见问题

### Q: 启动失败？
1. 检查端口 7779 和 5173 是否被占用
2. 确认已安装所有依赖：`npm install && cd client && npm install`

### Q: Socket 连接失败？
1. 检查 Token 是否有效
2. 查看浏览器控制台日志
3. 确认服务器正在运行

### Q: 测试失败？
1. 确保服务器正在运行
2. 清除测试数据：`rm server/db/data.json && touch server/db/data.json`
3. 重新运行测试

---

## Git 提交规范

```bash
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试相关
chore: 构建/工具
```

---

## 相关文档

- [需求文档.md](./需求文档.md) - 完整需求规格
- [未完成功能清单.md](./未完成功能清单.md) - 功能进度
- [玩家说明.md](./玩家说明.md) - 游戏教程
- [README.md](./README.md) - 项目说明

---

**维护者**: 开发团队 | **更新**: 2026-03-20
