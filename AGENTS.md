# AGENTS.md - Development Guidelines

## Project Overview

Halli Galli Extreme (德国心脏病新增版) - LAN multiplayer card game with two modes:
- **Classic**: 60 cards, 5-of-a-kind bell condition only
- **Extreme**: 72 cards (64 fruit + 8 animal), 5 bell conditions

JavaScript only (no TypeScript). Vue 3 + Express + Socket.IO stack.

## Commands

### Development
```bash
npm run dev          # Start both server (port 7779) and client (Vite, port 5173)
npm run dev:server   # Backend only (Express + Socket.IO on port 7779)
npm run dev:client   # Frontend only (Vite dev server, proxies /api and /socket.io to 7779)
```

### Production
```bash
npm run build        # Build client to /client/dist
npm start            # Start production server (serves built client + API)
```

### Testing
Playwright for end-to-end tests.

```bash
npm test                # Run all tests
npm run test:auth       # Authentication tests
npm run test:rooms      # Room management tests
npm run test:bell       # Bell validation tests (both modes)
npm run test:penalty    # Penalty system tests
npm run test:game-flow  # Full game flow tests
```

Test files in `tests/`:
- `auth.spec.js` — Registration and login
- `single-player.spec.js` — Single player game flow
- `battle.spec.js` — Multiplayer battle mode
- `leaderboard.spec.js` — Score submission and leaderboard
- `helpers.js` — Shared test utilities

### Linting / Formatting
No ESLint, Prettier, or EditorConfig is configured. Follow conventions below.

## Architecture
```
server/                          # Express + Socket.IO backend (ES modules)
  index.js                       # Entry: Express app, HTTP server, Socket.IO, static serving
  config.js                      # PORT (7778), HOST, JWT_SECRET, JWT_EXPIRES_IN, DATA_FILE
  auth/
    auth.middleware.js            # register(), login(), verifyToken(), authMiddleware
    auth.routes.js               # POST /api/auth/register, POST /api/auth/login
  db/
    store.js                     # Database class wrapping lowdb (users + rooms)
    data.json                    # Flat-file JSON database (auto-generated, committed)
  game/
    room.manager.js              # RoomManager class (room lifecycle)
    socket.handlers.js           # Socket.IO event handlers (room:*, game:*)
  leaderboard/
    score.routes.js              # POST /api/scores (auth required)
    leaderboard.routes.js        # GET /api/leaderboard

client/                          # Vue 3 frontend (Vite)
  vite.config.js                 # Vue plugin, dev proxy to port 7778
  src/
    main.js                      # createApp, Pinia, Router, Naive UI (global)
    App.vue                      # Root: dark theme provider, message/dialog providers
    views/                       # All page components (Login, Register, Home, Single, Lobby, Battle)
    stores/                      # Pinia stores (auth.js, socket.js)
    game/                        # TetrisEngine, TetrisRenderer, constants
    router/index.js              # Vue Router with auth guards
    services/api.js              # Axios instance with JWT interceptor
```

## Code Style

### Language & Modules
- **JavaScript only** — no TypeScript anywhere.
- ES modules throughout (`"type": "module"` in both package.json files).
- Modern JS features are used: `crypto.randomUUID()`, optional chaining, nullish coalescing.

### Naming Conventions
| Element             | Convention       | Examples                                  |
|---------------------|------------------|-------------------------------------------|
| Server files        | kebab-case.dot   | `auth.middleware.js`, `room.manager.js`   |
| Vue components      | PascalCase       | `BattleView.vue`, `LoginView.vue`         |
| Classes             | PascalCase       | `TetrisEngine`, `RoomManager`, `Database` |
| Functions/variables | camelCase        | `handleLogin`, `createRoom`               |
| Constants           | UPPER_SNAKE_CASE | `BOARD_WIDTH`, `JWT_SECRET`, `SCORES`     |
| Pinia stores        | `useXxxStore`    | `useAuthStore`, `useSocketStore`          |

### Imports
- External libraries first, blank line, then local modules.
- **Server-side:** include `.js` extension on all local imports.
- **Client-side (Vite):** omit extension for `.js` and `.vue` files (Vite resolves them).
- Default exports for route modules and classes; named exports for utilities.

```javascript
// Server example
import express from 'express';
import { Server } from 'socket.io';

import { PORT, HOST } from './config.js';
import authRoutes from './auth/auth.routes.js';

// Client example
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

import { useAuthStore } from '../stores/auth';
import TetrisEngine from '../game/engine';
```

### Formatting
- **Indentation**: 2 spaces (no tabs)
- **Semicolons**: always
- **Quotes**: single quotes for JS strings
- **Line length**: ~100 characters
- **Trailing commas**: yes, in multi-line objects/arrays

### Vue Components
- Always use `<script setup>` syntax with Composition API.
- Use `ref`, `reactive`, `computed`, `onMounted`, `onUnmounted`.
- Scoped styles via `<style scoped>`.
- Naive UI components are globally registered — use directly in templates (e.g. `<n-button>`).
- Dark theme is applied globally in App.vue.

```vue
<template>
  <div class="page">
    <n-card title="标题">
      <n-button @click="handleAction" :loading="loading">操作</n-button>
    </n-card>
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
    // ...
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

### Pinia Stores
- Setup function syntax (not options syntax).
- Persist to `localStorage` manually where needed.

```javascript
export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'));
  const token = ref(localStorage.getItem('token') || null);
  const isAuthenticated = computed(() => !!token.value);
  async function login(username, password) { /* ... */ }
  return { user, token, isAuthenticated, login };
});
```

### Error Handling

**Backend routes** — throw in business logic, catch in route handler:
```javascript
// Business logic (auth.middleware.js)
if (!username || !password) {
  throw new Error('用户名和密码不能为空');
}

// Route handler (auth.routes.js)
try {
  const user = await register(username, password);
  res.json({ success: true, user });
} catch (err) {
  res.status(400).json({ success: false, error: err.message });
}
```

**Socket.IO handlers** — use callback pattern:
```javascript
socket.on('room:create', async (options, callback) => {
  try {
    const room = await roomManager.createRoom(socket.user.userId, options);
    callback({ success: true, room });
  } catch (err) {
    callback({ success: false, error: err.message });
  }
});
```

**Frontend** — check `response.success`, show via Naive UI `message`:
```javascript
const result = await authStore.login(username, password);
if (result.success) {
  message.success('登录成功');
  router.push('/');
} else {
  message.error(result.error || '登录失败');
}
```

### API Response Shape
All REST endpoints return `{ success: boolean, error?: string, ...data }`.
The Axios wrapper in `client/src/services/api.js` handles token injection and error normalization.

### Database
- **lowdb** with JSON flat file at `server/db/data.json`.
- All access goes through `server/db/store.js` (`Database` class) — never use lowdb directly.
- Database file is committed to the repo.

### Socket.IO
- Event names use colon-separated namespaces: `room:create`, `room:join`, `game:update`, `player:ready`.
- All handlers validate auth via `socket.user` (set by `socketAuthMiddleware`).
- Callbacks always return `{ success: boolean }` shape.

### User-Facing Text
- All UI labels, error messages, and comments are in **Chinese**.
- Commit messages may be in Chinese or English.

### Git
- Do not commit `node_modules/`, `client/dist/`, or `*.log` files.
- Port 7778 must be free before starting the server.

## Key Dependencies
- **Backend**: express ^4.18, socket.io ^4.6, jsonwebtoken ^9, bcryptjs ^2.4, lowdb ^7
- **Frontend**: vue ^3.4, pinia ^2.1, vue-router ^4.2, naive-ui ^2.38, socket.io-client ^4.6, axios ^1.6
- **Build**: vite 5, @vitejs/plugin-vue 4.5, concurrently ^8.2
