# AI 流式数据接入实现文档

## 概述

本文档描述了 AI 流式数据接入功能的实现，该功能通过 HTTP 请求建立 SSE (Server-Sent Events) 连接，实时接收 AI 返回的流式数据。

## 实现架构

### 1. 后端 (Rust/Tauri)

#### 文件位置
- `src-tauri/src/command/ai_command.rs` - AI 命令处理
- `src-tauri/Cargo.toml` - 添加了 `reqwest-eventsource` 依赖

#### 核心功能
- **命令**: `ai_message_send_stream`
- **功能**: 
  1. 发送 HTTP POST 请求到 AI 服务器
  2. 建立 SSE 连接
  3. 监听流式数据
  4. 通过 Tauri 事件系统将数据发送到前端

#### 事件类型
```rust
pub struct SseStreamEvent {
    pub event_type: String,  // "chunk" | "done" | "error"
    pub data: Option<String>,
    pub error: Option<String>,
    pub request_id: String,
}
```

#### 工作流程
1. 接收前端请求参数（conversationId, content, useContext）
2. 使用 `reqwest` 发送 HTTP POST 请求
3. 使用 `reqwest-eventsource` 建立 SSE 连接
4. 在后台任务中监听 SSE 事件流
5. 每收到一个数据块，发送 `chunk` 事件到前端
6. 流结束时，发送 `done` 事件
7. 出错时，发送 `error` 事件

### 2. 前端 (Vue/TypeScript)

#### 文件位置
- `src/utils/ImRequestUtils.ts` - 流式 API 封装
- `src/plugins/robot/views/Chat.vue` - AI 聊天界面
- `src/enums/index.ts` - 添加了 `AI_MESSAGE_SEND_STREAM` 命令枚举

#### 核心功能
- **函数**: `messageSendStream`
- **特点**:
  1. 使用 Promise 包装整个 SSE 流程
  2. 监听 Tauri 的 `ai-stream-event` 事件
  3. 提供回调函数支持（onChunk, onDone, onError）
  4. 流结束后 resolve Promise

#### 使用示例
```typescript
const fullResponse = await messageSendStream(
  {
    conversationId: 'chat-123',
    content: '你好，AI',
    useContext: true
  },
  {
    onChunk: (chunk: string) => {
      // 实时接收数据块
      console.log('收到数据:', chunk)
    },
    onDone: (fullContent: string) => {
      // 流结束
      console.log('完整内容:', fullContent)
    },
    onError: (error: string) => {
      // 错误处理
      console.error('错误:', error)
    }
  }
)
```

## 数据流向

```
前端 (Chat.vue)
  ↓ 调用 messageSendStream()
  ↓
前端 (ImRequestUtils.ts)
  ↓ invoke(AI_MESSAGE_SEND_STREAM)
  ↓
后端 (ai_command.rs)
  ↓ 发送 HTTP POST 请求
  ↓
AI 服务器
  ↓ 建立 SSE 连接
  ↓ 返回流式数据
  ↓
后端 (ai_command.rs)
  ↓ emit('ai-stream-event', chunk)
  ↓
前端 (ImRequestUtils.ts)
  ↓ listen('ai-stream-event')
  ↓ 触发回调 onChunk()
  ↓ 累积数据
  ↓ 流结束时 resolve(fullContent)
  ↓
前端 (Chat.vue)
  ↓ 显示完整响应
```

## 关键特性

### 1. 同步监听
- HTTP 请求发送后，立即在 Rust 后端建立 SSE 连接
- 使用 `tokio::spawn` 在后台异步处理流式数据
- 不阻塞主线程

### 2. 事件驱动
- 使用 Tauri 的事件系统进行前后端通信
- 通过 `request_id` 区分不同的请求
- 支持多个并发请求

### 3. Promise 包装
- 前端使用 Promise 包装整个流程
- 流结束时自动 resolve
- 出错时自动 reject
- 支持 async/await 语法

### 4. 回调支持
- `onChunk`: 实时接收数据块，可用于 UI 更新
- `onDone`: 流结束时调用
- `onError`: 错误处理

## 测试步骤

### 1. 编译项目
```bash
# 安装依赖
cd src-tauri
cargo build

# 或者直接运行
npm run tauri dev
```

### 2. 测试流程
1. 打开应用
2. 进入 ChatBot 窗口（robot 插件）
3. 选择一个 AI 模型
4. 输入消息并发送
5. 观察控制台输出：
   - 应该看到 "🚀 开始发送AI消息"
   - 应该看到 "📨 收到AI流式数据块" (多次)
   - 应该看到 "✅ AI流式响应完成"
   - 应该看到 "✅ AI消息发送成功"

### 3. 验证点
- [ ] HTTP 请求成功发送
- [ ] SSE 连接成功建立
- [ ] 能够接收流式数据块
- [ ] 数据块正确传递到前端
- [ ] Promise 在流结束后正确 resolve
- [ ] 错误情况下 Promise 正确 reject
- [ ] 多个并发请求互不干扰

## 注意事项

### 1. 窗口 Label
- AI 聊天窗口的 label 是 `robot`
- 事件会发送到所有窗口，通过 `request_id` 过滤

### 2. 错误处理
- 网络错误会触发 `error` 事件
- SSE 连接关闭会触发 `done` 事件
- 需要区分正常结束和异常结束

### 3. 内存管理
- 每个请求都会创建一个后台任务
- 任务在流结束后自动清理
- 前端监听器在 Promise resolve/reject 后自动取消

### 4. 并发请求
- 使用唯一的 `request_id` 区分不同请求
- 支持多个并发流式请求
- 每个请求独立处理，互不影响

## 后续优化建议

1. **UI 实时更新**: 在 `onChunk` 回调中实时更新聊天界面，显示 AI 正在输出的内容
2. **取消请求**: 添加取消流式请求的功能
3. **重试机制**: 添加自动重试机制
4. **进度指示**: 添加更详细的进度指示
5. **错误分类**: 区分不同类型的错误（网络错误、服务器错误等）
6. **性能优化**: 对于大量数据块，考虑批量处理

## 相关文件清单

### Rust 后端
- `src-tauri/src/command/ai_command.rs` (新建)
- `src-tauri/src/command/mod.rs` (修改)
- `src-tauri/src/lib.rs` (修改)
- `src-tauri/Cargo.toml` (修改)

### 前端
- `src/utils/ImRequestUtils.ts` (修改)
- `src/plugins/robot/views/Chat.vue` (修改)
- `src/enums/index.ts` (修改)

## 技术栈

- **后端**: Rust, Tauri, reqwest, reqwest-eventsource, tokio
- **前端**: Vue 3, TypeScript, Tauri API
- **通信**: Tauri Event System, SSE (Server-Sent Events)

