# 配置文件说明

## 概述

HuLa 使用 YAML 格式的配置文件来管理不同环境的设置。配置文件位于 `src-tauri/configuration/` 目录下。

## 配置文件结构

```
src-tauri/configuration/
├── base.yaml              # 基础配置，指定活动环境
├── local.yaml             # 本地开发环境配置（被 .gitignore 忽略）
├── local.yaml.example     # 本地配置示例文件
└── production.yaml        # 生产环境配置
```

## 首次使用

1. **复制示例配置文件**：
   ```bash
   cd src-tauri/configuration
   cp local.yaml.example local.yaml
   ```

2. **修改配置**（可选）：
   - 如果你有本地后端服务，编辑 `local.yaml` 修改 `base_url` 和 `ws_url`
   - 默认配置指向生产环境服务器

## 配置项说明

### database
- `sqlite_file`: SQLite 数据库文件名，默认为 `db.sqlite`

### backend
- `base_url`: 后端 API 服务地址
  - 必须以 `http://` 或 `https://` 开头
  - 示例：`http://localhost:8080/api`（本地）或 `https://hulaspark.com/api`（生产）
  
- `ws_url`: WebSocket 服务地址
  - 必须以 `ws://` 或 `wss://` 开头
  - 示例：`ws://localhost:8080/api/ws/ws`（本地）或 `wss://hulaspark.com/api/ws/ws`（生产）

## 环境切换

在 `base.yaml` 中修改 `active_config` 来切换环境：

```yaml
# 使用本地配置
active_config: local

# 或使用生产配置
active_config: production
```

## 配置验证

应用启动时会自动验证配置的完整性：

- ✅ 检查配置文件是否存在
- ✅ 验证 URL 格式是否正确
- ✅ 确保所有必需字段都已配置
- ❌ 如果配置无效，应用会显示详细的错误信息

## 常见问题

### Q: 为什么 `local.yaml` 不在 Git 中？
A: `local.yaml` 被 `.gitignore` 忽略，因为它包含本地特定的配置。每个开发者可以根据自己的环境自定义此文件。

### Q: 注册时提示"网络连接失败"？
A: 请检查：
1. `local.yaml` 文件是否存在（从 `local.yaml.example` 复制）
2. `backend.base_url` 是否可访问
3. 网络连接是否正常

### Q: 如何配置本地后端服务？
A: 编辑 `local.yaml`：
```yaml
backend:
  base_url: http://localhost:8080/api
  ws_url: ws://localhost:8080/api/ws/ws
```

## 环境变量覆盖

可以使用环境变量覆盖配置文件中的设置：

```bash
# 格式：APP__{section}__{key}
export APP__BACKEND__BASE_URL=http://localhost:8080/api
export APP__BACKEND__WS_URL=ws://localhost:8080/api/ws/ws
```

## 相关问题

如遇到配置相关问题，请参考：
- [Issue #533](https://github.com/HuLaSpark/HuLa/issues/533) - 注册显示"服务器异常"
- [Issue #508](https://github.com/HuLaSpark/HuLa/issues/508) - 无法接收验证码
- [Issue #452](https://github.com/HuLaSpark/HuLa/issues/452) - VPN切换导致连接错误
