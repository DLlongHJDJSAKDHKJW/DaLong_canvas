<template>
  <!-- Video node | 视频节点 -->
  <div class="video-node-wrapper" @mousemove="onNodeMouseMove" @mouseleave="onNodeMouseLeave">
    <!-- Video container | 视频容器 -->
    <div
      class="video-node"
      :class="{ 'selected': data.selected, 'playing': isPlaying }"
      :style="nodeStyle"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      <div v-if="data.loading" class="video-loading">
        <div class="loading-spinner"></div>
        <span>{{ data.loadingText || '生成中...' }}</span>
      </div>

      <div v-else-if="data.url" class="video-container">
        <video
          ref="videoRef"
          :src="data.url"
          class="video-display"
          @loadedmetadata="onVideoLoad"
          @timeupdate="onTimeUpdate"
          @play="isPlaying = true"
          @pause="isPlaying = false"
          @ended="isPlaying = false"
        ></video>

        <div v-if="data.url" class="video-meta-bar">
          <span class="video-meta-chip">{{ isPlaying ? '播放中' : '视频' }}</span>
          <span v-if="duration > 0" class="video-meta-time">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
        </div>

        <!-- 进度条控件 -->
        <div 
          v-if="duration > 0 && (isHovering || isDraggingProgress)"
          class="progress-bar-container"
        >
          <button class="mini-play-btn" @click.stop="togglePlay" @mousedown.stop>
            <n-icon :size="16">
              <PauseOutline v-if="isPlaying" />
              <PlayOutline v-else />
            </n-icon>
          </button>
          <div class="progress-track" ref="progressTrackRef" @mousedown.stop="startDragProgress">
            <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
            <div class="progress-thumb" :style="{ left: progressPercentage + '%' }"></div>
          </div>
        </div>

        <!-- 播放/暂停按钮 -->
        <div 
          class="video-controls" 
          v-show="!isPlaying && !isHovering && !isDraggingProgress"
          @click="togglePlay"
        >
          <div class="play-button">
            <n-icon :size="48"><PlayOutline /></n-icon>
          </div>
        </div>

        <!-- 右上角下载按钮 -->
        <button v-if="data.url && isSingleSelected" class="download-btn" @click.stop="handleDownload" title="下载视频">
          <n-icon :size="20"><DownloadOutline /></n-icon>
        </button>
      </div>

      <div v-else class="video-placeholder">
        <n-icon :size="48"><VideocamOutline /></n-icon>
        <span class="placeholder-text">拖入视频文件</span>
      </div>
    </div>

    <div v-if="isSingleSelected" class="video-generate-panel">
      <div class="video-mode-tabs">
        <button
          v-for="tab in availableVideoModeTabs"
          :key="tab.key"
          :class="['video-mode-tab', { active: localVideoMode === tab.key }]"
          @click="handleVideoModeChange(tab.key)"
        >
          {{ tab.label }}
        </button>
        <button class="video-panel-expand" title="展开">
          ↗
        </button>
      </div>

      <div class="video-ref-toolbar">
        <button class="video-tool-btn">
          <span class="video-tool-icon">⌖</span>
          <span>标记</span>
        </button>
        <button class="video-tool-btn">
          <span class="video-tool-icon">◌</span>
          <span>运镜</span>
        </button>
        <button class="video-tool-btn">
          <span class="video-tool-icon">◡</span>
          <span>角色库</span>
        </button>

        <div class="video-ref-thumb">
          <img
            v-if="props.data.poster || props.data.thumbnail || props.data.cover"
            :src="props.data.poster || props.data.thumbnail || props.data.cover"
            alt="参考图"
          />
          <div v-else class="video-ref-thumb-placeholder">图</div>
          <span class="video-ref-badge">1</span>
        </div>
      </div>

      <div class="video-prompt-box" @mousedown.stop>
        <textarea
          v-model="localVideoPrompt"
          class="video-prompt-editor"
          :placeholder="videoPromptPlaceholder"
          spellcheck="false"
          @input="handleVideoPromptInput"
          @mousedown.stop
          @click.stop
        ></textarea>
      </div>

      <div class="video-bottom-toolbar">
        <div class="video-model-select-wrap">
          <button
            class="video-bottom-select video-bottom-select-model video-model-trigger"
            @click.stop="toggleVideoModelMenu"
          >
            <span class="video-bottom-select-strong video-bottom-select-strong-model">
              <span class="video-model-trigger-brand">
                <img
                  class="video-model-trigger-brand-image"
                  :src="currentVideoModelMeta.brandIcon"
                  :alt="currentVideoModelMeta.brandName"
                />
              </span>
              <span>{{ currentVideoModelMeta.label }}</span>
            </span>
            <n-icon
              :size="12"
              class="video-bottom-select-icon"
              :class="{ 'is-open': isVideoModelMenuOpen }"
            >
              <ChevronDownOutline />
            </n-icon>
          </button>

          <div
            v-if="isVideoModelMenuOpen"
            class="video-model-menu"
            @mousedown.stop
            @click.stop
            @wheel.stop
          >
            <button
              v-for="item in videoModelMenuItems"
              :key="item.key"
              :class="['video-model-option', { active: localVideoModel === item.key }]"
              @click.stop="handleVideoModelSelect(item.key)"
            >
              <span class="video-model-option-left">
                <span class="video-model-brand">
                  <img
                    class="video-model-brand-image"
                    :src="item.brandIcon"
                    :alt="item.brandName"
                  />
                </span>
                <span class="video-model-option-main">{{ item.label }}</span>
              </span>
              <span class="video-model-option-side">{{ item.badge }}</span>
            </button>
          </div>
        </div>

        <div class="video-param-combo-wrap">
          <button
            class="video-bottom-select video-bottom-select-combo"
            @click.stop="toggleVideoAdvancedPanel"
          >
            <span class="video-param-summary">
              <span>{{ videoParamSummary }}</span>
              <span
                :class="['video-param-audio-indicator', { enabled: supportsVideoAudio, active: localVideoAudio && supportsVideoAudio }]"
                :title="supportsVideoAudio ? (localVideoAudio ? '当前生成音频已开启' : '当前生成音频已关闭') : '当前模型不支持生成音频'"
              >
                <n-icon :size="14">
                  <VolumeHighOutline v-if="supportsVideoAudio" />
                  <VolumeMuteOutline v-else />
                </n-icon>
              </span>
            </span>
            <n-icon
              :size="12"
              class="video-bottom-select-icon"
              :class="{ 'is-open': isVideoAdvancedPanelOpen }"
            >
              <ChevronDownOutline />
            </n-icon>
          </button>

          <div
            v-if="isVideoAdvancedPanelOpen"
            class="video-advanced-panel"
            @mousedown.stop
            @click.stop
            @wheel.stop
          >
            <div class="video-advanced-section">
              <div class="video-advanced-label">画面比例</div>
              <div class="video-chip-group">
                <button
                  v-for="item in advancedRatioOptions"
                  :key="item.key"
                  :class="['video-ratio-card', { active: localVideoRatio === item.key }]"
                  @click.stop="handleVideoRatioSelect(item.key)"
                >
                  <span class="video-ratio-card-preview">
                    <span
                      class="video-ratio-card-frame"
                      :style="getRatioPreviewStyle(item.key)"
                    ></span>
                  </span>
                  <span class="video-ratio-card-label">{{ item.label }}</span>
                </button>
              </div>
            </div>

            <div class="video-advanced-section">
              <div class="video-advanced-label">清晰度</div>
              <div class="video-chip-group">
                <button
                  v-for="item in videoResolutionOptions"
                  :key="item.key"
                  :class="['video-chip-btn', { active: localVideoResolution === item.key }]"
                  @click.stop="handleVideoResolutionSelect(item.key)"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>

            <div class="video-advanced-section">
              <div class="video-advanced-row">
                <div class="video-advanced-label">视频时长</div>
                <div class="video-advanced-value">{{ localVideoDuration }}s</div>
              </div>
              <input
                v-if="showDurationSlider"
                class="video-duration-slider"
                type="range"
                :min="videoDurationRange.min"
                :max="videoDurationRange.max"
                :step="videoDurationRange.step"
                :value="localVideoDuration"
                :disabled="availableDurationOptions.length <= 1"
                @input="handleVideoDurationRangeInput"
              />
              <div v-else-if="showDurationButtonsOnly" class="video-duration-ticks video-duration-ticks-inline">
                <button
                  v-for="item in availableDurationOptions"
                  :key="item.key"
                  :class="['video-duration-tick', { active: localVideoDuration === item.key }]"
                  @click.stop="handleVideoDurationSelect(item.key)"
                >
                  {{ item.key }}s
                </button>
              </div>
            </div>

            <div class="video-advanced-section video-advanced-section-toggle">
              <div>
                <div class="video-advanced-label">生成音频</div>
                <div class="video-advanced-hint">根据模型能力决定是否一并输出声音</div>
              </div>
              <div class="video-toggle-group">
                <button
                  :class="['video-toggle-btn', { active: localVideoAudio, disabled: !supportsVideoAudio }]"
                  :disabled="!supportsVideoAudio"
                  @click.stop="handleVideoAudioToggle(true)"
                >
                  开启
                </button>
                <button
                  :class="['video-toggle-btn', { active: !localVideoAudio }]"
                  @click.stop="handleVideoAudioToggle(false)"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>

        <n-dropdown :options="videoCountOptions" @select="handleVideoCountSelect">
          <button class="video-bottom-select">
            <span>{{ localVideoCount }}个</span>
            <n-icon :size="12" class="video-bottom-select-icon"><ChevronDownOutline /></n-icon>
          </button>
        </n-dropdown>

        <div class="video-price-pill" :title="estimatedVideoCost.note">
          <span class="video-price-pill-label">预估</span>
          <span class="video-price-pill-value">{{ estimatedVideoCost.label }}</span>
        </div>

        <button class="video-send-btn" title="开始生成">
          <n-icon :size="16"><PlayOutline /></n-icon>
        </button>
      </div>
    </div>

    <!-- Handles | 连接点 -->
    <Handle type="source" :position="Position.Right" id="right" class="handle-dot right" :style="rightHandleStyle" />
    <Handle type="target" :position="Position.Left" id="left" class="handle-dot left" :style="leftHandleStyle" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount, onMounted } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NIcon, NDropdown } from 'naive-ui'
import { PlayOutline, PauseOutline, VideocamOutline, DownloadOutline, ChevronDownOutline, VolumeHighOutline, VolumeMuteOutline } from '@vicons/ionicons5'
import { updateNode } from '../../stores/canvas'
import { VIDEO_MODELS, DEFAULT_VIDEO_MODEL, VIDEO_RATIO_OPTIONS, VIDEO_DURATION_OPTIONS } from '../../config/models'
import { estimateVideoCost } from '../../utils/videoPricing'

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  id: String,
  data: Object,
  position: Object
})

const { getSelectedNodes } = useVueFlow()

// 判断是否是唯一选中的节点
const isSingleSelected = computed(() => {
  const selectedNodes = getSelectedNodes.value
  return selectedNodes.length === 1 && selectedNodes[0]?.id === props.id
})

const videoModelOptions = VIDEO_MODELS.map((item) => ({
  label: item.label,
  key: item.key
}))

const localVideoModel = ref(props.data.videoModel || DEFAULT_VIDEO_MODEL)
const localVideoRatio = ref(props.data.videoRatio || '16x9')
const localVideoDuration = ref(props.data.videoDuration || 5)
const localVideoResolution = ref(props.data.videoResolution || '720P')
const localVideoCount = ref(props.data.videoCount || 1)
const localVideoMode = ref(props.data.videoMode || 'reference-all')
const localVideoPrompt = ref(props.data.videoPrompt || '')
const hasStoredVideoAudio = Object.prototype.hasOwnProperty.call(props.data || {}, 'videoAudio')
const localVideoAudio = ref(hasStoredVideoAudio ? props.data.videoAudio : true)
const isVideoAdvancedPanelOpen = ref(false)
const isVideoModelMenuOpen = ref(false)

const videoModeTabs = [
  { key: 'text-to-video', label: '文生视频' },
  { key: 'reference-all', label: '全能参考' },
  { key: 'image-to-video', label: '图生视频' },
  { key: 'first-last-frame', label: '首尾帧' },
  { key: 'image-reference', label: '图片参考' }
]

const videoCountOptions = [
  { label: '1个', key: 1 },
  { label: '2个', key: 2 },
  { label: '3个', key: 3 },
  { label: '4个', key: 4 }
]

const videoModelMenuItems = VIDEO_MODELS.map((item) => ({
  key: item.key,
  label: item.label,
  brandName: item.key.startsWith('HappyHorse')
    ? 'HappyHorse'
    : item.key.startsWith('doubao-seedance')
      ? 'ByteDance'
      : item.key.startsWith('Kling')
        ? 'Kling'
        : 'ModelVerse',
  brandIcon: item.key.startsWith('HappyHorse')
    ? 'https://www-s.ucloud.cn/2026/04/6a699b7a57f129d7f4ffb71e594609a9_1777516803476.png'
    : item.key.startsWith('doubao-seedance')
      ? 'https://cdn.udelivrs.com/2026/02/3255ed7ccfae86899656ef96d2e62d8b_1770349019868.svg'
      : item.key.startsWith('Kling')
        ? 'https://cdn.udelivrs.com/2026/02/b1c3826dbb3eb4beac17e206e9feedd1_1770349019871.svg'
        : 'https://astraflow.ucloud.cn/static/logo-lg-zh.png',
  badge: item.category === 'text-to-video'
    ? 'T2V'
    : item.category === 'image-to-video'
      ? 'I2V'
      : item.category === 'reference-to-video'
        ? 'R2V'
        : 'EDIT'
}))

const videoResolutionOptions = [
  { label: '480P', key: '480P' },
  { label: '720P', key: '720P' },
  { label: '1080P', key: '1080P' }
]

const categoryLabelMap = {
  'text-to-video': '文生视频',
  'image-to-video': '图生视频',
  'reference-to-video': '参考生视频',
  'video-edit': '视频编辑'
}

const modeHintMap = {
  'text-to-video': '仅需提示词即可生成',
  'image-to-video': '需要图片作为首帧或输入',
  'reference-to-video': '适合带参考图控制风格/主体',
  'video-edit': '适合对已有视频做编辑处理'
}

const currentVideoModel = computed(() =>
  VIDEO_MODELS.find((item) => item.key === localVideoModel.value) || VIDEO_MODELS[0]
)

const availableVideoModeTabs = computed(() => {
  const supportedModes = currentVideoModel.value?.modes || videoModeTabs.map((item) => item.key)
  return videoModeTabs.filter((item) => supportedModes.includes(item.key))
})

const currentVideoModelMeta = computed(() => ({
  label: currentVideoModel.value?.label || '未选择模型',
  categoryLabel: categoryLabelMap[currentVideoModel.value?.category] || '视频模型',
  modeHint: modeHintMap[currentVideoModel.value?.category] || '通用视频生成模型',
  brandName: currentVideoModel.value?.key?.startsWith('HappyHorse')
    ? 'HappyHorse'
    : currentVideoModel.value?.key?.startsWith('doubao-seedance')
      ? 'ByteDance'
      : currentVideoModel.value?.key?.startsWith('Kling')
        ? 'Kling'
        : 'ModelVerse',
  brandIcon: currentVideoModel.value?.key?.startsWith('HappyHorse')
    ? 'https://www-s.ucloud.cn/2026/04/6a699b7a57f129d7f4ffb71e594609a9_1777516803476.png'
    : currentVideoModel.value?.key?.startsWith('doubao-seedance')
      ? 'https://cdn.udelivrs.com/2026/02/3255ed7ccfae86899656ef96d2e62d8b_1770349019868.svg'
      : currentVideoModel.value?.key?.startsWith('Kling')
        ? 'https://cdn.udelivrs.com/2026/02/b1c3826dbb3eb4beac17e206e9feedd1_1770349019871.svg'
        : 'https://astraflow.ucloud.cn/static/logo-lg-zh.png'
}))

const videoPromptPlaceholder = computed(() => {
  if (localVideoMode.value === 'text-to-video') return '描述你想要生成的视频内容'
  return '描述你想要生成的画面内容，@引用素材'
})

const currentRatioOptions = computed(() => {
  const ratios = currentVideoModel.value?.ratios || VIDEO_RATIO_OPTIONS.map((item) => item.key)
  return ratios.map((key) => VIDEO_RATIO_OPTIONS.find((item) => item.key === key) || { label: key, key })
})

const availableResolutionOptions = computed(() => currentVideoModel.value?.resolutions || ['720P'])

const availableDurationOptions = computed(() =>
  ((currentVideoModel.value?.modeDurs?.[localVideoMode.value]) || currentVideoModel.value?.durs || VIDEO_DURATION_OPTIONS)
    .map((item) => ({ label: item.label, key: Number(item.key) }))
    .filter((item) => Number.isFinite(item.key))
)

const supportsVideoAudio = computed(() => Boolean(currentVideoModel.value?.supportsAudio))

const displayVideoRatio = computed(() =>
  currentRatioOptions.value.find((item) => item.key === localVideoRatio.value)?.label || '16:9'
)

const advancedRatioOptions = computed(() => {
  const currentKeys = new Set(currentRatioOptions.value.map((item) => item.key))
  const baseOptions = [
    { label: 'Auto', key: 'auto' },
    { label: '16:9', key: '16x9' },
    { label: '4:3', key: '4x3' },
    { label: '1:1', key: '1x1' },
    { label: '3:4', key: '3x4' },
    { label: '9:16', key: '9x16' },
    { label: '21:9', key: '21x9' }
  ]
  return baseOptions.filter((item) => currentKeys.has(item.key))
})

const videoDurationRange = computed(() => {
  const keys = availableDurationOptions.value.map((item) => item.key).sort((a, b) => a - b)
  if (!keys.length) {
    return { min: 3, max: 15, step: 1 }
  }
  const uniqueGaps = keys.slice(1).map((value, index) => value - keys[index]).filter((gap) => gap > 0)
  const step = uniqueGaps.length === 1 ? uniqueGaps[0] : 1
  return {
    min: keys[0],
    max: keys[keys.length - 1],
    step
  }
})

const showDurationButtonsOnly = computed(() =>
  availableDurationOptions.value.length > 1 && availableDurationOptions.value.length <= 3
)

const showDurationSlider = computed(() =>
  availableDurationOptions.value.length > 3
)

const videoParamSummary = computed(() => {
  const ratioText = localVideoRatio.value === 'auto' ? 'Auto' : displayVideoRatio.value.split(' ')[0]
  return `${ratioText} • ${localVideoResolution.value} • ${localVideoDuration.value}s`
})

const estimatedVideoCost = computed(() => estimateVideoCost({
  model: localVideoModel.value,
  duration: localVideoDuration.value,
  resolution: localVideoResolution.value,
  hasAudio: localVideoAudio.value,
  hasReferenceVideo: false,
  videoMode: localVideoMode.value
}))

const ratioPreviewMap = {
  auto: { width: '14px', height: '10px' },
  '21x9': { width: '18px', height: '8px' },
  '16x9': { width: '17px', height: '9px' },
  '4x3': { width: '14px', height: '11px' },
  '3x2': { width: '15px', height: '10px' },
  '1x1': { width: '10px', height: '10px' },
  '2x3': { width: '9px', height: '13px' },
  '3x4': { width: '10px', height: '14px' },
  '9x16': { width: '8px', height: '15px' }
}

const getRatioPreviewStyle = (key) => {
  const preset = ratioPreviewMap[key] || ratioPreviewMap.auto
  return {
    width: preset.width,
    height: preset.height
  }
}

const ensureVideoSelectionsAreValid = () => {
  const supportedModes = availableVideoModeTabs.value.map((item) => item.key)
  if (supportedModes.length && !supportedModes.includes(localVideoMode.value)) {
    localVideoMode.value = supportedModes[0]
  }

  const supportedRatios = currentRatioOptions.value.map((item) => item.key)
  if (supportedRatios.length && !supportedRatios.includes(localVideoRatio.value)) {
    localVideoRatio.value = supportedRatios[0]
  }

  if (!availableResolutionOptions.value.includes(localVideoResolution.value)) {
    localVideoResolution.value = availableResolutionOptions.value[0]
  }

  const supportedDurations = availableDurationOptions.value.map((item) => item.key)
  if (supportedDurations.length && !supportedDurations.includes(localVideoDuration.value)) {
    localVideoDuration.value = supportedDurations[0]
  }

  if (!supportsVideoAudio.value && localVideoAudio.value) {
    localVideoAudio.value = false
  }
}

const persistVideoDraft = () => {
  updateNode(props.id, {
    videoModel: localVideoModel.value,
    videoRatio: localVideoRatio.value,
    videoDuration: localVideoDuration.value,
    videoResolution: localVideoResolution.value,
    videoCount: localVideoCount.value,
    videoMode: localVideoMode.value,
    videoPrompt: localVideoPrompt.value,
    videoAudio: localVideoAudio.value
  }, false)
}

const handleVideoModelSelect = (key) => {
  localVideoModel.value = key
  const model = VIDEO_MODELS.find((item) => item.key === key)
  if (model?.defaultParams?.ratio) {
    localVideoRatio.value = model.defaultParams.ratio
  }
  if (model?.defaultParams?.duration) {
    localVideoDuration.value = model.defaultParams.duration
  }
  if (model?.defaultParams?.resolution) {
    localVideoResolution.value = model.defaultParams.resolution
  }
  if (typeof model?.defaultParams?.audio === 'boolean') {
    localVideoAudio.value = model.defaultParams.audio
  } else if (model?.supportsAudio) {
    localVideoAudio.value = true
  } else {
    localVideoAudio.value = false
  }
  ensureVideoSelectionsAreValid()
  isVideoModelMenuOpen.value = false
  persistVideoDraft()
}

const handleVideoRatioSelect = (key) => {
  localVideoRatio.value = key
  persistVideoDraft()
}

const handleVideoResolutionSelect = (key) => {
  if (!availableResolutionOptions.value.includes(key)) return
  localVideoResolution.value = key
  persistVideoDraft()
}

const handleVideoDurationRangeInput = (event) => {
  const nextValue = Number(event.target?.value || localVideoDuration.value)
  const supportedDurations = availableDurationOptions.value.map((item) => item.key)
  if (!supportedDurations.length) return
  const nearest = supportedDurations.reduce((prev, current) =>
    Math.abs(current - nextValue) < Math.abs(prev - nextValue) ? current : prev
  )
  localVideoDuration.value = nearest
  persistVideoDraft()
}

const handleVideoDurationSelect = (key) => {
  if (!availableDurationOptions.value.some((item) => item.key === key)) return
  localVideoDuration.value = key
  persistVideoDraft()
}

const handleVideoCountSelect = (key) => {
  localVideoCount.value = key
  persistVideoDraft()
}

const handleVideoModeChange = (key) => {
  if (!availableVideoModeTabs.value.some((item) => item.key === key)) return
  localVideoMode.value = key
  persistVideoDraft()
}

const handleVideoPromptInput = (event) => {
  localVideoPrompt.value = event.target?.value || ''
  persistVideoDraft()
}

const handleVideoAudioToggle = (value) => {
  if (!supportsVideoAudio.value && value) return
  localVideoAudio.value = value
  persistVideoDraft()
}

const toggleVideoAdvancedPanel = () => {
  isVideoAdvancedPanelOpen.value = !isVideoAdvancedPanelOpen.value
  isVideoModelMenuOpen.value = false
  persistVideoDraft()
}

const toggleVideoModelMenu = () => {
  isVideoModelMenuOpen.value = !isVideoModelMenuOpen.value
  if (isVideoModelMenuOpen.value) {
    isVideoAdvancedPanelOpen.value = false
  }
}

const handleDocumentPointerDown = (event) => {
  if (!event.target?.closest?.('.video-model-select-wrap')) {
    isVideoModelMenuOpen.value = false
  }
  if (!event.target?.closest?.('.video-param-combo-wrap')) {
    isVideoAdvancedPanelOpen.value = false
  }
}

// ==================== Handle 靠近放大 ====================
const mouseXFrac = ref(0.5)
const mouseYFrac = ref(0.5)
const isMouseOnNode = ref(false)

const onNodeMouseMove = (e) => {
  const rect = e.currentTarget.getBoundingClientRect()
  mouseXFrac.value = ((e.clientX - rect.left) / rect.width)
  mouseYFrac.value = ((e.clientY - rect.top) / rect.height)
  isMouseOnNode.value = true
}

const onNodeMouseLeave = () => {
  isMouseOnNode.value = false
}

const handleProximityScale = (side) => {
  if (!isMouseOnNode.value) return 1
  const distX = side === 'left' ? mouseXFrac.value : (1 - mouseXFrac.value)
  const distY = Math.abs(mouseYFrac.value - 0.5)
  const dist = Math.sqrt(distX * distX + distY * distY)
  return Math.max(1, 1.6 - dist * 1.5)
}

const leftHandleStyle = computed(() => ({
  top: '50%', marginTop: '-7px', left: '-14px',
  transform: `scale(${handleProximityScale('left')})`,
  transition: isMouseOnNode.value ? 'transform 0.08s linear' : 'transform 0.3s ease-out'
}))

const rightHandleStyle = computed(() => ({
  top: '50%', marginTop: '-7px', right: '-14px',
  transform: `scale(${handleProximityScale('right')})`,
  transition: isMouseOnNode.value ? 'transform 0.08s linear' : 'transform 0.3s ease-out'
}))
// ==================================================

// 视频引用
const videoRef = ref(null)
const isPlaying = ref(false)
const isHovering = ref(false)

const togglePlay = () => {
  if (!videoRef.value) return
  if (videoRef.value.paused) {
    videoRef.value.play()
  } else {
    videoRef.value.pause()
  }
}

// 进度条相关状态
const currentTime = ref(0)
const duration = ref(0)
const isDraggingProgress = ref(false)
const progressTrackRef = ref(null)
let wasPlayingBeforeDrag = false

// 计算当前进度百分比
const progressPercentage = computed(() => {
  if (!duration.value) return 0
  return (currentTime.value / duration.value) * 100
})

// 同步视频播放时间
const onTimeUpdate = (e) => {
  if (!isDraggingProgress.value) {
    currentTime.value = e.target.currentTime
  }
}

// 拖拽进度条相关方法
const startDragProgress = (e) => {
  e.stopPropagation()
  isDraggingProgress.value = true
  if (videoRef.value && !videoRef.value.paused) {
    wasPlayingBeforeDrag = true
    videoRef.value.pause()
  } else {
    wasPlayingBeforeDrag = false
  }
  updateProgressFromMouse(e)
  document.addEventListener('mousemove', onDragProgress)
  document.addEventListener('mouseup', stopDragProgress)
}

const onDragProgress = (e) => {
  if (isDraggingProgress.value) {
    updateProgressFromMouse(e)
  }
}

const stopDragProgress = (e) => {
  if (isDraggingProgress.value) {
    if (e) updateProgressFromMouse(e)
    isDraggingProgress.value = false
    document.removeEventListener('mousemove', onDragProgress)
    document.removeEventListener('mouseup', stopDragProgress)
    
    if (wasPlayingBeforeDrag && videoRef.value) {
      videoRef.value.play()
    }
  }
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onDragProgress)
  document.removeEventListener('mouseup', stopDragProgress)
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
})

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
})

const updateProgressFromMouse = (e) => {
  if (!progressTrackRef.value || !videoRef.value || duration.value === 0) return
  
  const rect = progressTrackRef.value.getBoundingClientRect()
  
  // 获取基于屏幕绝对坐标的相对偏移量 (该方式完全免疫 CSS transform scale 的干扰)
  let x = e.clientX - rect.left
  if (x < 0) x = 0
  if (x > rect.width) x = rect.width
  
  const percentage = x / rect.width
  currentTime.value = percentage * duration.value
  videoRef.value.currentTime = currentTime.value
}

// 节点样式（根据视频尺寸动态调整）
const nodeStyle = computed(() => {
  const width = props.data.width || 400
  const height = props.data.height || 300
  return {
    width: `${width}px`,
    height: `${height}px`,
    border: props.data.selected ? '3px solid #818cf8' : '2px solid rgba(255, 255, 255, 0.08)',
    boxShadow: props.data.selected
      ? '0 0 12px rgba(99, 102, 241, 0.6), 0 0 24px rgba(99, 102, 241, 0.4), 0 0 48px rgba(99, 102, 241, 0.2)'
      : 'none'
  }
})

// 视频加载完成
const onVideoLoad = (e) => {
  const video = e.target
  duration.value = video.duration
  const aspectRatio = video.videoWidth / video.videoHeight

  // 根据视频比例调整节点大小
  let width = 400
  let height = 400 / aspectRatio

  if (height > 600) {
    height = 600
    width = height * aspectRatio
  }

  // 更新节点数据
  updateNode(props.id, {
    width: Math.round(width),
    height: Math.round(height),
    duration: video.duration,
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight
  })
}

// 鼠标移入播放
const handleMouseEnter = () => {
  isHovering.value = true
  if (!videoRef.value || !props.data.url) return
  videoRef.value.play()
}

// 鼠标移出暂停
const handleMouseLeave = () => {
  isHovering.value = false
  if (!videoRef.value || !props.data.url) return
  videoRef.value.pause()
}



// 下载视频
const handleDownload = () => {
  if (!props.data.url) return

  const link = document.createElement('a')
  link.href = props.data.url
  link.download = props.data.label || 'video.mp4'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const formatTime = (value) => {
  if (!Number.isFinite(value)) return '00:00'
  const totalSeconds = Math.max(0, Math.floor(value))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

watch([localVideoRatio, localVideoDuration], () => {
  persistVideoDraft()
})

watch(currentVideoModel, () => {
  ensureVideoSelectionsAreValid()
  persistVideoDraft()
}, { immediate: true })

watch(() => props.data.videoPrompt, (value) => {
  if (typeof value === 'string' && value !== localVideoPrompt.value) {
    localVideoPrompt.value = value
  }
})
</script>

<style scoped>
/* 节点出现动画 */
@keyframes scaleIn {
  from {
    transform: scale(0.3);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.video-node-wrapper {
  position: relative;
  /* 移除这里的动画，因为它会干扰 Handle 的位置计算 */
}

/* 视频节点容器 */
.video-node {
  position: relative;
  background:
    linear-gradient(180deg, rgba(16, 18, 24, 0.98) 0%, rgba(9, 11, 15, 0.98) 100%);
  border-radius: 18px;
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  /* 将动画移动到这里 */
  animation: scaleIn 0.15s ease-out;
  transform-origin: center center;
  backdrop-filter: blur(10px);
}

.video-node.selected {
  /* border and box-shadow handled in inline nodeStyle */
}

.video-node.playing {
  border-color: rgba(148, 163, 184, 0.45);
}

/* 视频容器 */
.video-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at top, rgba(38, 45, 58, 0.28), transparent 50%),
    #05070a;
}

.video-display {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.video-meta-bar {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  pointer-events: none;
  z-index: 10;
}

.video-meta-chip,
.video-meta-time {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(9, 11, 15, 0.58);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  color: rgba(241, 245, 249, 0.88);
  font-size: 12px;
  letter-spacing: 0.02em;
}

.video-meta-time {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  color: rgba(226, 232, 240, 0.78);
}

/* 视频控制层 */
.video-controls {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: rgba(3, 5, 9, 0);
  transition: background 0.18s ease;
}

/* 进度条控件 */
.progress-bar-container {
  position: absolute;
  bottom: 12px;
  left: 12px;
  width: calc(100% - 24px);
  height: 40px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  background: rgba(8, 10, 14, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(14px);
  border-radius: 14px;
  z-index: 20;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
}

.mini-play-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  color: rgba(248, 250, 252, 0.92);
  background: rgba(255, 255, 255, 0.04);
  transition: background 0.18s ease, color 0.18s ease;
  cursor: pointer;
  flex-shrink: 0;
  border: none;
}

.mini-play-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.progress-track {
  position: relative;
  width: 100%;
  height: 3px;
  background: rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  cursor: pointer;
  transition: height 0.18s ease, background 0.18s ease;
}

.progress-bar-container:hover .progress-track,
.progress-track:active {
  height: 5px;
  background: rgba(255, 255, 255, 0.22);
}

.progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, #e2e8f0 0%, #94a3b8 100%);
  border-radius: 999px;
}

.progress-thumb {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  background: #f8fafc;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
  opacity: 0;
  transition: opacity 0.18s ease, transform 0.12s ease;
}

.progress-bar-container:hover .progress-thumb,
.progress-track:active .progress-thumb {
  opacity: 1;
}

.progress-thumb:hover {
  transform: translate(-50%, -50%) scale(1.12);
}

.video-controls:hover {
  background: rgba(3, 5, 9, 0.16);
}

.play-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 68px;
  height: 68px;
  background: rgba(12, 15, 20, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: rgba(248, 250, 252, 0.92);
  transition: transform 0.18s ease, background 0.18s ease;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.24);
}

.play-button.hidden {
  opacity: 0;
  transform: scale(0.8);
}

.video-controls:hover .play-button {
  transform: scale(1.04);
  background: rgba(17, 22, 29, 0.82);
}

.video-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: rgba(148, 163, 184, 0.5);
  min-height: 200px;
  background:
    radial-gradient(circle at top, rgba(30, 41, 59, 0.18), transparent 54%),
    linear-gradient(180deg, rgba(11, 14, 18, 0.96), rgba(7, 9, 12, 0.98));
}

.video-loading {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background:
    linear-gradient(180deg, rgba(14, 17, 22, 0.96), rgba(8, 10, 14, 0.98));
  min-height: 200px;
  color: rgba(226, 232, 240, 0.74);
  font-size: 14px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.08);
  border-top-color: rgba(226, 232, 240, 0.88);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.placeholder-text {
  font-size: 14px;
  color: rgba(148, 163, 184, 0.56);
  letter-spacing: 0.02em;
}

/* 下载按钮 */
.download-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: rgba(9, 11, 15, 0.58);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  color: rgba(248, 250, 252, 0.9);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.18s ease, transform 0.18s ease, border-color 0.18s ease;
  z-index: 10;
}

.download-btn:hover {
  background: rgba(18, 24, 32, 0.9);
  border-color: rgba(255, 255, 255, 0.16);
  transform: translateY(-1px);
}

/* 连接点样式 */
.handle-dot {
  width: 14px !important;
  height: 14px !important;
  background: rgba(15, 23, 42, 0.18) !important;
  border: 2px solid rgba(203, 213, 225, 0.38) !important;
  border-radius: 50% !important;
  opacity: 0.42 !important;
  transition: all 0.2s;
  transform-origin: center center !important;
  position: absolute !important;
  z-index: 100 !important;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.18) !important;
}

.handle-dot:hover {
  transform: scale(1.08) !important;
  opacity: 0.72 !important;
  background: rgba(15, 23, 42, 0.28) !important;
  border-color: rgba(226, 232, 240, 0.58) !important;
  box-shadow: 0 0 0 3px rgba(226, 232, 240, 0.05) !important;
}

.handle-dot.right {
  right: -14px !important;
}

.handle-dot.left {
  left: -14px !important;
}

.video-generate-panel {
  position: absolute;
  top: calc(100% + 14px);
  left: 50%;
  transform: translateX(-50%);
  width: 640px;
  padding: 10px 12px 12px;
  border-radius: 16px;
  background: rgba(24, 24, 26, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(18px);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.28);
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 40;
}

.video-mode-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.video-mode-tab {
  height: 30px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  background: rgba(255, 255, 255, 0.02);
  color: rgba(214, 214, 219, 0.72);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.16s ease;
}

.video-mode-tab:hover {
  color: rgba(245, 245, 247, 0.94);
  border-color: rgba(255, 255, 255, 0.34);
  background: rgba(255, 255, 255, 0.05);
}

.video-mode-tab.active {
  color: rgba(255, 255, 255, 0.98);
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.24);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.video-panel-expand {
  margin-left: auto;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  cursor: pointer;
}

.video-ref-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.video-tool-btn {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.02);
  color: rgba(212, 212, 216, 0.72);
  font-size: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  cursor: pointer;
}

.video-tool-icon {
  font-size: 13px;
  line-height: 1;
}

.video-ref-thumb {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
}

.video-ref-thumb img,
.video-ref-thumb-placeholder {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.45);
}

.video-ref-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 999px;
  background: rgba(12, 12, 14, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(248, 250, 252, 0.92);
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-prompt-box {
  min-height: 96px;
  border-radius: 14px;
  padding: 4px 0 0;
  position: relative;
  z-index: 2;
}

.video-prompt-editor {
  width: 100%;
  min-height: 84px;
  outline: none;
  border: none;
  background: transparent;
  color: rgba(236, 236, 240, 0.9);
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  resize: none;
  font-family: inherit;
  padding: 0;
  display: block;
}

.video-bottom-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding-top: 2px;
  position: relative;
}

.video-bottom-select {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 6px;
  border: none;
  background: transparent;
  color: rgba(236, 236, 240, 0.92);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  border-radius: 10px;
  transition: background 0.16s ease, color 0.16s ease;
}

.video-bottom-select:hover {
  background: rgba(255, 255, 255, 0.05);
}

.video-bottom-select-model {
  font-weight: 650;
  color: rgba(248, 250, 252, 0.96);
}

.video-bottom-select-static {
  cursor: default;
}

.video-bottom-select-icon {
  color: rgba(255, 255, 255, 0.55);
  transition: transform 0.18s ease;
}

.video-bottom-select-icon.is-open {
  transform: rotate(180deg);
}

.video-bottom-select-strong {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.video-bottom-select-strong-model {
  gap: 11px;
  min-width: 0;
}

.video-model-trigger-brand {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.video-model-trigger-brand-image {
  width: 22px;
  height: 22px;
  object-fit: contain;
  display: block;
}

.video-price-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(228, 228, 231, 0.88);
  white-space: nowrap;
}

.video-price-pill-label {
  color: rgba(161, 161, 170, 0.78);
  font-size: 11px;
}

.video-price-pill-value {
  color: rgba(244, 244, 245, 0.94);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.video-model-select-wrap {
  position: relative;
}

.video-model-trigger {
  padding: 0 12px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.065), rgba(255, 255, 255, 0.025));
  border: 1px solid rgba(255, 255, 255, 0.075);
  min-width: 178px;
  justify-content: space-between;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 8px 18px rgba(0, 0, 0, 0.14);
}

.video-model-menu {
  position: absolute;
  left: 0;
  top: calc(100% + 12px);
  width: 296px;
  max-height: 320px;
  padding: 11px 8px;
  border-radius: 18px;
  background: rgba(20, 20, 22, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(18px);
  box-shadow: 0 22px 48px rgba(0, 0, 0, 0.34);
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  z-index: 28;
}

.video-model-menu::-webkit-scrollbar {
  width: 8px;
}

.video-model-menu::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 999px;
}

.video-model-option {
  width: 100%;
  min-height: 42px;
  padding: 0 12px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: rgba(236, 236, 240, 0.9);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-align: left;
  cursor: pointer;
  transition: background 0.16s ease, color 0.16s ease;
}

.video-model-option-left {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
  flex: 1;
}

.video-model-brand {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.video-model-brand-image {
  width: 20px;
  height: 20px;
  object-fit: contain;
  display: block;
}

.video-model-option:hover {
  background: rgba(255, 255, 255, 0.035);
}

.video-model-option.active {
  background: rgba(255, 255, 255, 0.055);
}

.video-model-option-main {
  font-size: 13px;
  font-weight: 620;
  color: rgba(248, 250, 252, 0.95);
  line-height: 1.2;
  min-width: 0;
}

.video-model-option-side {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 20px;
  padding: 0;
  border-radius: 0;
  background: transparent;
  border: none;
  color: rgba(161, 161, 170, 0.9);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.video-param-combo-wrap {
  position: relative;
}

.video-bottom-select-combo {
  padding: 0 11px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(255, 255, 255, 0.07);
  color: rgba(236, 236, 240, 0.88);
}

.video-param-summary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  letter-spacing: 0.01em;
}

.video-param-audio-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(146, 146, 153, 0.78);
  flex-shrink: 0;
}

.video-param-audio-indicator.enabled {
  color: rgba(194, 194, 199, 0.84);
}

.video-param-audio-indicator.active {
  color: rgba(250, 250, 250, 0.98);
}

.video-advanced-panel {
  position: absolute;
  left: 0;
  top: calc(100% + 12px);
  width: 336px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(20, 20, 22, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.32);
  display: flex;
  flex-direction: column;
  gap: 16px;
  z-index: 20;
}

.video-advanced-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.video-advanced-section-toggle {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.video-advanced-label {
  color: rgba(244, 244, 245, 0.94);
  font-size: 13px;
  font-weight: 600;
}

.video-advanced-hint {
  margin-top: 4px;
  color: rgba(161, 161, 170, 0.68);
  font-size: 11px;
}

.video-advanced-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.video-advanced-value {
  color: rgba(244, 244, 245, 0.9);
  font-size: 12px;
  font-weight: 700;
}

.video-chip-group {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.video-ratio-card {
  width: 100%;
  min-height: 54px;
  padding: 6px 4px 6px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.11);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  cursor: pointer;
  transition: border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
}

.video-ratio-card:hover {
  border-color: rgba(255, 255, 255, 0.22);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
  transform: translateY(-1px);
}

.video-ratio-card.active {
  border-color: rgba(255, 255, 255, 0.88);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.05));
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.12),
    0 6px 18px rgba(0, 0, 0, 0.16);
}

.video-ratio-card-preview {
  width: 100%;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-ratio-card-frame {
  display: inline-block;
  border: 1.5px solid rgba(255, 255, 255, 0.68);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.02);
  box-sizing: border-box;
}

.video-ratio-card.active .video-ratio-card-frame {
  border-color: rgba(255, 255, 255, 0.96);
}

.video-ratio-card-label {
  color: rgba(212, 212, 216, 0.82);
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.01em;
}

.video-ratio-card.active .video-ratio-card-label {
  color: rgba(250, 250, 250, 0.96);
}

.video-chip-btn,
.video-toggle-btn {
  height: 32px;
  padding: 0 12px;
  border-radius: 11px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(212, 212, 216, 0.8);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.16s ease;
}

.video-chip-btn:hover,
.video-toggle-btn:hover {
  border-color: rgba(255, 255, 255, 0.18);
  color: rgba(244, 244, 245, 0.94);
}

.video-toggle-btn.disabled {
  opacity: 0.42;
  cursor: not-allowed;
  border-color: rgba(255, 255, 255, 0.06);
  color: rgba(161, 161, 170, 0.74);
}

.video-toggle-btn.disabled:hover {
  transform: none;
  border-color: rgba(255, 255, 255, 0.06);
  color: rgba(161, 161, 170, 0.74);
}

.video-chip-btn.active,
.video-toggle-btn.active {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08));
  border-color: rgba(255, 255, 255, 0.24);
  color: rgba(255, 255, 255, 0.98);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.video-toggle-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.video-duration-slider {
  width: 100%;
  appearance: none;
  height: 5px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(244, 244, 245, 0.88), rgba(115, 115, 115, 0.34));
  outline: none;
}

.video-duration-slider:disabled {
  opacity: 0.22;
  cursor: default;
}

.video-duration-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(24, 24, 27, 0.92);
  background: rgba(250, 250, 250, 0.96);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.24);
  cursor: pointer;
}

.video-duration-ticks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.video-duration-ticks-inline {
  flex-wrap: nowrap;
}

.video-duration-tick {
  height: 28px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(212, 212, 216, 0.82);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.16s ease;
}

.video-duration-tick:hover {
  border-color: rgba(255, 255, 255, 0.18);
  color: rgba(244, 244, 245, 0.94);
}

.video-duration-tick.active {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08));
  border-color: rgba(255, 255, 255, 0.24);
  color: rgba(255, 255, 255, 0.98);
}

.video-duration-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(24, 24, 27, 0.92);
  background: rgba(250, 250, 250, 0.96);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.24);
  cursor: pointer;
}

.video-send-btn {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 10px;
  background: #f4f4f5;
  color: #1f2937;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-left: auto;
}
</style>
