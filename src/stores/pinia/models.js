/**
 * Pinia Store: Model Config | 模型配置 Store
 * 简化版 - 固定使用 ModelVerse API
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import {
  CHAT_MODELS,
  IMAGE_MODELS,
  VIDEO_MODELS,
  DEFAULT_CHAT_MODEL,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_VIDEO_MODEL,
  normalizeModelKey
} from '@/config/models'
import { PROVIDERS, getProviderConfig } from '@/config/providers'

// 固定配置
const PROVIDER = 'modelverse'
const DEFAULT_BASE_URL = 'https://api.modelverse.cn/v1'
const API_KEY_STORAGE = 'modelverse-api-key'
const BASE_URL_STORAGE = 'modelverse-base-url'

export const useModelStore = defineStore('model', () => {
  // ============ API 配置 ============

  // API Key（由用户自行填写，无内置默认值）
  const apiKey = ref(localStorage.getItem(API_KEY_STORAGE) || '')

  // 请求地址（用户可自定义，默认 ModelVerse）
  const baseUrl = ref(localStorage.getItem(BASE_URL_STORAGE) || DEFAULT_BASE_URL)

  // 当前 API Key（兼容旧代码）
  const currentApiKey = computed(() => apiKey.value)
  const currentBaseUrl = computed(() => baseUrl.value)
  const currentProvider = computed(() => PROVIDER)

  // Provider 配置
  const providerConfig = computed(() => getProviderConfig(PROVIDER))
  const providerLabel = computed(() => providerConfig.value.label || PROVIDER)
  const providerList = computed(() => [{ key: PROVIDER, label: 'ModelVerse API' }])

  // 设置 API Key
  const setApiKey = (key) => {
    apiKey.value = key
    if (key) {
      localStorage.setItem(API_KEY_STORAGE, key)
    } else {
      localStorage.removeItem(API_KEY_STORAGE)
    }
  }

  // 设置请求地址
  const setBaseUrl = (url) => {
    const value = (url || '').trim() || DEFAULT_BASE_URL
    baseUrl.value = value
    localStorage.setItem(BASE_URL_STORAGE, value)
  }

  // 清除 API 配置
  const clearApiConfig = () => {
    apiKey.value = ''
    baseUrl.value = DEFAULT_BASE_URL
    localStorage.removeItem(API_KEY_STORAGE)
    localStorage.removeItem(BASE_URL_STORAGE)
  }

  // 兼容旧代码的方法
  const setApiKeyByProvider = (provider, key) => setApiKey(key)
  const setBaseUrlByProvider = () => {} // 不需要了
  const clearApiConfigByProvider = () => clearApiConfig()
  const setProvider = () => {} // 不需要了
  const apiKeysByProvider = computed(() => ({ [PROVIDER]: apiKey.value }))
  const baseUrlsByProvider = computed(() => ({ [PROVIDER]: baseUrl.value }))

  // ============ 请求/响应适配 ============

  const adaptRequest = (type, params) => {
    const config = providerConfig.value
    if (config.requestAdapter?.[type]) {
      return config.requestAdapter[type](params)
    }
    return params
  }

  const adaptResponse = (type, response) => {
    const config = providerConfig.value
    if (config.responseAdapter?.[type]) {
      return config.responseAdapter[type](response)
    }
    return response
  }

  // ============ 模型列表 ============

  const allChatModels = computed(() => CHAT_MODELS.map(m => ({ ...m, isCustom: false })))
  const allImageModels = computed(() => IMAGE_MODELS.map(m => ({ ...m, isCustom: false })))
  const allVideoModels = computed(() => VIDEO_MODELS.map(m => ({ ...m, isCustom: false })))

  // 选中的模型
  const selectedChatModel = ref(normalizeModelKey(localStorage.getItem('selected-chat-model') || DEFAULT_CHAT_MODEL))
  const selectedImageModel = ref(normalizeModelKey(localStorage.getItem('selected-image-model') || DEFAULT_IMAGE_MODEL))
  const selectedVideoModel = ref(normalizeModelKey(localStorage.getItem('selected-video-model') || DEFAULT_VIDEO_MODEL))

  // 设置选中的模型
  const setSelectedChatModel = (model) => {
    const normalized = normalizeModelKey(model)
    selectedChatModel.value = normalized
    localStorage.setItem('selected-chat-model', normalized)
  }

  const setSelectedImageModel = (model) => {
    const normalized = normalizeModelKey(model)
    selectedImageModel.value = normalized
    localStorage.setItem('selected-image-model', normalized)
  }

  const setSelectedVideoModel = (model) => {
    const normalized = normalizeModelKey(model)
    selectedVideoModel.value = normalized
    localStorage.setItem('selected-video-model', normalized)
  }

  // 获取模型
  const getChatModel = (key) => allChatModels.value.find(m => m.key === key)
  const getImageModel = (key) => allImageModels.value.find(m => m.key === key)
  const getVideoModel = (key) => allVideoModels.value.find(m => m.key === key)

  // ============ API 端点 ============

  const getImageEndpoint = () => {
    const endpoint = providerConfig.value.endpoints?.image || '/images/generations'
    return `${baseUrl.value}${endpoint}`
  }

  const getVideoEndpoint = () => {
    const endpoint = providerConfig.value.endpoints?.video || '/videos'
    return `${baseUrl.value}${endpoint}`
  }

  const getVideoTaskEndpoint = () => {
    const endpoint = providerConfig.value.endpoints?.videoQuery || '/videos'
    return `${baseUrl.value}${endpoint}`
  }

  const getChatEndpoint = () => {
    const endpoint = providerConfig.value.endpoints?.chat || '/chat/completions'
    return `${baseUrl.value}${endpoint}`
  }

  // ============ 兼容旧代码的空方法 ============

  const addCustomChatModel = () => {}
  const addCustomImageModel = () => {}
  const addCustomVideoModel = () => {}
  const removeCustomChatModel = () => {}
  const removeCustomImageModel = () => {}
  const removeCustomVideoModel = () => {}
  const clearCustomModels = () => {}
  const getModelsByProvider = () => ({
    chat: allChatModels.value,
    image: allImageModels.value,
    video: allVideoModels.value
  })

  return {
    // API 配置
    apiKey,
    baseUrl,
    currentApiKey,
    currentBaseUrl,
    currentProvider,
    providerConfig,
    providerLabel,
    providerList,
    setApiKey,
    setBaseUrl,
    clearApiConfig,

    // 兼容旧代码
    setApiKeyByProvider,
    setBaseUrlByProvider,
    clearApiConfigByProvider,
    setProvider,
    apiKeysByProvider,
    baseUrlsByProvider,

    // 请求/响应适配
    adaptRequest,
    adaptResponse,

    // 模型列表
    allChatModels,
    allImageModels,
    allVideoModels,
    selectedChatModel,
    selectedImageModel,
    selectedVideoModel,
    setSelectedChatModel,
    setSelectedImageModel,
    setSelectedVideoModel,
    getChatModel,
    getImageModel,
    getVideoModel,

    // API 端点
    getImageEndpoint,
    getVideoEndpoint,
    getVideoTaskEndpoint,
    getChatEndpoint,

    // 兼容旧代码
    addCustomChatModel,
    addCustomImageModel,
    addCustomVideoModel,
    removeCustomChatModel,
    removeCustomImageModel,
    removeCustomVideoModel,
    clearCustomModels,
    getModelsByProvider
  }
})
