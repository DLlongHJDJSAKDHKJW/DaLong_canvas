/**
 * Models Configuration | 模型配置
 * 当前默认内置模型以 ModelVerse 可用模型为准
 */

export const BANANA_SIZE_OPTIONS = [
  { label: '16:9', key: '16x9' },
  { label: '4:3', key: '4x3' },
  { label: '3:2', key: '3x2' },
  { label: '1:1', key: '1x1' },
  { label: '2:3', key: '2x3' },
  { label: '3:4', key: '3x4' },
  { label: '9:16', key: '9x16' }
]

export const SEEDREAM_SIZE_OPTIONS = BANANA_SIZE_OPTIONS
export const SEEDREAM_4K_SIZE_OPTIONS = BANANA_SIZE_OPTIONS
export const SEEDREAM_QUALITY_OPTIONS = [
  { label: '标准', key: 'standard' }
]
export const SEEDANCE_RESOLUTION_OPTIONS = []

export const MODEL_ALIASES = {
  'seedream-4.5': 'doubao-seedream-4.5',
  'seedream-5.0-lite': 'doubao-seedream-5-0-260128'
}

export const normalizeModelKey = (key) => MODEL_ALIASES[key] || key

export const IMAGE_MODELS = [
  {
    label: 'Nano Banana Pro',
    key: 'gemini-3-pro-image-preview',
    provider: ['modelverse'],
    sizes: BANANA_SIZE_OPTIONS.map((item) => item.key),
    defaultParams: {
      size: '9x16',
      quality: 'standard',
      style: 'vivid'
    }
  },
  {
    label: 'Nano Banana 2',
    key: 'gemini-3.1-flash-image-preview',
    provider: ['modelverse'],
    sizes: BANANA_SIZE_OPTIONS.map((item) => item.key),
    defaultParams: {
      size: '9x16',
      quality: 'standard',
      style: 'vivid'
    }
  },
  {
    label: 'GPT Image 2',
    key: 'gpt-image-2',
    provider: ['modelverse'],
    sizes: BANANA_SIZE_OPTIONS.map((item) => item.key),
    defaultParams: {
      size: '1x1',
      quality: 'standard',
      style: 'vivid'
    }
  },
  {
    label: 'Seedream 4.5',
    key: 'doubao-seedream-4.5',
    provider: ['modelverse'],
    sizes: SEEDREAM_SIZE_OPTIONS.map((item) => item.key),
    defaultParams: {
      size: '1x1',
      quality: 'standard',
      style: 'vivid'
    }
  },
  {
    label: 'Seedream 5.0',
    key: 'doubao-seedream-5-0-260128',
    provider: ['modelverse'],
    sizes: SEEDREAM_4K_SIZE_OPTIONS.map((item) => item.key),
    defaultParams: {
      size: '1x1',
      quality: 'standard',
      style: 'vivid'
    }
  }
]

export const VIDEO_RATIO_LIST = [
  { label: '21:9 (超宽)', key: '21x9' },
  { label: '16:9 (横版)', key: '16x9' },
  { label: '4:3', key: '4x3' },
  { label: '3:2', key: '3x2' },
  { label: '1:1 (方形)', key: '1x1' },
  { label: '2:3', key: '2x3' },
  { label: '3:4', key: '3x4' },
  { label: '9:16 (竖版)', key: '9x16' }
]

export const VIDEO_MODELS = [
  {
    label: 'HappyHorse 1.0 T2V',
    key: 'HappyHorse-1.0-T2V',
    provider: ['modelverse'],
    category: 'text-to-video',
    modes: ['text-to-video'],
    ratios: ['16x9', '9x16', '1x1'],
    resolutions: ['720P', '1080P'],
    durs: Array.from({ length: 13 }, (_, index) => {
      const seconds = index + 3
      return { label: `${seconds} 秒`, key: seconds }
    }),
    supportsAudio: false,
    defaultParams: { ratio: '16x9', duration: 5, resolution: '1080P', audio: false }
  },
  {
    label: 'HappyHorse 1.0 I2V',
    key: 'HappyHorse-1.0-I2V',
    provider: ['modelverse'],
    category: 'image-to-video',
    modes: ['image-to-video'],
    ratios: ['16x9', '9x16', '1x1'],
    resolutions: ['720P', '1080P'],
    durs: Array.from({ length: 13 }, (_, index) => {
      const seconds = index + 3
      return { label: `${seconds} 秒`, key: seconds }
    }),
    supportsAudio: false,
    defaultParams: { ratio: '16x9', duration: 5, resolution: '1080P', audio: false }
  },
  {
    label: 'HappyHorse 1.0 R2V',
    key: 'HappyHorse-1.0-R2V',
    provider: ['modelverse'],
    category: 'reference-to-video',
    modes: ['reference-all', 'image-reference'],
    ratios: ['16x9', '9x16', '1x1'],
    resolutions: ['720P', '1080P'],
    durs: Array.from({ length: 13 }, (_, index) => {
      const seconds = index + 3
      return { label: `${seconds} 秒`, key: seconds }
    }),
    supportsAudio: false,
    defaultParams: { ratio: '16x9', duration: 5, resolution: '1080P', audio: false }
  },
  {
    label: 'HappyHorse Video Edit',
    key: 'HappyHorse-1.0-Video-Edit',
    provider: ['modelverse'],
    category: 'video-edit',
    modes: ['reference-all'],
    ratios: ['16x9'],
    resolutions: ['720P', '1080P'],
    durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
    supportsAudio: false,
    defaultParams: { ratio: '16x9', duration: 5, resolution: '1080P', audio: false }
  },
  {
    label: 'Seedance 1.5 Pro',
    key: 'doubao-seedance-1-5-pro-251215',
    provider: ['modelverse'],
    category: 'image-to-video',
    modes: ['text-to-video', 'image-to-video', 'first-last-frame'],
    ratios: ['auto', '21x9', '16x9', '4x3', '1x1', '3x4', '9x16'],
    resolutions: ['480P', '720P', '1080P'],
    durs: Array.from({ length: 9 }, (_, index) => {
      const seconds = index + 4
      return { label: `${seconds} 秒`, key: seconds }
    }),
    supportsAudio: true,
    defaultParams: { ratio: '16x9', duration: 5, resolution: '720P', audio: false }
  },
  {
    label: 'Seedance 2.0',
    key: 'doubao-seedance-2-0-260128',
    provider: ['modelverse'],
    category: 'image-to-video',
    modes: ['text-to-video', 'reference-all', 'image-to-video', 'first-last-frame', 'image-reference'],
    ratios: ['auto', '21x9', '16x9', '4x3', '1x1', '3x4', '9x16'],
    resolutions: ['480P', '720P', '1080P'],
    durs: Array.from({ length: 12 }, (_, index) => {
      const seconds = index + 4
      return { label: `${seconds} 秒`, key: seconds }
    }),
    supportsAudio: true,
    defaultParams: { ratio: '16x9', duration: 5, resolution: '720P', audio: false }
  },
  {
    label: 'Kling v3',
    key: 'Kling-v3',
    provider: ['modelverse'],
    category: 'text-to-video',
    modes: ['text-to-video', 'image-to-video', 'first-last-frame', 'reference-all'],
    ratios: ['16x9', '9x16', '1x1'],
    resolutions: ['720P', '1080P'],
    durs: Array.from({ length: 13 }, (_, index) => {
      const seconds = index + 3
      return { label: `${seconds} 秒`, key: seconds }
    }),
    modeDurs: {
      'text-to-video': Array.from({ length: 13 }, (_, index) => {
        const seconds = index + 3
        return { label: `${seconds} 秒`, key: seconds }
      }),
      'image-to-video': Array.from({ length: 13 }, (_, index) => {
        const seconds = index + 3
        return { label: `${seconds} 秒`, key: seconds }
      }),
      'first-last-frame': Array.from({ length: 13 }, (_, index) => {
        const seconds = index + 3
        return { label: `${seconds} 秒`, key: seconds }
      }),
      'reference-all': [
        { label: '5 秒', key: 5 },
        { label: '10 秒', key: 10 }
      ]
    },
    supportsAudio: true,
    defaultParams: { ratio: '16x9', duration: 5, resolution: '1080P', audio: false }
  },
  {
    label: 'Kling O3',
    key: 'Kling-O3',
    provider: ['modelverse'],
    category: 'image-to-video',
    modes: ['text-to-video', 'reference-all', 'image-to-video', 'first-last-frame', 'image-reference'],
    ratios: ['16x9', '9x16', '1x1'],
    resolutions: ['720P', '1080P'],
    durs: Array.from({ length: 13 }, (_, index) => {
      const seconds = index + 3
      return { label: `${seconds} 秒`, key: seconds }
    }),
    supportsAudio: true,
    defaultParams: { ratio: '16x9', duration: 5, resolution: '1080P', audio: false }
  },
  {
    label: 'Kling v2.6 I2V',
    key: 'Kling-v2.6-I2V',
    provider: ['modelverse'],
    category: 'image-to-video',
    modes: ['image-to-video', 'first-last-frame'],
    ratios: ['16x9', '9x16', '1x1'],
    resolutions: ['1080P'],
    durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
    supportsAudio: false,
    defaultParams: { ratio: '16x9', duration: 5, resolution: '1080P', audio: false }
  },
  {
    label: 'Kling v2.6 T2V',
    key: 'Kling-v2.6-T2V',
    provider: ['modelverse'],
    category: 'text-to-video',
    modes: ['text-to-video'],
    ratios: ['16x9', '9x16', '1x1'],
    resolutions: ['1080P'],
    durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
    supportsAudio: false,
    defaultParams: { ratio: '16x9', duration: 5, resolution: '1080P', audio: false }
  }
]

export const CHAT_MODELS = [
  { label: 'GPT-5.4', key: 'gpt-5.4', provider: ['modelverse'] },
  { label: 'Claude Sonnet 4.6', key: 'global.anthropic.claude-sonnet-4-6', provider: ['modelverse'] },
  { label: 'Claude Opus 4.5', key: 'global.anthropic.claude-opus-4-5-20251101-v1:0', provider: ['modelverse'] },
  { label: 'Claude Opus 4.6', key: 'global.anthropic.claude-opus-4-6-v1', provider: ['modelverse'] },
  { label: 'Claude Sonnet 4.5', key: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0', provider: ['modelverse'] },
  { label: 'Claude Haiku 4.5', key: 'global.anthropic.claude-haiku-4-5-20251001-v1:0', provider: ['modelverse'] },
  { label: 'Gemini 3.1 Pro Preview', key: 'gemini-3.1-pro-preview', provider: ['modelverse'] },
  { label: 'Gemini 3.1 Flash Lite Preview', key: 'gemini-3.1-flash-lite-preview', provider: ['modelverse'] }
]

export const IMAGE_SIZE_OPTIONS = [
  { label: '16:9', key: '16x9' },
  { label: '4:3', key: '4x3' },
  { label: '3:2', key: '3x2' },
  { label: '1:1', key: '1x1' },
  { label: '2:3', key: '2x3' },
  { label: '3:4', key: '3x4' },
  { label: '9:16', key: '9x16' }
]

export const IMAGE_QUALITY_OPTIONS = [
  { label: '标准', key: 'standard' }
]

export const IMAGE_STYLE_OPTIONS = [
  { label: '默认', key: 'vivid' }
]

export const VIDEO_RATIO_OPTIONS = VIDEO_RATIO_LIST

export const VIDEO_DURATION_OPTIONS = [
  { label: '3 秒', key: 3 },
  { label: '4 秒', key: 4 },
  { label: '5 秒', key: 5 },
  { label: '6 秒', key: 6 },
  { label: '7 秒', key: 7 },
  { label: '8 秒', key: 8 },
  { label: '9 秒', key: 9 },
  { label: '10 秒', key: 10 },
  { label: '11 秒', key: 11 },
  { label: '12 秒', key: 12 },
  { label: '13 秒', key: 13 },
  { label: '14 秒', key: 14 },
  { label: '15 秒', key: 15 }
]

export const DEFAULT_IMAGE_MODEL = 'gemini-3.1-flash-image-preview'
export const DEFAULT_VIDEO_MODEL = 'doubao-seedance-2-0-260128'
export const DEFAULT_CHAT_MODEL = 'gpt-5.4'
export const DEFAULT_IMAGE_SIZE = '9x16'
export const DEFAULT_VIDEO_RATIO = '16:9'
export const DEFAULT_VIDEO_DURATION = 5

export const getModelByName = (key) => {
  const normalizedKey = normalizeModelKey(key)
  const allModels = [...IMAGE_MODELS, ...VIDEO_MODELS, ...CHAT_MODELS]
  return allModels.find((item) => item.key === normalizedKey)
}
