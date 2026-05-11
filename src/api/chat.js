/**
 * Chat API | 对话 API
 * 支持 OpenAI 和 Gemini 两种格式
 */

import { request } from '@/utils'

const DEFAULT_BASE_URL = 'https://api.modelverse.cn/v1'
const API_KEY_STORAGE = 'modelverse-api-key'
const BASE_URL_STORAGE = 'modelverse-base-url'

const getApiKey = () => {
  return localStorage.getItem(API_KEY_STORAGE) || ''
}

const getBaseUrl = () => {
  return localStorage.getItem(BASE_URL_STORAGE) || DEFAULT_BASE_URL
}

// 检测是否是 Gemini 模型
const isGeminiModel = (model) => {
  return model && (model.startsWith('gemini') || model.includes('gemini'))
}

// 将 OpenAI messages 格式转换为 Gemini contents 格式
const convertToGeminiFormat = (messages) => {
  const contents = []
  let systemInstruction = null

  for (const msg of messages) {
    // 提取文本内容
    let text = ''
    if (typeof msg.content === 'string') {
      text = msg.content
    } else if (Array.isArray(msg.content)) {
      text = msg.content.map(c => c.text || c.content || '').join('')
    }

    if (msg.role === 'system') {
      systemInstruction = text
    } else {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text }]
      })
    }
  }

  return { contents, systemInstruction }
}

// 从 Gemini 响应中提取文本
const extractGeminiText = (data) => {
  const parts = data?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return ''
  return parts.map(part => part?.text || '').filter(Boolean).join('')
}

// OpenAI 格式的 chunk 解析
const normalizeOpenAIChunk = (parsed) => {
  const delta = parsed?.choices?.[0]?.delta || {}
  return {
    content: delta.content || '',
    reasoning: delta.reasoning_content || delta.reasoning || ''
  }
}

// 对话补全（非流式）
export const chatCompletions = (data) =>
  request({
    url: `/chat/completions`,
    method: 'post',
    data
  })

// 流式对话补全 - 自动检测模型类型
export const streamChatCompletions = async function* (data, signal, options = {}) {
  const apiKey = getApiKey()
  const baseUrl = options.baseUrl || getBaseUrl()
  const model = data.model || ''

  // 统一使用 OpenAI 格式发起请求，渠道中转会自动处理格式转换
  const endpoint = options.endpoint || '/chat/completions'
  
  // 修复：确保 baseUrl 和 endpoint 拼接时路径不重合
  let url = `${baseUrl}${endpoint}`
  if (baseUrl.endsWith('/v1') && endpoint.startsWith('/v1')) {
    url = `${new URL(baseUrl).origin}${endpoint}`
  }
  
  const body = { ...data, stream: true }
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒超时保护

  console.log('[Chat API] Final URL:', url)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      signal: signal || controller.signal
    })
    
    clearTimeout(timeoutId)

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`
      try {
        const errorText = await response.text()
        console.error('[Chat API] OpenAI Error:', errorText)
        const error = JSON.parse(errorText)
        errorMsg = error?.error?.message || error?.message || error?.code_msg || errorMsg
      } catch {}
      throw new Error(errorMsg)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let isFirstChunk = true

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      if (isFirstChunk) {
        console.log('🚀 [Chat API] Stream started - received first chunk')
        isFirstChunk = false
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue

        const dataContent = trimmed.slice(5).trim()
        if (dataContent === '[DONE]') return

        try {
          const parsed = JSON.parse(dataContent)
          const result = normalizeOpenAIChunk(parsed)
          if (result.content || result.reasoning) {
            yield result
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('[Chat API] Request timed out or aborted')
      throw new Error('请求超时，请检查网络或稍后重试')
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}
