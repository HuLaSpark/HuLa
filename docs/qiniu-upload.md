# 七牛云上传功能使用指南

HuLa 现已支持使用七牛云存储服务来上传和存储文件，这为用户提供了更灵活的文件存储选择。本文档将介绍如何在 HuLa 中使用七牛云上传功能。

## 功能特点

- 支持在默认上传方式和七牛云之间切换
- 使用统一的上传接口，便于集成
- 支持大文件上传
- 自动生成唯一文件名，避免文件名冲突
- 支持进度显示（在浏览器环境中）
- 支持多区域上传（华东、华北、华南、北美、东南亚）
- 支持分片上传大文件

## 配置说明

### 七牛云区域设置

七牛云提供了多个存储区域，HuLa 支持根据配置自动选择合适的上传域名：

| 区域代码 | 区域名称 | 上传域名 |
|---------|---------|---------|
| z0 | 华东 | https://upload.qiniup.com |
| z1 | 华北 | https://upload-z1.qiniup.com |
| z2 | 华南 | https://upload-z2.qiniup.com |
| na0 | 北美 | https://upload-na0.qiniup.com |
| as0 | 东南亚 | https://upload-as0.qiniup.com |

默认情况下，如果未指定区域，系统将使用华南区域（z2）。

### 后端配置

后端需要提供以下配置信息：

```json
{
  "token": "七牛云上传凭证",
  "domain": "七牛云存储域名",
  "storagePrefix": "存储前缀",
  "region": "存储区域代码（可选，默认为z2）"
}
```

## 使用方法

### 在代码中使用

```typescript
import { useUpload, UploadProviderEnum } from '@/hooks/useUpload'
import { UploadSceneEnum } from '@/enums'

// 创建上传hook实例
const uploadHook = useUpload()

// 使用七牛云上传
async function uploadToQiniu(filePath: string) {
  try {
    // 获取上传和下载URL
    const result = await uploadHook.getUploadAndDownloadUrl(filePath, {
      provider: UploadProviderEnum.QINIU,
      scene: UploadSceneEnum.CHAT
    })
    
    // 执行上传
    await uploadHook.doUpload(filePath, result.uploadUrl, result)
    
    console.log('上传成功，下载地址:', result.downloadUrl)
    return result.downloadUrl
  } catch (error) {
    console.error('上传失败:', error)
    throw error
  }
}

// 使用默认上传方式
async function uploadWithDefault(filePath: string) {
  try {
    // 获取上传和下载URL
    const result = await uploadHook.getUploadAndDownloadUrl(filePath, {
      provider: UploadProviderEnum.DEFAULT,
      scene: UploadSceneEnum.CHAT
    })
    
    // 执行上传
    await uploadHook.doUpload(filePath, result.uploadUrl, { downloadUrl: result.downloadUrl })
    
    console.log('上传成功，下载地址:', result.downloadUrl)
    return result.downloadUrl
  } catch (error) {
    console.error('上传失败:', error)
    throw error
  }
}
```

### 使用分片上传

对于大文件上传，HuLa 现在支持使用七牛云的分片上传功能，可以提高上传成功率和性能：

```typescript
import { useUpload, UploadProviderEnum } from '@/hooks/useUpload'
import { UploadSceneEnum } from '@/enums'

// 创建上传hook实例
const uploadHook = useUpload()

// 使用七牛云分片上传
async function uploadLargeFileToQiniu(filePath: string) {
  try {
    // 获取上传和下载URL
    const result = await uploadHook.getUploadAndDownloadUrl(filePath, {
      provider: UploadProviderEnum.QINIU,
      scene: UploadSceneEnum.CHAT
    })
    
    // 执行分片上传，指定使用分片上传和分片大小（可选，默认4MB）
    await uploadHook.doUpload(filePath, result.uploadUrl, {
      ...result,
      useChunks: true,
      chunkSize: 4 * 1024 * 1024 // 4MB，可根据需要调整
    })
    
    console.log('分片上传成功，下载地址:', result.downloadUrl)
    return result.downloadUrl
  } catch (error) {
    console.error('分片上传失败:', error)
    throw error
  }
}
```

分片上传参数说明：

| 参数名 | 类型 | 说明 |
|-------|------|------|
| useChunks | boolean | 是否使用分片上传，设置为true启用分片上传 |
| chunkSize | number | 分片大小，单位为字节，默认为4MB (4 * 1024 * 1024) |

当文件大小超过设定的分片大小时，系统会自动将文件分成多个块进行上传，并在上传完成后自动合并。

### 在消息策略中使用

HuLa 的消息策略已集成七牛云上传功能，可以通过传递 `provider` 选项来指定使用哪种上传方式：

```typescript
import { messageStrategyMap } from '@/strategy/MessageStrategy'
import { MsgEnum } from '@/enums'
import { UploadProviderEnum } from '@/hooks/useUpload'

// 获取图片消息策略
const imageStrategy = messageStrategyMap[MsgEnum.IMAGE]

// 使用七牛云上传
async function uploadImageWithQiniu(path: string) {
  const result = await imageStrategy.uploadFile(path, {
    provider: UploadProviderEnum.QINIU
  })
  
  // 执行上传
  await imageStrategy.doUpload(path, result.uploadUrl, result)
  
  return result.downloadUrl
}

// 使用七牛云分片上传大图片
async function uploadLargeImageWithQiniu(path: string) {
  const result = await imageStrategy.uploadFile(path, {
    provider: UploadProviderEnum.QINIU
  })
  
  // 执行分片上传
  await imageStrategy.doUpload(path, result.uploadUrl, {
    ...result,
    useChunks: true,
    chunkSize: 2 * 1024 * 1024 // 2MB分片
  })
  
  return result.downloadUrl
}
```

## 分片上传原理与优势

七牛云分片上传功能基于七牛云的分块上传API实现，主要流程如下：

1. 将大文件分割成固定大小的数据块
2. 使用 `/mkblk/<blocksize>` 接口上传第一个数据块
3. 使用 `/bput/<ctx>/<offset>` 接口上传后续数据块
4. 所有分片上传完成后，使用 `/mkfile/<filesize>/key/<encodedKey>` 接口将所有数据块合并成完整文件

分片上传的主要优势：

- **支持断点续传**：上传中断后可以从已上传的部分继续
- **提高上传成功率**：大文件分成小块上传，减少单次传输失败的风险
- **优化网络利用率**：可以更好地利用网络带宽
- **提供上传进度反馈**：可以精确显示每个分片的上传进度

建议在以下情况使用分片上传：
- 上传大于10MB的文件
- 网络环境不稳定
- 需要显示精确上传进度的场景

## 配置七牛云

要使用七牛云上传功能，需要在后端配置七牛云的相关参数：

1. 在七牛云控制台创建存储空间（Bucket）
2. 获取 AccessKey 和 SecretKey
3. 配置后端服务，实现获取上传 Token 的接口

后端需要提供以下接口：

```
GET /api/qiniu/token
```

返回格式：

```json
{
  "token": "七牛云上传Token",
  "domain": "七牛云存储域名",
  "storagePrefix": "存储前缀"
}
```

## 测试方法

1. 在七牛云控制台创建存储空间（Bucket）
2. 获取 AccessKey 和 SecretKey
3. 配置后端服务，实现获取上传 Token 的接口
4. 使用 HuLa 提供的上传接口进行测试

## 注意事项

1. 七牛云上传需要有效的 Token，Token 有时效性，过期后需要重新获取
2. 上传大文件时，请确保网络稳定
3. 在生产环境中，建议配置 HTTPS 域名，确保数据传输安全
4. 七牛云存储有容量和流量限制，请根据实际需求选择合适的套餐
5. 分片上传时，建议根据网络环境和文件大小调整分片大小，一般推荐1MB-4MB
6. 对于特别大的文件（如视频），强烈建议使用分片上传功能
