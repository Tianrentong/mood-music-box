# 手机版 - 开发计划

## Step 1: 创建基础文件
- index.html / style.css / app.js / api.js
- 基于网页版代码，修改 API 地址为 Railway

## Step 2: 测试 API 连通性
- 手机浏览器访问 Railway API 测试
- 确认搜索、播放链接、歌词都能正常返回

## Step 3: 调试播放功能
- 确认 Railway 能返回播放直链
- 如果直链不稳定，加入 iframe 备用方案

## Step 4: PWA 配置
- manifest.json（全屏、图标、主题色）
- service worker（离线缓存核心页面）

## Step 5: 打包 APK
- 上传到 PWABuilder
- 生成 APK 下载
- 手机安装测试

## Step 6: 优化
- 适配手机屏幕
- 处理 Railway 冷启动（loading 提示）
- 测试各功能完整性
