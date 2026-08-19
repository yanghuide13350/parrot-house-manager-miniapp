# Parrot Pro 微信小程序

## 本地配置

1. 使用微信开发者工具直接打开 `miniprogram/` 目录。
2. 按 [../worker/README.md](../worker/README.md) 部署 Cloudflare Worker。
3. 将 Worker 自定义 HTTPS 域名填入 `config.ts`。
4. 执行 `npm run build:miniapp`，生成开发者工具实际加载的 JavaScript。
5. 执行 `npm run check:backend` 和 `npm run check:miniapp`。

小程序使用 `wx.login` 登录，服务端调用微信 `code2Session` 获取 OpenID。Storage 只保存服务器签发的会话和最近一次成功读取的主账号快照；所有业务写入必须由 Worker 成功提交后才更新页面。

## 验收命令

```bash
npm run build:miniapp
npm run check:backend
npm run check:miniapp
npx tsc --noEmit
npm run build
```

真机验收至少覆盖登录、无权限账号、新增/编辑、配对/拆对、孵化、售出/退货、回访、分享、图片上传和弱网失败。
