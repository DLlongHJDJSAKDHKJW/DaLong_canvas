const roundCurrency = (value) => {
  if (!Number.isFinite(value)) return null
  return Math.round(value * 100) / 100
}

const formatCurrency = (value) => {
  if (!Number.isFinite(value)) return '价格待确认'
  const rounded = roundCurrency(value)
  if (rounded === null) return '价格待确认'
  if (rounded >= 100) return `约 ${rounded.toFixed(0)} 元`
  if (rounded >= 10) return `约 ${rounded.toFixed(1)} 元`
  return `约 ${rounded.toFixed(2)} 元`
}

const normalizeResolution = (resolution) => String(resolution || '').toUpperCase()

const isReferenceHeavyMode = ({ videoMode, hasReferenceVideo }) =>
  hasReferenceVideo || videoMode === 'reference-all' || videoMode === 'image-reference'

const estimateSeedance15 = ({ duration, hasAudio }) => {
  const estimatedTokens = duration * 21780
  const unitPrice = hasAudio ? 16 : 8
  const cost = (estimatedTokens / 1_000_000) * unitPrice
  return {
    type: 'token',
    value: roundCurrency(cost),
    label: formatCurrency(cost),
    note: hasAudio ? '按在线有声 token 估算' : '按在线无声 token 估算'
  }
}

const estimateKlingV26 = ({ duration, hasAudio }) => {
  const normalizedDuration = duration >= 8 ? 10 : 5
  const perSecond = hasAudio ? 1 : 0.5
  const cost = normalizedDuration * perSecond
  return {
    type: 'fixed',
    value: roundCurrency(cost),
    label: formatCurrency(cost),
    note: hasAudio
      ? '价格页有有声档，但模型文档写明暂不支持有声'
      : `按 ${normalizedDuration} 秒无声档估算`
  }
}

const estimateKlingOmni = ({ duration, hasAudio, hasReferenceVideo, mode }) => {
  let perSecond = 0.6
  if (mode === 'pro') {
    perSecond = hasReferenceVideo ? 1.2 : (hasAudio ? 1 : 0.8)
  } else {
    perSecond = hasReferenceVideo ? 0.9 : (hasAudio ? 0.8 : 0.6)
  }
  const cost = duration * perSecond
  return {
    type: 'fixed',
    value: roundCurrency(cost),
    label: formatCurrency(cost),
    note: `${mode} 模式，按秒估算`
  }
}

const estimateByResolutionRate = ({ duration, resolution, rates, note }) => {
  const normalized = normalizeResolution(resolution)
  const perSecond = rates[normalized]
  if (!perSecond) {
    return {
      type: 'unknown',
      value: null,
      label: '价格待确认',
      note: '当前清晰度暂无公开单价'
    }
  }
  const cost = duration * perSecond
  return {
    type: 'fixed',
    value: roundCurrency(cost),
    label: formatCurrency(cost),
    note
  }
}

export const estimateVideoCost = ({
  model,
  duration,
  resolution,
  hasAudio = false,
  hasReferenceVideo = false,
  videoMode = 'text-to-video'
}) => {
  const safeDuration = Math.max(1, Number(duration) || 5)
  const normalizedResolution = normalizeResolution(resolution)
  const mode = normalizedResolution === '1080P' ? 'pro' : 'std'

  switch (model) {
    case 'doubao-seedance-1-5-pro-251215':
      return estimateSeedance15({
        duration: safeDuration,
        hasAudio
      })

    case 'Kling-v2.6-T2V':
    case 'Kling-v2.6-I2V':
      return estimateKlingV26({
        duration: safeDuration,
        hasAudio
      })

    case 'Kling-O3':
      return estimateKlingOmni({
        duration: safeDuration,
        hasAudio,
        hasReferenceVideo: true,
        mode
      })

    case 'Kling-v3':
      return estimateKlingOmni({
        duration: safeDuration,
        hasAudio,
        hasReferenceVideo: isReferenceHeavyMode({ videoMode, hasReferenceVideo }),
        mode
      })

    case 'HappyHorse-1.0-T2V':
    case 'HappyHorse-1.0-I2V':
    case 'HappyHorse-1.0-R2V':
    case 'HappyHorse-1.0-Video-Edit':
      return {
        type: 'unknown',
        value: null,
        label: '价格待确认',
        note: '官方价格页暂未看到 HappyHorse 明确单价'
      }

    case 'doubao-seedance-2-0-260128':
      return {
        type: 'unknown',
        value: null,
        label: '价格待确认',
        note: '官方价格页暂未看到 Seedance 2.0 明确单价'
      }

    default:
      return {
        type: 'unknown',
        value: null,
        label: '价格待确认',
        note: '当前模型尚未配置官方价格规则'
      }
  }
}
