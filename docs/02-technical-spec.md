# 手机版 - 技术方案

## 架构

```
┌────────────────────────────────────┐
│          手机 APK (PWA)             │
│  ┌──────────────────────────────┐  │
│  │   HTML + CSS + JS (前端)     │  │
│  │   - index.html               │  │
│  │   - app.js / api.js          │  │
│  └──────────┬───────────────────┘  │
│             │ fetch()               │
└─────────────┼──────────────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
    ▼                   ▼
┌──────────┐    ┌──────────────┐
│ DeepSeek │    │ Railway 网易云│
│   API    │    │    API       │
│ (公网)   │    │  (公网)      │
└──────────┘    └──────────────┘
```

## 关键决策

### 1. 为什么用 Railway 而不是本地 API
- 手机无法运行 Node.js 服务器
- Railway 免费，24小时在线
- API 调用走 HTTPS，安全

### 2. 为什么用 PWA 打包而不是原生开发
- 不需要学 Android 开发
- 一套代码，网页版和手机版共用
- PWABuilder 免费打包成 APK

### 3. Railway 可能的问题和应对
- Railway 免费版有冷启动（首次请求较慢）
- 应对：前端加 loading 提示，给用户心理预期
- 如果 Railway 不稳定，可切换到其他平台（Render、自建 VPS）

## 打包流程

```
源代码 → PWA 配置 → PWABuilder → APK 文件 → 手机安装
```

## 文件结构

```
mobile-app/
├── index.html
├── style.css
├── app.js
├── api.js          (API_BASE = Railway 地址)
├── manifest.json   (PWA 配置)
├── sw.js           (离线缓存)
├── docs/
│   ├── 01-requirements.md
│   ├── 02-technical-spec.md
│   └── 03-dev-plan.md
└── dev-logs/
    └── 2026-06-16.md
```
