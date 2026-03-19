# 🎮 Tetris PK 游戏 - 完整监控系统

## 📋 系统组件

### 前端组件

| 文件 | 位置 | 功能 |
|------|------|------|
| `error_monitor.js` | `public/js/` | 错误捕获和上报 |
| `tetris-pk.js` | `public/js/` | 游戏逻辑 |

### 后端组件

| 文件 | 功能 |
|------|------|
| `server.py` | 主服务器 + 错误处理集成 |
| `error_logger.py` | 日志记录和 7 天轮转 |
| `auto_fix.py` | 自动修复引擎 |
| `browser_sync.py` | 浏览器自动刷新 |
| `health_monitor.py` | 持续健康监控 |

## 🔄 工作流程

```
1. 浏览器发生错误
       ↓
2. error_monitor.js 捕获 (window.onerror / console.error / promise)
       ↓
3. Socket.IO 发送到 server.py (client_error 事件)
       ↓
4. error_logger.py 记录到终端 + error.log
       ↓
5. auto_fix.py 分析并自动修复
       ↓
6. 验证修复 (node --check / python -m py_compile)
       ↓
7. 修复成功 → browser_sync.py 推送刷新通知
       ↓
8. health_monitor.py 持续监控 (每 30 秒)
```

## 🚀 使用方法

### 启动服务器

```bash
cd /Users/jieanwang/codehouse/tetris-game
conda activate tetris
python server.py
```

### 访问游戏

- **本地**: http://localhost:7778
- **局域网**: http://192.168.1.6:7778

## 📊 监控仪表板

系统会每分钟自动打印监控仪表板：

```
═══════════════════════════════════════════════════════════
║           🎮 Tetris PK 健康监控中心                        ║
═══════════════════════════════════════════════════════════
║ 🟢 服务器状态：运行中 (端口 7778)
║ ⏱️  运行时间：00:45:32
║ 🔍 健康检查：90 次
───────────────────────────────────────────────────────────
║ 错误统计 (最近 1 小时):
║   总错误数：3
║   已修复：3 (100.0%)
║   待修复：0
║   错误率：0.5/分钟
───────────────────────────────────────────────────────────
║ 问题检测：0 次
═══════════════════════════════════════════════════════════
```

## 🔧 自动修复功能

### 前端 JS 错误修复

| 错误类型 | 修复策略 |
|----------|----------|
| `X is not a function` | 从备份恢复方法或生成存根 |
| `Unexpected token ')'` | 删除多余括号 |
| `Unexpected token '{'` | 平衡括号 |
| `Cannot read property` | 添加空值检查 |
| `X is not defined` | 检查拼写，从上下文恢复 |

### 后端 Python 错误修复

| 错误类型 | 修复策略 |
|----------|----------|
| `SyntaxError` | ast 分析 + 自动修复 |
| `ImportError` | 自动安装缺失包 |
| `IndentationError` | autopep8 格式化 |
| `NameError` | 检查变量定义 |

## 📁 日志文件

| 文件 | 内容 | 保留时间 |
|------|------|----------|
| `error.log` | 所有错误记录 | 7 天 |
| `fix_history.log` | 修复历史记录 | 7 天 |
| `.backups/` | 自动备份文件 | 最近 10 个 |

## ⚙️ 配置选项

在 `error_logger.py` 中可配置：

```python
ErrorLogger(
    log_dir='.',          # 日志目录
    retention_days=7      # 日志保留天数
)
```

在 `health_monitor.py` 中可配置：

```python
HealthMonitor(
    port=7778,                    # 服务器端口
    error_rate_threshold=10,      # 错误率告警阈值 (每分钟)
    consecutive_error_threshold=5 # 连续相同错误告警
)
```

## 🎯 特性

- ✅ **自动错误捕获**: 拦截所有前端错误
- ✅ **自动修复**: 前后端错误自动修复
- ✅ **自动刷新**: 修复后自动通知浏览器刷新
- ✅ **持续监控**: 每 30 秒健康检查
- ✅ **日志轮转**: 7 天自动清理
- ✅ **彩色输出**: 终端彩色日志
- ✅ **备份保护**: 修复前自动备份

## 🐛 故障排除

### 错误未被捕获

检查 `error_monitor.js` 是否正确加载：
```javascript
// 浏览器控制台
console.log(window.errorMonitor);
```

### 自动修复失败

查看 `fix_history.log` 了解修复详情：
```bash
cat fix_history.log
```

### 监控仪表板不显示

检查 `health_monitor.py` 是否启动：
```bash
ps aux | grep health_monitor
```

## 📞 支持

如有问题，查看以下日志：
- `error.log` - 错误详情
- `fix_history.log` - 修复记录
- 终端输出 - 实时监控
