/**
 * HTTP Request Utility | HTTP 请求工具
 * 简化版 - 固定使用 ModelVerse API
 */

import axios from 'axios'

const DEFAULT_BASE_URL = 'https://api.modelverse.cn/v1'
const API_KEY_STORAGE = 'modelverse-api-key'
const BASE_URL_STORAGE = 'modelverse-base-url'

// Create axios instance | 创建 axios 实例
const instance = axios.create({
  baseURL: DEFAULT_BASE_URL,
  timeout: 300000
})

// Request interceptor | 请求拦截器
instance.interceptors.request.use(
  (config) => {
    const apiKey = localStorage.getItem(API_KEY_STORAGE) || ''
    const baseUrl = localStorage.getItem(BASE_URL_STORAGE) || DEFAULT_BASE_URL
    config.baseURL = baseUrl

    if (apiKey) {
      config.headers['Authorization'] = `Bearer ${apiKey}`
    }

    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor | 响应拦截器
instance.interceptors.response.use(
  (res) => {
    // Handle stream response | 处理流响应
    if (res.config.responseType === 'stream') {
      return res.data
    }

    // Handle blob response | 处理 blob 响应
    if (res.data instanceof Blob) {
      return res.data
    }

    // Handle Gemini-style response (has candidates) | 处理 Gemini 格式响应
    if (res.data?.candidates) {
      return res.data
    }

    // Handle standard response | 处理标准响应
    const { code, message } = res.data || {}

    if (code === 200 || res.status === 200) {
      return res.data
    }

    window.$message?.error(message || 'Request failed')
    return Promise.reject(res.data)
  },
  (error) => {
    const { response } = error

    if (response) {
      const { status, data } = response
      const message = data?.message || data?.error?.message || error.message

      if (status === 401) {
        window.$message?.warning('API Key 未配置或已失效，请填写正确的 Key')
        window.dispatchEvent(new CustomEvent('open-api-settings'))
      } else if (status === 403) {
        // 403 无权限/无额度 - 显示额度不足提示
        const msg = data?.message || data?.error?.message || 'API 调用无权限，请检查 API Key 或余额'
        window.dispatchEvent(new CustomEvent('quota-exceeded', {
          detail: { message: msg }
        }))
      } else if (status === 402 || status === 429) {
        // 额度不足或请求过于频繁 - 显示顶部通知
        const isQuotaExceeded = status === 402 ||
          message?.toLowerCase().includes('quota') ||
          message?.toLowerCase().includes('insufficient') ||
          message?.toLowerCase().includes('balance') ||
          message?.toLowerCase().includes('额度') ||
          message?.toLowerCase().includes('余额')

        if (isQuotaExceeded) {
          window.dispatchEvent(new CustomEvent('quota-exceeded', {
            detail: {
              message: message || 'API 调用额度已用尽，请充值或更换 API Key'
            }
          }))
        } else {
          window.$message?.error('请求过于频繁，请稍后再试')
        }
      } else if (status === 666) {
        window.$message?.error('API 请求失败，请检查 API Key')
      } else {
        window.$message?.error(message || '请求失败')
      }
    } else {
      window.$message?.error(error.message || '网络错误')
    }

    return Promise.reject(error)
  }
)

/**
 * Set API base URL | 设置 API 基础 URL
 */
export const setBaseUrl = (url) => {
  instance.defaults.baseURL = url
}

/**
 * Get current base URL | 获取当前基础 URL
 */
export const getBaseUrl = () => {
  return instance.defaults.baseURL
}

export default instance
