<template>
  <!-- API Settings Modal | API 设置弹窗 -->
  <n-modal
    v-model:show="showModal"
    :mask-closable="false"
    :close-on-esc="false"
    transform-origin="center"
  >
    <div class="api-settings-container">
      <!-- Header | 头部 -->
      <div class="settings-header">
        <div class="header-content">
          <div class="header-icon">
            <n-icon :size="28"><KeyOutline /></n-icon>
          </div>
          <div class="header-text">
            <h2 class="header-title">API 配置中心</h2>
            <p class="header-subtitle">连接 ModelVerse AI 服务</p>
          </div>
        </div>
        <button @click="showModal = false" class="close-btn">
          <n-icon :size="20"><CloseOutline /></n-icon>
        </button>
      </div>

      <!-- Status Banner | 状态横幅 -->
      <div class="status-banner" :class="statusClass">
        <div class="status-indicator">
          <div class="indicator-dot"></div>
        </div>
        <div class="status-content">
          <div class="status-title">{{ statusTitle }}</div>
          <div class="status-desc">{{ statusDesc }}</div>
        </div>
        <div v-if="isConfigured" class="status-badge">
          <n-icon :size="18"><CheckmarkCircleOutline /></n-icon>
        </div>
      </div>

      <!-- Form | 表单 -->
      <div class="settings-form">
        <div class="form-group">
          <label class="form-label">
            <n-icon :size="16" class="label-icon"><GlobeOutline /></n-icon>
            请求地址
          </label>
          <div class="input-wrapper">
            <n-input
              v-model:value="formData.baseUrl"
              placeholder="https://api.modelverse.cn/v1"
              size="large"
              :bordered="false"
              class="custom-input"
            />
          </div>
          <div class="form-hint">API 服务端点地址</div>
        </div>

        <div class="form-group">
          <label class="form-label">
            <n-icon :size="16" class="label-icon"><LockClosedOutline /></n-icon>
            API Key
          </label>
          <div class="input-wrapper">
            <n-input
              v-model:value="formData.apiKey"
              type="password"
              show-password-on="click"
              placeholder="请输入 ModelVerse API Key"
              size="large"
              :bordered="false"
              class="custom-input"
            >
              <template #password-visible-icon>
                <n-icon :size="18"><EyeOutline /></n-icon>
              </template>
              <template #password-invisible-icon>
                <n-icon :size="18"><EyeOffOutline /></n-icon>
              </template>
            </n-input>
          </div>
          <div class="form-hint">用于身份验证的密钥</div>
        </div>
      </div>

      <!-- Divider | 分隔线 -->
      <div class="section-divider">
        <span class="divider-text">系统信息</span>
      </div>

      <!-- Version Update Card | 版本更新卡片 -->
      <div class="update-section">
        <div class="update-card">
          <div class="update-header">
            <div class="version-info">
              <n-tag
                :bordered="false"
                :type="updateTagType"
                size="small"
                round
                class="version-tag"
              >
                v{{ currentVersion }}
              </n-tag>
              <span class="version-label">DaLong Canvas</span>
            </div>
            <div class="update-status" :class="{ 'status-active': isChecking || isDownloading }">
              {{ updateStatus }}
            </div>
          </div>

          <!-- Progress Bar | 进度条 -->
          <div v-if="isDownloading" class="progress-wrapper">
            <n-progress
              type="line"
              :percentage="downloadProgress"
              :indicator-placement="'inside'"
              processing
              status="info"
              border-radius="8px"
              :height="20"
              :fill-border-radius="8"
            />
          </div>

          <!-- Action Button | 操作按钮 -->
          <div class="update-actions">
            <n-button
              v-if="updateReady"
              type="error"
              size="large"
              strong
              round
              block
              @click="handleInstallUpdate"
            >
              <template #icon><n-icon><ReloadOutline /></n-icon></template>
              立即重启更新
            </n-button>
            <n-button
              v-else-if="updateAvailable && !isDownloading"
              type="primary"
              size="large"
              strong
              round
              block
              @click="handleDownloadUpdate"
            >
              <template #icon><n-icon><DownloadOutline /></n-icon></template>
              下载更新
            </n-button>
            <n-button
              v-else
              size="large"
              round
              block
              secondary
              @click="handleCheckUpdate"
              :loading="isChecking || isDownloading"
              :disabled="updateLatest"
            >
              <template #icon v-if="!isChecking && !updateLatest">
                <n-icon><RefreshOutline /></n-icon>
              </template>
              <template #icon v-if="updateLatest">
                <n-icon><CheckmarkCircleOutline /></n-icon>
              </template>
              {{ isChecking ? '检查中...' : updateLatest ? '已是最新' : '检查更新' }}
            </n-button>
          </div>
        </div>
      </div>

      <!-- Footer Actions | 底部操作 -->
      <div class="settings-footer">
        <n-button
          @click="handleClear"
          tertiary
          size="large"
          class="footer-btn"
        >
          <template #icon><n-icon><TrashOutline /></n-icon></template>
          清除配置
        </n-button>
        <div class="footer-primary-actions">
          <n-button
            @click="showModal = false"
            size="large"
            quaternary
            class="footer-btn"
          >
            取消
          </n-button>
          <n-button
            type="primary"
            @click="handleSave"
            size="large"
            strong
            class="footer-btn save-btn"
          >
            <template #icon><n-icon><SaveOutline /></n-icon></template>
            保存配置
          </n-button>
        </div>
      </div>
    </div>
  </n-modal>
</template>

<script setup>
/**
 * API Settings Component | API 设置组件
 * 重新设计的版本 - 现代化视觉风格
 */
import { ref, reactive, watch, computed, onMounted } from 'vue'
import { NModal, NInput, NButton, NProgress, NTag, NIcon } from 'naive-ui'
import {
  RefreshOutline,
  DownloadOutline,
  ReloadOutline,
  KeyOutline,
  CloseOutline,
  GlobeOutline,
  LockClosedOutline,
  EyeOutline,
  EyeOffOutline,
  CheckmarkCircleOutline,
  TrashOutline,
  SaveOutline
} from '@vicons/ionicons5'
import { useModelStore } from '../stores/pinia'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:show', 'saved'])

const modelStore = useModelStore()
const isConfigured = computed(() => !!modelStore.currentApiKey)

const showModal = ref(props.show)

const formData = reactive({
  apiKey: '',
  baseUrl: ''
})

// Status computed properties | 状态计算属性
const statusClass = computed(() =>
  isConfigured.value ? 'status-connected' : 'status-disconnected'
)

const statusTitle = computed(() =>
  isConfigured.value ? '已连接' : '未配置'
)

const statusDesc = computed(() =>
  isConfigured.value
    ? 'API 已就绪，可以使用所有 AI 功能'
    : '请填写 API Key 以启用 AI 对话和生成功能'
)

const updateTagType = computed(() => {
  if (updateReady.value) return 'error'
  if (updateAvailable.value) return 'warning'
  if (updateLatest.value) return 'success'
  return 'info'
})

watch(() => props.show, (val) => {
  showModal.value = val
  if (val) {
    formData.apiKey = modelStore.currentApiKey || ''
    formData.baseUrl = modelStore.currentBaseUrl || ''
  }
})

watch(showModal, (val) => {
  emit('update:show', val)
})

const handleSave = () => {
  modelStore.setBaseUrl(formData.baseUrl)
  if (formData.apiKey) {
    modelStore.setApiKey(formData.apiKey)
  }
  showModal.value = false
  emit('saved')

  // 显示成功提示
  window.$message?.success('API 配置已保存')
}

const handleClear = () => {
  modelStore.clearApiConfig()
  formData.apiKey = ''
  formData.baseUrl = modelStore.currentBaseUrl || ''
  window.$message?.info('配置已清除')
}

// ----------------- 版本更新逻辑 -----------------
const isChecking = ref(false)
const updateLatest = ref(false)
const updateStatus = ref('点击检查更新按钮获取最新版本')
const updateAvailable = ref(false)
const isDownloading = ref(false)
const downloadProgress = ref(0)
const updateReady = ref(false)
const currentVersion = ref('1.0.0')

onMounted(async () => {
  if (!window.electronAPI) return

  // 获取当前实际版本号
  try {
    const version = await window.electronAPI.getAppVersion()
    if (version) currentVersion.value = version
  } catch (e) {
    console.error('获取版本号失败', e)
  }

  electronAPI.onUpdateAvailable(() => {
    isChecking.value = false
    updateAvailable.value = true
    updateStatus.value = '发现新版本可用'
  })

  electronAPI.onUpdateNotAvailable(() => {
    isChecking.value = false
    updateLatest.value = true
    updateStatus.value = '当前已是最新版本'
    setTimeout(() => {
      updateLatest.value = false
      updateStatus.value = '点击检查更新按钮获取最新版本'
    }, 5000)
  })

  electronAPI.onUpdateProgress((progress) => {
    isDownloading.value = true
    downloadProgress.value = Math.round(progress.percent || 0)
    updateStatus.value = `正在下载更新... ${downloadProgress.value}%`
  })

  electronAPI.onUpdateReady(() => {
    isDownloading.value = false
    updateReady.value = true
    updateStatus.value = '更新已下载完成，准备安装'
  })
})

const handleCheckUpdate = async () => {
  if (!window.electronAPI) {
    window.$message?.warning('仅桌面端支持自动更新')
    return
  }
  isChecking.value = true
  updateStatus.value = '正在检查更新...'

  try {
    const result = await window.electronAPI.checkForUpdates()
    if (result === null) {
      isChecking.value = false
      updateStatus.value = '开发环境不支持更新检查'
      window.$message?.warning('当前为开发环境')
      setTimeout(() => {
        updateStatus.value = '点击检查更新按钮获取最新版本'
      }, 4000)
    }
  } catch (error) {
    isChecking.value = false
    updateStatus.value = '检查更新失败'
    window.$message?.error('无法连接到更新服务器')
    setTimeout(() => {
      updateStatus.value = '点击检查更新按钮获取最新版本'
    }, 4000)
  }
}

const handleDownloadUpdate = async () => {
  if (!window.electronAPI) return
  isDownloading.value = true
  updateStatus.value = '准备下载更新...'

  try {
    const result = await window.electronAPI.downloadUpdate()
    if (result === null) {
      isDownloading.value = false
      updateStatus.value = '下载失败'
    }
  } catch (error) {
    isDownloading.value = false
    updateStatus.value = '下载更新失败'
    window.$message?.error('下载过程中出现错误')
    setTimeout(() => {
      updateStatus.value = '点击检查更新按钮获取最新版本'
    }, 4000)
  }
}

const handleInstallUpdate = () => {
  if (!window.electronAPI) return
  window.electronAPI.installUpdate()
}
</script>

<style scoped>
/* Container | 容器 */
.api-settings-container {
  width: 520px;
  background: linear-gradient(135deg, #1a1a1c 0%, #1e1e20 100%);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  animation: modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Header | 头部 */
.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28px 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: linear-gradient(to bottom, rgba(99, 102, 241, 0.05), transparent);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 14px;
  color: white;
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  letter-spacing: -0.3px;
}

.header-subtitle {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 400;
}

.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  transform: scale(1.05);
}

/* Status Banner | 状态横幅 */
.status-banner {
  margin: 24px 32px;
  padding: 20px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.status-banner::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent, rgba(255, 255, 255, 0.03));
  pointer-events: none;
}

.status-disconnected {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.status-connected {
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.status-indicator {
  flex-shrink: 0;
}

.indicator-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.status-disconnected .indicator-dot {
  background: #ef4444;
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.6);
}

.status-connected .indicator-dot {
  background: #22c55e;
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.6);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

.status-content {
  flex: 1;
}

.status-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 4px;
}

.status-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.5;
}

.status-badge {
  flex-shrink: 0;
  color: #22c55e;
}

/* Form | 表单 */
.settings-form {
  padding: 0 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: 0.3px;
}

.label-icon {
  color: rgba(99, 102, 241, 0.8);
}

.input-wrapper {
  position: relative;
}

.custom-input {
  background: rgba(255, 255, 255, 0.04) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 12px !important;
  transition: all 0.2s;
}

.custom-input:hover {
  background: rgba(255, 255, 255, 0.06) !important;
  border-color: rgba(99, 102, 241, 0.3) !important;
}

.custom-input:focus-within {
  background: rgba(255, 255, 255, 0.06) !important;
  border-color: #6366f1 !important;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

:deep(.n-input__input-el) {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
}

:deep(.n-input__placeholder) {
  color: rgba(255, 255, 255, 0.3);
}

.form-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  padding-left: 2px;
}

/* Section Divider | 分隔线 */
.section-divider {
  display: flex;
  align-items: center;
  margin: 32px 32px 24px;
  opacity: 0.4;
}

.section-divider::before,
.section-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(255, 255, 255, 0.15),
    transparent
  );
}

.divider-text {
  padding: 0 16px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 600;
}

/* Update Section | 更新区域 */
.update-section {
  padding: 0 32px;
  margin-bottom: 24px;
}

.update-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 20px;
  transition: all 0.3s;
}

.update-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(99, 102, 241, 0.2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.update-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.version-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.version-tag {
  font-weight: 600;
  font-size: 11px;
}

.version-label {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

.update-status {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.5;
  transition: color 0.3s;
}

.status-active {
  color: #6366f1;
  font-weight: 500;
}

.progress-wrapper {
  margin-bottom: 16px;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.update-actions {
  margin-top: 16px;
}

/* Footer | 底部 */
.settings-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.15);
}

.footer-primary-actions {
  display: flex;
  gap: 12px;
}

.footer-btn {
  min-width: 100px;
  border-radius: 12px;
  font-weight: 600;
}

.save-btn {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  transition: all 0.2s;
}

.save-btn:hover {
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
  transform: translateY(-1px);
}

/* Responsive | 响应式 */
@media (max-width: 600px) {
  .api-settings-container {
    width: calc(100vw - 32px);
    max-width: 520px;
  }

  .settings-header,
  .settings-form,
  .update-section,
  .settings-footer,
  .section-divider {
    padding-left: 24px;
    padding-right: 24px;
  }

  .status-banner {
    margin-left: 24px;
    margin-right: 24px;
  }
}
</style>
