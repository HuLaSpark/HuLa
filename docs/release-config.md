# 发布流程中的生产配置注入说明

在 GitHub Actions 的 release 流程（`.github/workflows/release.yml`）里，打包前会自动生成 `src-tauri/configuration/production.yaml`，将密钥写入其中。需要在仓库的 **Settings → Secrets and variables → Actions** 中配置以下 Secrets：

- `YOUDAO_APP_KEY`
- `YOUDAO_APP_SECRET`
- `TENCENT_API_KEY`
- `TENCENT_SECRET_ID`
- `TENCENT_MAP_KEY`

工作流会在 `publish-tauri` 任务中执行：

```bash
mkdir -p src-tauri/configuration
cat > src-tauri/configuration/production.yaml <<'EOF'
youdao:
  app_key: "${YOUDAO_APP_KEY}"
  app_secret: "${YOUDAO_APP_SECRET}"
tencent:
  api_key: "${TENCENT_API_KEY}"
  secret_id: "${TENCENT_SECRET_ID}"
  map_key: "${TENCENT_MAP_KEY}"
EOF
```

配置完成后，推送符合规则的标签（如 `v1.2.3`）触发发布时，以上内容会被写入生产配置文件参与打包，无需将密钥提交到仓库。***
