/**
 * API Provider Adapters | API 渠道适配器
 * 当前统一接入 ModelVerse (OpenAI 兼容)
 */

const normalizeMessageContent = (content) => {
  if (typeof content === 'string') {
    return content
  }
  
  if (Array.isArray(content)) {
    // 如果数组中只有一项且是文本，直接返回字符串，提高兼容性
    if (content.length === 1 && (content[0].type === 'text' || typeof content[0] === 'string')) {
      return content[0].text || content[0]
    }
    
    return content.map((item) => {
      if (typeof item === 'string') {
        return { type: 'text', text: item }
      }
      return item
    })
  }

  return content
}

const adaptChatRequest = (params) => {
  const model = params.model
  const adapted = {
    model,
    messages: (params.messages || []).map((message) => ({
      ...message,
      content: normalizeMessageContent(message.content)
    }))
  }

  if (params.temperature !== undefined) adapted.temperature = params.temperature
  if (params.stream !== undefined) adapted.stream = params.stream

  const maxTokenValue = params.max_completion_tokens ?? params.max_tokens
  if (maxTokenValue !== undefined) {
    if (/^gpt-5/i.test(model || '')) {
      adapted.max_completion_tokens = maxTokenValue
    } else {
      adapted.max_tokens = maxTokenValue
    }
  }

  return adapted
}

export const PROVIDERS = {
  modelverse: {
    label: 'ModelVerse API',
    defaultBaseUrl: 'https://api.modelverse.cn/v1',
    endpoints: {
      chat: '/chat/completions',
      image: '/v1beta/models/{model_id}:generateContent',
      video: '/video/generations',
      videoQuery: '/video/task/{taskId}'
    },
    requestAdapter: {
      chat: adaptChatRequest,
      image: (params) => ({ ...params }),
      video: (params) => ({ ...params })
    },
    responseAdapter: {
      chat: (response) => {
        if (response?.choices?.length) {
          return response.choices[0].message?.content || ''
        }
        return ''
      },
      image: (response) => {
        console.warn('🔍 [Provider] Raw API Response:', response)

        // Handle Gemini-style response with candidates
        if (response?.candidates?.[0]?.content?.parts) {
          const parts = response.candidates[0].content.parts
          const images = []
          for (const part of parts) {
            if (part.inlineData?.data) {
              const mimeType = part.inlineData.mimeType || 'image/png'
              const base64Data = part.inlineData.data

              // 尝试从 base64 数据推断图片尺寸
              console.warn('🔍 [Provider] Base64 length:', base64Data.length)
              console.warn('🔍 [Provider] Estimated size (KB):', Math.round(base64Data.length * 0.75 / 1024))

              images.push({
                url: `data:${mimeType};base64,${base64Data}`,
                revisedPrompt: ''
              })
            }
          }
          if (images.length > 0) {
            console.warn('🔍 [Provider] Extracted images count:', images.length)
            return images
          }
        }

        // Fallback to standard OpenAI-style response
        const data = response.data || response
        return (Array.isArray(data) ? data : [data]).map((item) => ({
          url: item.url || (item.b64_json ? `data:image/png;base64,${item.b64_json}` : ''),
          revisedPrompt: item.revised_prompt || ''
        }))
      },
      video: (response) => ({
        url: response.data?.url || response.url || response.data?.[0]?.url || '',
        ...response
      })
    }
  },
  default: 'modelverse'
}

export const getProviderList = () => {
  return Object.entries(PROVIDERS)
    .filter(([key]) => key !== 'default')
    .map(([key, value]) => ({
      key,
      label: value.label
    }))
}

export const getDefaultProvider = () => {
  return PROVIDERS.default || 'modelverse'
}

export const getDefaultBaseUrl = (providerKey) => {
  const config = getProviderConfig(providerKey)
  return config.defaultBaseUrl || ''
}

export const getProviderConfig = (providerKey) => {
  return PROVIDERS[providerKey] || PROVIDERS[PROVIDERS.default]
}
