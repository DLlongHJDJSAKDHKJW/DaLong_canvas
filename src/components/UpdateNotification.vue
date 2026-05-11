<template>
  <n-modal
    v-model:show="showUpdateModal"
    preset="dialog"
    :title="updateTitle"
    :positive-text="updateAction"
    :negative-text="updateStatus === 'ready' ? '稍后' : undefined"
    :closable="updateStatus !== 'downloading'"
    :close-on-esc="updateStatus !== 'downloading'"
    :mask-closable="updateStatus !== 'downloading'"
    @positive-click="handleAction"
  >
    <div class="update-content">
      <p v-if="updateStatus === 'available'">
        发现新版本 <strong>{{ updateInfo?.version }}</strong>，是否立即下载更新？
      </p>
      <p v-else-if="updateStatus === 'downloading'">
        正在下载更新... {{ downloadProgress }}%
        <n-progress
          type="line"
          :percentage="downloadProgress"
          :show-indicator="false"
          class="mt-2"
        />
      </p>
      <p v-else-if="updateStatus === 'ready'">
        更新已下载完成，重启应用即可安装新版本。
      </p>
    </div>
  </n-modal>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { NModal, NProgress } from 'naive-ui'

const showUpdateModal = ref(false)
const updateStatus = ref('') // 'available' | 'downloading' | 'ready'
const updateInfo = ref(null)
const downloadProgress = ref(0)

const updateTitle = ref('发现新版本')
const updateAction = ref('立即下载')

onMounted(() => {
  // 检查是否在 Electron 环境
  if (!window.electronAPI?.isElectron) return

  // 监听更新可用事件
  window.electronAPI.onUpdateAvailable((info) => {
    console.log('发现新版本:', info)
    updateInfo.value = info
    updateStatus.value = 'downloading'
    updateTitle.value = '正在下载更新'
    updateAction.value = ''
    showUpdateModal.value = true
  })

  // 监听下载进度
  window.electronAPI.onUpdateProgress((progress) => {
    console.log('下载进度:', progress.percent)
    updateStatus.value = 'downloading'
    downloadProgress.value = Math.round(progress.percent)
    updateTitle.value = '正在下载更新'
    updateAction.value = ''
  })

  // 监听更新就绪
  window.electronAPI.onUpdateReady((info) => {
    console.log('更新已就绪:', info)
    updateStatus.value = 'ready'
    updateTitle.value = '更新已就绪'
    updateAction.value = '立即重启'
    showUpdateModal.value = true
  })
})

const handleAction = () => {
  if (updateStatus.value === 'available') {
    // 开始下载（自动进行，无需手动触发）
    updateStatus.value = 'downloading'
    updateTitle.value = '正在下载更新'
  } else if (updateStatus.value === 'ready') {
    // 安装更新并重启
    window.electronAPI.installUpdate()
  }
}
</script>

<style scoped>
.update-content {
  padding: 12px 0;
}

.update-content p {
  margin: 0;
  line-height: 1.6;
}

.update-content strong {
  color: var(--accent-color);
}
</style>
