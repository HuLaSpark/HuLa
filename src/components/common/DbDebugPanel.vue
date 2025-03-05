<template>
  <div class="db-debug-panel">
    <h2>数据库调试面板</h2>

    <div class="actions">
      <button @click="runDiagnostics">运行诊断</button>
      <button @click="insertTestMessage">插入测试消息</button>
      <button @click="checkMessages">查看消息数据</button>
      <button @click="clearLogs">清空日志</button>
    </div>

    <div v-if="diagnosticResults" class="results">
      <h3>诊断结果</h3>
      <pre>{{ JSON.stringify(diagnosticResults, null, 2) }}</pre>
    </div>

    <div v-if="messagesData" class="messages-data">
      <h3>消息数据 ({{ messagesData }} 条)</h3>
      <pre>{{ JSON.stringify(messagesData, null, 2) }}</pre>
    </div>

    <div class="logs">
      <h3>日志</h3>
      <div class="log-entries">
        <div v-for="(log, index) in logs" :key="index" :class="['log-entry', log.type]">
          <span class="timestamp">{{ log.timestamp }}</span>
          <span class="message">{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DbDiagnostics } from '@/db/DbDiagnostics'
import { getDbConnection } from '@/db/database'

interface LogEntry {
  timestamp: string
  message: string
  type: 'info' | 'error' | 'success'
}

const logs = ref<LogEntry[]>([])
const diagnosticResults = ref(null)
const messagesData = ref(null)

// 添加日志
const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
  const timestamp = new Date().toLocaleTimeString()
  logs.value.unshift({ timestamp, message, type })
}

// 清空日志
const clearLogs = () => {
  logs.value = []
}

// 运行诊断
const runDiagnostics = async () => {
  try {
    addLog('开始运行数据库诊断...', 'info')
    diagnosticResults.value = (await DbDiagnostics.runDiagnostics()) as any
    addLog('诊断完成', 'success')
  } catch (err) {
    addLog(`诊断失败: ${err}`, 'error')
  }
}

// 插入测试消息
const insertTestMessage = async () => {
  try {
    addLog('开始插入测试消息...', 'info')
    const result = await DbDiagnostics.insertTestMessage()
    if (result) {
      addLog('测试消息插入成功', 'success')
    } else {
      addLog('测试消息插入失败', 'error')
    }
  } catch (err) {
    addLog(`插入测试消息失败: ${err}`, 'error')
  }
}

// 查看消息数据
const checkMessages = async () => {
  try {
    addLog('正在查询消息数据...', 'info')
    const db = await getDbConnection()
    const results = await db.select(`
      SELECT m.id, m.room_id, m.from_uid, m.type, m.status, 
             m.body, m.created_at, u.name as user_name
      FROM messages m
      LEFT JOIN users u ON m.from_uid = u.uid
      ORDER BY m.created_at DESC LIMIT 10
    `)
    messagesData.value = results as any
    addLog(`查询完成，获取到 ${results} 条消息`, 'success')
  } catch (err) {
    addLog(`查询消息失败: ${err}`, 'error')
  }
}

// 在组件挂载时添加初始日志
onMounted(() => {
  addLog('数据库调试面板已加载', 'info')
})
</script>

<style scoped>
.db-debug-panel {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 16px;
  margin: 16px;
  font-family: Arial, sans-serif;
}

h2 {
  margin-top: 0;
  color: #333;
}

.actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

button {
  background: #4a90e2;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background: #3a80d2;
}

.results,
.messages-data {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 16px;
  overflow: auto;
  max-height: 300px;
}

pre {
  margin: 0;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
}

.logs {
  background: #222;
  color: #eee;
  border-radius: 4px;
  padding: 8px;
  max-height: 200px;
  overflow: auto;
}

.log-entries {
  font-family: monospace;
  font-size: 12px;
}

.log-entry {
  margin-bottom: 4px;
  line-height: 1.4;
}

.timestamp {
  color: #888;
  margin-right: 8px;
}

.info {
  color: #aaddff;
}

.error {
  color: #ff6b6b;
}

.success {
  color: #69db7c;
}
</style>
