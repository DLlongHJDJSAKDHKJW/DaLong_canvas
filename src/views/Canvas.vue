<template>
  <!-- Canvas page | 画布页面 -->
  <div class="h-screen w-screen bg-[var(--bg-primary)]">
    <!-- Main canvas area | 主画布区域 -->
    <div class="h-full flex overflow-hidden">
      <div
        ref="canvasContainerRef"
        class="flex-1 relative overflow-hidden"
        @contextmenu.prevent
        @mousedown.capture="handleGlobalMousedown"
        @wheel.capture="stopInertia"
        @touchstart.capture="stopInertia"
        @mousemove="handleCanvasMouseMove"
      >
        <!-- Vue Flow canvas | Vue Flow 画布 -->
        <VueFlow
          :key="flowKey"
          v-model:nodes="nodesProxy"
          v-model:edges="edgesProxy"
          :node-types="nodeTypes"
          :edge-types="edgeTypes"
          :default-viewport="canvasViewport"
          :min-zoom="0.1"
          :max-zoom="2"
          :snap-to-grid="true"
          :snap-grid="[20, 20]"
          :zoom-on-double-click="false"
          :pan-on-drag="[1, 2]"
          :select-nodes-on-drag="true"
          :nodes-draggable="true"
          :nodes-connectable="true"
          :elements-selectable="true"
          :selection-key-code="true"
          selection-on-drag
          :selection-mode="SelectionMode.Partial"
          @dragover.prevent="onDragOver"
          @drop.prevent="onDrop"
          multi-selection-key-code="Shift"
          delete-key-code="Delete"
          @connect="onConnect"
          @connect-start="onConnectStart"
          @connect-end="onConnectEnd"
          @pane-click="onPaneClick"
          @nodes-change="onNodesChange"
          @node-double-click="onNodeDoubleClick"
          @viewport-change="handleViewportChange"
          @edges-change="onEdgesChange"
          @node-drag-start="onNodeDragStart"
          @node-drag-stop="onNodeDragStop"
          class="canvas-flow"
        >
          <Background v-if="showGrid" :gap="20" :size="1" />
        </VueFlow>

      <div class="absolute left-5 top-5 z-20 flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/92 p-1.5 shadow-2xl backdrop-blur transition-all">
        <button 
          @click="goBack"
          class="p-2 hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors"
          title="返回项目列表"
        >
          <n-icon :size="18"><ChevronBackOutline /></n-icon>
        </button>
        <div class="h-6 w-px bg-[var(--border-color)]"></div>
        <img
          src="/logo.png"
          alt="大龙无限画布 Logo"
          class="h-8 w-8 rounded-lg object-cover"
        />
        <n-dropdown :options="projectOptions" @select="handleProjectAction">
          <button class="flex items-center gap-1 rounded-xl px-2 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--bg-tertiary)]">
            <span class="max-w-[160px] truncate">{{ projectName }}</span>
            <n-icon :size="16"><ChevronDownOutline /></n-icon>
          </button>
        </n-dropdown>
      </div>

      <div v-if="!isMobile" class="minimap-shell absolute bottom-5 left-5 z-20">
        <MiniMap
          pannable
          zoomable
          :node-color="minimapNodeColor"
          :node-stroke-color="minimapNodeStrokeColor"
          :node-stroke-width="2"
          :mask-color="'rgba(99,102,241,0.12)'"
          class="sidebar-minimap"
        />
      </div>

      <!-- Left toolbar | 左侧工具栏 -->
      <aside class="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 p-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-lg z-10">
        <button
          @click="showNodeMenu = !showNodeMenu"
          class="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)] transition-colors"
          title="添加节点"
        >
          <n-icon :size="20"><AddOutline /></n-icon>
        </button>
        <button
          @click="handleImportFile"
          class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors"
          title="导入图片/视频"
        >
          <n-icon :size="20"><ImageOutline /></n-icon>
        </button>
        <div class="w-full h-px bg-[var(--border-color)] my-1"></div>
        <button 
          v-for="tool in tools" 
          :key="tool.id"
          @click="tool.action"
          :disabled="tool.disabled && tool.disabled()"
          class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          :title="tool.name"
        >
          <n-icon :size="20"><component :is="tool.icon" /></n-icon>
        </button>
      </aside>

      <!-- Node menu popup | 节点菜单弹窗 -->
      <div 
        v-if="showNodeMenu"
        class="absolute left-20 top-1/2 -translate-y-1/2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-lg p-2 z-20"
      >
        <button 
          v-for="nodeType in nodeTypeOptions" 
          :key="nodeType.type"
          @click="addNewNode(nodeType.type)"
          class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-left"
        >
          <n-icon :size="20" :color="nodeType.color"><component :is="nodeType.icon" /></n-icon>
          <span class="text-sm">{{ nodeType.name }}</span>
        </button>
      </div>

      <div
        v-if="showQuickCreateMenu"
        class="absolute z-30 min-w-[220px] rounded-3xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/96 p-2 shadow-2xl backdrop-blur quick-create-menu-animation"
        :style="{
          left: `${quickCreateMenuPosition.x}px`,
          top: `${quickCreateMenuPosition.y}px`
        }"
      >
        <div class="flex items-center justify-between px-2 py-1.5">
          <div class="text-xs tracking-[0.22em] text-[var(--text-secondary)] uppercase">
            新建卡片
          </div>
          <div class="rounded-full border border-[var(--border-color)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
            双击
          </div>
        </div>
        <button
          v-for="item in quickCreateOptions"
          :key="item.type"
          @click="createNodeAtQuickMenu(item.type)"
          class="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all hover:bg-[var(--bg-tertiary)]"
        >
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)]">
            <n-icon :size="18" class="text-[var(--text-primary)]"><component :is="item.icon" /></n-icon>
          </div>
          <div>
            <div class="text-sm font-medium text-[var(--text-primary)]">{{ item.name }}</div>
            <div class="text-xs text-[var(--text-secondary)]">{{ item.description }}</div>
          </div>
        </button>
      </div>

      <!-- Connection menu | 连接菜单 - 从连接点拖出时显示 -->
      <div
        v-if="showConnectionMenu"
        class="fixed z-50 min-w-[200px] rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/98 p-2 shadow-2xl backdrop-blur"
        :style="{
          left: `${connectionMenuPosition.x}px`,
          top: `${connectionMenuPosition.y}px`,
          transform: 'translate(-50%, 0)'
        }"
      >
        <div class="px-2 py-1.5 text-xs text-[var(--text-secondary)]">
          新建卡片
        </div>
        <button
          v-for="item in quickCreateOptions"
          :key="item.type"
          @click="createNodeFromConnection(item.type)"
          class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-[var(--bg-tertiary)]"
        >
          <div class="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)]">
            <n-icon :size="16"><component :is="item.icon" /></n-icon>
          </div>
          <span class="text-sm">{{ item.name }}</span>
        </button>
      </div>

      <!-- View controls | 视图控制 -->
      <div class="absolute right-5 top-5 z-20 flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/92 p-1.5 shadow-2xl backdrop-blur transition-all">
        <!-- <button 
          @click="showGrid = !showGrid" 
          :class="showGrid ? 'bg-[var(--accent-color)] text-white' : 'hover:bg-[var(--bg-tertiary)]'"
          class="p-2 rounded transition-colors"
          title="切换网格"
        >
          <n-icon :size="16"><GridOutline /></n-icon>
        </button> -->
        <button 
          @click="fitView({ padding: 0.2 })" 
          class="p-2 hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors"
          title="适应视图"
        >
          <n-icon :size="16"><LocateOutline /></n-icon>
        </button>
        <div class="flex items-center gap-1 px-2">
          <button @click="zoomOut" class="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors">
            <n-icon :size="14"><RemoveOutline /></n-icon>
          </button>
          <span class="text-xs min-w-[40px] text-center">{{ Math.round(viewport.zoom * 100) }}%</span>
          <button @click="zoomIn" class="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors">
            <n-icon :size="14"><AddOutline /></n-icon>
          </button>
        </div>
        <div class="h-6 w-px bg-[var(--border-color)]"></div>
        <button
          @click="toggleTheme"
          class="p-2 hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors"
          title="切换主题"
        >
          <n-icon :size="16">
            <SunnyOutline v-if="isDark" />
            <MoonOutline v-else />
          </n-icon>
        </button>
        <button
          @click="showApiSettings = true"
          class="p-2 hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors"
          :class="{ 'text-[var(--accent-color)]': isApiConfigured }"
          title="API 设置"
        >
          <n-icon :size="16"><SettingsOutline /></n-icon>
        </button>
        <button
          @click="showHelpModal = true"
          class="p-2 hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors"
          title="功能说明"
        >
          <n-icon :size="16"><InformationCircleOutline /></n-icon>
        </button>
      </div>

      </div>

      <div
        v-if="!isSidebarCollapsed"
        class="sidebar-resizer"
        @mousedown="startSidebarResize"
      ></div>

      <aside
        class="shrink-0 bg-[var(--bg-secondary)]/88 p-3 backdrop-blur transition-all duration-200"
        :style="{ width: isSidebarCollapsed ? '68px' : `${sidebarWidth}px` }"
      >
        <div
          v-if="isSidebarCollapsed"
          class="flex h-full flex-col items-center justify-between py-2"
        >
          <button
            @click="toggleSidebarCollapsed"
            class="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-tertiary)]"
            title="展开侧边栏"
          >
            <n-icon :size="18"><ChevronBackOutline /></n-icon>
          </button>
          <div class="vertical-sidebar-title">对话</div>
        </div>

        <div
          v-else
          class="flex h-full flex-col rounded-2xl bg-[var(--bg-primary)]/90 p-3 border-2 border-[rgba(255,255,255,0.08)] shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
        >
          <div class="flex items-start justify-between gap-3 pb-3">
            <div class="min-w-0 flex-1">
              <div class="text-[11px] uppercase tracking-[0.24em] text-[var(--text-secondary)]">会话</div>
              <div class="mt-1 truncate text-base font-semibold text-[var(--text-primary)]">
                {{ activeConversationTitle }}
              </div>
            </div>

            <div class="flex items-center gap-1">
              <n-dropdown trigger="click" :options="conversationOptions" @select="handleConversationSelect">
                <button class="flex h-10 items-center gap-1 rounded-xl border-2 border-[var(--border-color)] px-3 text-xs text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-tertiary)] hover:border-[rgba(245,245,240,0.3)]">
                  历史对话
                  <n-icon :size="14"><ChevronDownOutline /></n-icon>
                </button>
              </n-dropdown>
              <button
                @click="handleCreateConversation"
                class="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[var(--border-color)] text-[var(--text-primary)] transition-all hover:bg-[var(--bg-tertiary)] hover:border-[rgba(245,245,240,0.3)]"
                title="添加新对话"
              >
                <n-icon :size="18"><AddOutline /></n-icon>
              </button>
              <button
                @click="toggleSidebarCollapsed"
                class="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[var(--border-color)] text-[var(--text-primary)] transition-all hover:bg-[var(--bg-tertiary)] hover:border-[rgba(245,245,240,0.3)]"
                title="折叠侧边栏"
              >
                <n-icon :size="18"><ChevronForwardOutline /></n-icon>
              </button>
            </div>
          </div>

            <div class="flex-1 overflow-hidden py-2">
              <div
                v-if="activeConversationMessages.length > 0 || isProcessing"
                class="chat-messages-container flex h-full flex-col gap-3 overflow-y-auto px-2 pb-8"
              >
                <div
                  v-for="message in activeConversationMessages"
                  :key="message.id"
                  class="flex"
                  :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
                >
                  <div
                    class="max-w-[95%] rounded-xl px-4 py-3 text-[13.5px] tracking-wide"
                    :class="message.role === 'user'
                      ? 'bg-[rgba(255,255,255,0.95)] text-[#1a1a1c] shadow-[0_2px_8px_rgba(0,0,0,0.3)] border-2 border-[rgba(255,255,255,0.2)]'
                      : 'bg-[rgba(255,255,255,0.04)] text-[var(--text-primary)] border-2 border-[rgba(255,255,255,0.1)] shadow-[0_2px_8px_rgba(0,0,0,0.3)]'"
                  >
                    <div class="chat-bubble-content overflow-hidden">
                      <div v-if="!message.content && !message.reasoning && message.role === 'assistant'" class="flex items-center gap-2 py-1">
                        <span class="text-[12px] opacity-50 italic">{{ isThinkingMode ? '思考中' : '正在回复' }}</span>
                        <div class="thinking-dots">
                          <div class="thinking-dot"></div>
                          <div class="thinking-dot"></div>
                          <div class="thinking-dot"></div>
                        </div>
                      </div>
                      <div v-else v-html="renderMarkdown(message.content, message.reasoning, !isProcessing)"></div>
                    </div>
                    
                    <!-- Image Loading Placeholder | 图片生成中占位 -->
                    <div 
                      v-if="message.isGeneratingImage" 
                      class="mt-3 flex w-[320px] min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-[rgba(255,255,255,0.2)] bg-black/40 text-white shadow-inner"
                      style="z-index: 10;"
                    >
                      <div class="chat-image-spinner mb-3"></div>
                      <div class="text-[12px] font-bold tracking-[0.1em] text-white/90">正在生成精美图片...</div>
                      <div class="text-[10px] mt-1 opacity-50 uppercase">生成中 CREATING...</div>
                    </div>

                    <img
                      v-if="message.imageUrl"
                      :src="message.imageUrl"
                      class="mt-3 w-full max-w-[240px] rounded-xl border border-[rgba(255,255,255,0.08)] bg-black/20 object-cover shadow-2xl"
                      alt="生成结果"
                      @load="scrollToBottom"
                    />
                  </div>
                </div>
              </div>

              <div
                v-if="isProcessing && sidebarRequestStatus"
                class="mx-2 mt-3 rounded-xl border-2 border-[rgba(245,245,240,0.3)] bg-[rgba(245,245,240,0.04)] px-4 py-3 text-left shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
              >
              <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">调试状态</div>
              <div class="mt-2 text-sm text-[var(--text-primary)]">{{ sidebarRequestStatus }}</div>
              <div class="mt-1 text-xs text-[var(--text-secondary)]">
                已等待 {{ sidebarElapsedSeconds }} 秒
                <span v-if="sidebarFirstResponseSeconds !== null">
                  ，首响应 {{ sidebarFirstResponseSeconds }} 秒
                </span>
              </div>
            </div>

            <div v-else class="flex h-full flex-col items-center justify-center px-4 text-center">
              <div class="text-base font-semibold text-[var(--text-primary)]">试试这些快捷创意</div>
              <div class="mt-2 max-w-[360px] text-sm leading-7 text-[var(--text-secondary)]">
                输入一句想法，或者点下面的标签，快速开始新的画布内容。
              </div>

              <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  v-for="tag in suggestions"
                  :key="tag"
                  @click="chatInput = tag"
                  class="rounded-lg bg-[rgba(255,255,255,0.04)] px-4 py-2 text-sm text-[var(--text-secondary)] border-2 border-[rgba(255,255,255,0.1)] transition-all hover:bg-[rgba(245,245,240,0.1)] hover:border-[rgba(245,245,240,0.4)] hover:text-[var(--text-primary)]"
                >
                  {{ tag }}
                </button>
              </div>
            </div>
          </div>

          <div class="chat-input-container" :class="{ 'thinking-mode-active': isThinkingMode }">
            <textarea
              ref="chatTextareaRef"
              v-model="chatInput"
              :placeholder="inputPlaceholder"
              :disabled="isProcessing"
              class="chat-textarea"
              @input="adjustTextareaHeight"
              @keydown.enter.exact.prevent="sendSidebarMessage"
              @keydown.enter.ctrl.prevent="sendSidebarMessage"
            />

            <div class="chat-bottom-bar">
              <div class="flex items-center gap-2">
                <n-dropdown 
                  trigger="click" 
                  :options="sidebarModelOptions" 
                  @select="(v) => selectedSidebarModel = v"
                >
                  <button class="model-select-btn" title="选择对话模型">
                    <n-icon :size="14" class="opacity-70"><SettingsOutline /></n-icon>
                    <span class="truncate">{{ currentSidebarModelLabel }}</span>
                  </button>
                </n-dropdown>

                <div class="h-4 w-px bg-white/10"></div>

                <n-dropdown 
                  trigger="click" 
                  :options="sidebarImageModelOptions" 
                  @select="(v) => selectedSidebarImageModel = v"
                >
                  <button class="model-select-btn" title="选择绘画模型">
                    <n-icon :size="14" class="opacity-70"><ImageOutline /></n-icon>
                    <span class="truncate">{{ currentSidebarImageModelLabel.replace(' (推荐)', '') }}</span>
                  </button>
                </n-dropdown>
              </div>

              <div class="ml-auto flex items-center gap-2">
                <button 
                  class="thinking-toggle-btn"
                  :class="{ active: isThinkingMode }"
                  @click="isThinkingMode = !isThinkingMode"
                  title="开启深度思考模式"
                >
                  <img src="/thinking.png" class="w-6 h-6 object-contain" :class="{ 'animate-pulse': isThinkingMode }" />
                </button>

                <button
                  @click="sendSidebarMessage"
                  :disabled="isProcessing || !chatInput.trim()"
                  class="chat-send-btn"
                >
                  <div v-if="isThinkingMode" class="thinking-glow-effect"></div>
                  <n-icon :size="16"><SendOutline /></n-icon>
                  <span>{{ isProcessing ? '执行中' : '发送' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- API Settings Modal | API 设置弹窗 -->
    <!-- Global Quota Alert | 全局额度不足提示 -->
    <QuotaAlert />

    <ApiSettings v-model:show="showApiSettings" />

    <!-- Help Modal | 功能说明弹窗 -->
    <n-modal v-model:show="showHelpModal" preset="dialog" title="功能模型说明" style="max-width:520px;">
      <div style="font-size:14px;line-height:1.8;color:rgba(255,255,255,0.8);">
        <p style="margin-bottom:12px;color:rgba(255,255,255,0.5);font-size:13px;">各功能默认使用的模型：</p>
        <div style="display:grid;grid-template-columns:auto 1fr;gap:8px 16px;">
          <span style="font-weight:600;color:#60a5fa;">高清放大</span>
          <span>Nano Banana 2 — 速度快，细节还原好</span>
          <span style="font-weight:600;color:#60a5fa;">扩图</span>
          <span>Nano Banana Pro — 原生遮罩支持，扩图体验最佳</span>
          <span style="font-weight:600;color:#60a5fa;">重绘</span>
          <span>Nano Banana Pro — 原生遮罩支持，精确控制重绘区域</span>
          <span style="font-weight:600;color:#60a5fa;">擦除</span>
          <span>Nano Banana Pro — 原生遮罩支持，精确擦除涂抹区域</span>
          <span style="font-weight:600;color:#60a5fa;">抠图</span>
          <span>Seedream 5.0 Lite — 发送文本提示尝试去除背景</span>
        </div>
        <p style="margin-top:14px;font-size:12px;color:rgba(255,255,255,0.35);">
          你也可以在生成面板中手动选择模型来覆盖默认设置。
        </p>
      </div>
      <template #action>
        <n-button @click="showHelpModal = false">知道了</n-button>
      </template>
    </n-modal>

    <!-- Rename Modal | 重命名弹窗 -->
    <n-modal v-model:show="showRenameModal" preset="dialog" title="重命名项目">
      <n-input v-model:value="renameValue" placeholder="请输入项目名称" />
      <template #action>
        <n-button @click="showRenameModal = false">取消</n-button>
        <n-button type="primary" @click="confirmRename">确定</n-button>
      </template>
    </n-modal>

    <!-- Delete Confirm Modal | 删除确认弹窗 -->
    <n-modal v-model:show="showDeleteModal" preset="dialog" title="删除项目" type="warning">
      <p>确定要删除项目「{{ projectName }}」吗？此操作不可恢复。</p>
      <template #action>
        <n-button @click="showDeleteModal = false">取消</n-button>
        <n-button type="error" @click="confirmDelete">删除</n-button>
      </template>
    </n-modal>
    
    <!-- Multi-selection floating toolbar | 多选悬浮工具栏 -->
    <Transition name="fade-slide">
      <div 
        v-if="getSelectedNodes.length > 1"
        class="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)]/95 shadow-2xl backdrop-blur"
      >
        <div class="flex items-center gap-2 pr-4 border-r border-white/10">
          <div class="w-8 h-8 rounded-full bg-[var(--accent-color)]/20 flex items-center justify-center text-[var(--accent-color)] text-xs font-bold">
            {{ getSelectedNodes.length }}
          </div>
          <span class="text-sm font-medium text-[var(--text-primary)]">已选择</span>
        </div>
        
        <button 
          @click="handleGroupSelection"
          class="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white/5 transition-colors group"
          title="将选中的节点合并为一个分组"
        >
          <n-icon :size="20" class="group-hover:text-[var(--accent-color)] transition-colors"><LayersOutline /></n-icon>
          <span class="text-sm">打组</span>
        </button>
        
        <button 
          @click="removeNodes(getSelectedNodes.map(n => n.id))"
          class="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-red-500/10 text-red-400 transition-colors"
          title="删除选中的所有节点"
        >
          <n-icon :size="20"><TrashOutline /></n-icon>
          <span class="text-sm">删除</span>
        </button>
      </div>
    </Transition>

  </div>
</template>

<script setup>
/**
 * Canvas view component | 画布视图组件
 * Main infinite canvas with Vue Flow integration
 */
import { ref, computed, onMounted, onUnmounted, watch, nextTick, markRaw } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { VueFlow, useVueFlow, SelectionMode, applyNodeChanges, applyEdgeChanges } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import { NIcon, NDropdown, NModal, NInput, NButton } from 'naive-ui'
import { 
  ChevronBackOutline,
  ChevronForwardOutline,
  ChevronDownOutline,
  SettingsOutline,
  SunnyOutline,
  MoonOutline,
  AddOutline,
  ImageOutline,
  SendOutline,
  RefreshOutline,
  TextOutline,
  VideocamOutline,
  ColorPaletteOutline,
  BookmarkOutline,
  ArrowUndoOutline,
  ArrowRedoOutline,
  GridOutline,
  LocateOutline,
  RemoveOutline,
  AppsOutline,
  ChatbubbleOutline,
  LayersOutline,
  ColorWandOutline,
  ScanOutline,
  TrashOutline,
  InformationCircleOutline
} from '@vicons/ionicons5'
import { nodes, edges, addNode, addNodes, addEdge, addEdges, updateNode, updateNodeData, removeNodes, initSampleData, loadProject, saveProject, clearCanvas, canvasViewport, updateViewport, undo, redo, canUndo, canRedo, manualSaveHistory, startBatchOperation, endBatchOperation, conversationSessions, activeConversationId } from '../stores/canvas'
import { loadAllModels } from '../stores/models'
import { useChat, useWorkflowOrchestrator, useImageGeneration } from '../hooks'
import { useModelStore } from '../stores/pinia'
import { useProjectsStore } from '../stores/projects'
import { isDark, toggleTheme } from '../stores/theme'
import { saveFile, isElectron, downloadImage } from '../utils/fileSystem'

import ApiSettings from '../components/ApiSettings.vue'
import QuotaAlert from '../components/QuotaAlert.vue'
import PromptNode from '../components/nodes/PromptNode.vue'

// API Config state | API 配置状态
const modelStore = useModelStore()
const isApiConfigured = computed(() => !!modelStore.currentApiKey)



// Chat templates | 问答模板
const CHAT_TEMPLATES = {
  imagePrompt: {
    name: '生图提示词',
    systemPrompt: '你是一个专业的AI绘画提示词专家。请使用中文回复。将用户输入的内容美化成高质量的生图提示词，包含风格、光线、构图、细节等要素。直接返回优化后的中文提示词，不要其他解释。',
    model: 'gemini-3.1-pro-preview'
  },
  videoPrompt: {
    name: '视频提示词',
    systemPrompt: '你是一个专业的AI视频提示词专家。请使用中文回复。将用户输入的内容美化成高质量的视频生成提示词，包含运动、场景、镜头等要素。直接返回优化后的中文提示词，不要其他解释。',
    model: 'gemini-3.1-pro-preview'
  },
  chat: {
    name: '对话模式',
    systemPrompt: '你是大龙AI助手。请始终使用中文回复。你的回答要简洁明了、直接、精炼。',
    thinkingPrompt: '你现在是大龙AI助手的深度思考内核。你拥有极强的逻辑推理、创意构思和审美判别能力。请遵循以下思考准则：\n1. **深度解析**：不要直接回答，先在 <thought> 标签内进行不少于500字的深度分析。分析应包含：用户意图拆解、底层逻辑推导、多维度方案对比、以及潜在的美学/技术优化点。\n2. **结构化思考**：在思考过程中，请使用结构化的标题、列表或分步骤讨论，展现你的推导路径。\n3. **反向约束（Negative Constraints）**：分析中必须包含对“不应出现什么”的思考（即反向提示/排除项），确保输出的纯净度和高质量。\n4. **极致回答**：思考完毕后，给出最精炼、最有深度的最终回答。',
    model: 'gpt-5.4'
  }
}

// Current template | 当前模板
const currentTemplate = ref('chat')

// Chat hook with chat template | 问答 hook
const {
  loading: chatLoading,
  status: chatStatus,
  currentResponse,
  currentReasoning,
  messages: chatHistory,
  send: sendChat
} = useChat({
  systemPrompt: CHAT_TEMPLATES.chat.systemPrompt,
  model: CHAT_TEMPLATES.chat.model,
  maxTokens: 4096
})

// Workflow orchestrator hook | 工作流编排 hook
const {
  isAnalyzing: workflowAnalyzing,
  isExecuting: workflowExecuting,
  currentStep: workflowStep,
  totalSteps: workflowTotalSteps,
  executionLog: workflowLog,
  analyzeIntent,
  executeWorkflow,
  createTextToImageWorkflow,
  createMultiAngleStoryboard,
  WORKFLOW_TYPES
} = useWorkflowOrchestrator()

// Image generation hook | 图片生成 hook
const {
  loading: imageLoading,
  generate: generateImageApi
} = useImageGeneration()

// Custom node components | 自定义节点组件
import ImageNode from '../components/nodes/ImageNode.vue'
import TextNode from '../components/nodes/TextNode.vue'
import VideoNode from '../components/nodes/VideoNode.vue'
import HDConfigNode from '../components/nodes/HDConfigNode.vue'
import GhostNode from '../components/nodes/GhostNode.vue'
import GroupNode from '../components/nodes/GroupNode.vue'
import ImageRoleEdge from '../components/edges/ImageRoleEdge.vue'
import PromptOrderEdge from '../components/edges/PromptOrderEdge.vue'
import ImageOrderEdge from '../components/edges/ImageOrderEdge.vue'
import DeletableEdge from '../components/edges/DeletableEdge.vue'

// Hooks
import { useInertia } from '../hooks/useInertia'
import { useFileDrop } from '../hooks/useFileDrop'

const router = useRouter()
const route = useRoute()

// Vue Flow instance | Vue Flow 实例
const { viewport, zoomIn, zoomOut, fitView, updateNodeInternals, screenToFlowCoordinate, setViewport, findNode, setCenter, getSelectedNodes } = useVueFlow()

// 建立响应式代理，解决 v-model 无法直接绑定到 import 变量的问题
const nodesProxy = computed({
  get: () => nodes.value,
  set: (val) => { nodes.value = val }
})

const edgesProxy = computed({
  get: () => edges.value,
  set: (val) => { edges.value = val }
})

// 初始化惯性引擎
const { handleViewportChange, stopInertia, lockInertia } = useInertia(viewport, setViewport, updateViewport)
window.stopCanvasInertia = stopInertia // 全局暴露停止惯性方法

// 画布右键拖动补偿 (解决在节点上右键拖动无效的问题)
const isRightDragging = ref(false)
const lastMousePos = ref({ x: 0, y: 0 })

const handleGlobalMousedown = (e) => {
  stopInertia()
  // 如果是右键 (button === 2)
  if (e.button === 2) {
    // 检查是否点在节点上
    const isInsideNode = e.target.closest('.vue-flow__node')
    if (isInsideNode) {
      isRightDragging.value = true
      lastMousePos.value = { x: e.clientX, y: e.clientY }
      document.addEventListener('mousemove', handleGlobalMousemove)
      document.addEventListener('mouseup', handleGlobalMouseup)
    }
  }
}

const handleGlobalMousemove = (e) => {
  if (isRightDragging.value) {
    const dx = e.clientX - lastMousePos.value.x
    const dy = e.clientY - lastMousePos.value.y
    lastMousePos.value = { x: e.clientX, y: e.clientY }
    
    // 手动移动视口
    setViewport({
      x: viewport.value.x + dx,
      y: viewport.value.y + dy,
      zoom: viewport.value.zoom
    })
  }
}

const handleGlobalMouseup = (e) => {
  if (e.button === 2 || isRightDragging.value) {
    isRightDragging.value = false
    document.removeEventListener('mousemove', handleGlobalMousemove)
    document.removeEventListener('mouseup', handleGlobalMouseup)
  }
}

onUnmounted(() => {
  document.removeEventListener('mousemove', handleGlobalMousemove)
  document.removeEventListener('mouseup', handleGlobalMouseup)
})

/**
 * 全双击节点对焦逻辑 (统一处理所有节点)
 */
const onNodeDoubleClick = ({ node }) => {
  // 如果是提示词提取节点，不触发画布聚焦（因为它需要响应内部的双击编辑）
  if (node.type === 'promptExtract' || node.type === 'text') return

  // 1. 立即锁定惯性采样 600ms，防止对焦动画被识别为“用户在快速甩动画布”
  lockInertia(600)

  // 2. 获取最准确的节点实时数据
  const flowNode = findNode(node.id)
  if (!flowNode) return

  // 3. 计算绝对坐标 (支持嵌套节点)
  let absX = flowNode.position.x
  let absY = flowNode.position.y
  
  let parent = flowNode.parentNode ? findNode(flowNode.parentNode) : null
  while (parent) {
    absX += parent.position.x
    absY += parent.position.y
    parent = parent.parentNode ? findNode(parent.parentNode) : null
  }

  // 4. 计算中心点 (使用 dimensions)
  const centerX = absX + (flowNode.dimensions.width / 2)
  const centerY = absY + (flowNode.dimensions.height / 2)

  console.log(`[Canvas] Global double-click focus on node: ${node.id}`, { centerX, centerY })

  // 5. 执行平滑拉近对焦
  setCenter(centerX, centerY, { zoom: 1.0, duration: 500 })
}

/**
 * 将选中的多个节点打组
 */
const handleGroupSelection = () => {
  const selectedNodes = getSelectedNodes.value
  if (selectedNodes.length < 2) return

  // 1. 开始批量操作，以便可以一键撤销
  startBatchOperation()
  
  // 2. 计算包围盒 (绝对坐标)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  
  selectedNodes.forEach(node => {
    // 获取绝对位置
    const flowNode = findNode(node.id)
    if (!flowNode) return
    
    let x = flowNode.position.x
    let y = flowNode.position.y
    
    // 如果已有父节点，先计算其绝对坐标
    let parent = flowNode.parentNode ? findNode(flowNode.parentNode) : null
    while (parent) {
      x += parent.position.x
      y += parent.position.y
      parent = parent.parentNode ? findNode(parent.parentNode) : null
    }
    
    const w = flowNode.dimensions.width || 200
    const h = flowNode.dimensions.height || 200
    
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + w)
    maxY = Math.max(maxY, y + h)
  })

  // 2. 添加边距
  const padding = 60
  const groupX = minX - padding
  const groupY = minY - padding
  const groupW = (maxX - minX) + padding * 2
  const groupH = (maxY - minY) + padding * 2

  // 3. 创建分组节点
  // 分组节点通常应该在最底层，所以我们需要计算一个较小的 zIndex
  const minZIndex = Math.min(0, ...nodes.value.map(n => n.zIndex || 0))
  
  const groupId = addNode('group', { x: groupX, y: groupY }, {
    width: groupW,
    height: groupH,
    label: '新分组'
  })
  
  // 更新分组节点的 zIndex，确保它在底层
  updateNode(groupId, { zIndex: minZIndex - 1 })

  // 4. 将选中的节点设为子节点并转换为相对坐标
  selectedNodes.forEach(node => {
    const flowNode = findNode(node.id)
    if (!flowNode) return

    // 计算当前节点的绝对坐标
    let absX = flowNode.position.x
    let absY = flowNode.position.y
    let parent = flowNode.parentNode ? findNode(flowNode.parentNode) : null
    while (parent) {
      absX += parent.position.x
      absY += parent.position.y
      parent = parent.parentNode ? findNode(parent.parentNode) : null
    }

    // 更新节点
    updateNode(node.id, {
      parentNode: groupId,
      position: {
        x: absX - groupX,
        y: absY - groupY
      }
    })
  })
  
  // 5. 结束批量操作
  endBatchOperation()
  
  window.$message?.success('打组成功')
}

// Register custom node types | 注册自定义节点类型
const nodeTypes = {
  image: markRaw(ImageNode),
  text: markRaw(TextNode),
  video: markRaw(VideoNode),
  hdConfig: markRaw(HDConfigNode),
  ghost: markRaw(GhostNode),
  group: markRaw(GroupNode),
  promptExtract: markRaw(PromptNode)
}

// Register custom edge types | 注册自定义边类型
const edgeTypes = {
  imageRole: markRaw(ImageRoleEdge),
  promptOrder: markRaw(PromptOrderEdge),
  imageOrder: markRaw(ImageOrderEdge),
  default: markRaw(DeletableEdge)
}

// UI state | UI状态
const showNodeMenu = ref(false)
const chatInput = ref('')
const isMobile = ref(false)
const showGrid = ref(true)

const minimapNodeColor = (node) => {
  const colors = {
    image: '#6366f1',
    text: '#10b981',
    prompt: '#f59e0b',
    video: '#ef4444',
    group: 'rgba(99,102,241,0.15)',
  }
  return colors[node.type] || '#6b7280'
}

const minimapNodeStrokeColor = (node) => {
  const colors = {
    image: '#818cf8',
    text: '#34d399',
    prompt: '#fbbf24',
    video: '#f87171',
    group: 'rgba(99,102,241,0.4)',
  }
  return colors[node.type] || '#9ca3af'
}
const showApiSettings = ref(false)
const isProcessing = ref(false)
const selectedNodeIds = ref([])
const sidebarRequestStatus = ref('')
const sidebarElapsedSeconds = ref(0)
const sidebarFirstResponseSeconds = ref(null)
const sidebarRequestTimer = ref(null)
const sidebarRequestStartedAt = ref(0)



// Flow key for forcing re-render on project switch | 项目切换时强制重新渲染的 key
const flowKey = ref(Date.now())

// Modal state | 弹窗状态
const showHelpModal = ref(false)
const showRenameModal = ref(false)
const showDeleteModal = ref(false)
const renameValue = ref('')
const canvasContainerRef = ref(null)
const isThinkingMode = ref(false) // 深度思考模式状态
const chatTextareaRef = ref(null) // 输入框引用
const lastSelectedModel = ref('gemini-3.1-pro-preview') // 记录切换前的模型

// 自动调整输入框高度
const adjustTextareaHeight = () => {
  const textarea = chatTextareaRef.value
  if (!textarea) return
  textarea.style.height = 'auto' // 先重置高度
  textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px` // 根据内容设置，最高300px
}

// Initialize models on page load | 页面加载时初始化模型
const handleOpenApiSettings = () => {
  showApiSettings.value = true
}

onMounted(() => {
  loadAllModels()
  adjustTextareaHeight()
  window.addEventListener('open-api-settings', handleOpenApiSettings)
})

onUnmounted(() => {
  window.removeEventListener('open-api-settings', handleOpenApiSettings)
})

// 监听输入内容变化以自适应高度
watch(chatInput, () => {
  nextTick(() => {
    adjustTextareaHeight()
  })
})

// 监听深度思考模式切换，自动调整模型
watch(isThinkingMode, (val) => {
  if (val) {
    // 开启思考模式：记录当前模型并切换到最强模型
    lastSelectedModel.value = selectedSidebarModel.value
    selectedSidebarModel.value = 'gpt-5.4'
  } else {
    // 关闭思考模式：恢复之前的模型
    selectedSidebarModel.value = lastSelectedModel.value
  }
})
const showQuickCreateMenu = ref(false)
const quickCreateMenuPosition = ref({ x: 0, y: 0 })
const quickCreateCanvasPosition = ref({ x: 0, y: 0 })
const lastPaneClick = ref({ time: 0, x: 0, y: 0 })
const sidebarWidth = ref(600)
const isResizingSidebar = ref(false)
const isSidebarCollapsed = ref(false)

// Project info | 项目信息
const projectsStore = useProjectsStore()
const projectName = computed(() => {
  const project = projectsStore.projects.find(p => p.id === route.params.id)
  return project?.name || '未命名项目'
})

// Project dropdown options | 项目下拉选项
const projectOptions = [
  { label: '重命名', key: 'rename' },
  { label: '复制', key: 'duplicate' },
  { label: '删除', key: 'delete' }
]

const conversationOptions = computed(() =>
  conversationSessions.value.map(session => ({
    label: session.title,
    key: session.id
  }))
)

const activeConversation = computed(() =>
  conversationSessions.value.find(session => session.id === activeConversationId.value) || conversationSessions.value[0]
)

const activeConversationTitle = computed(() => activeConversation.value?.title || '新对话')
const activeConversationMessages = computed(() => activeConversation.value?.messages || [])

const ALL_MODELS = [
  { label: 'Claude Sonnet 4.6', key: 'global.anthropic.claude-sonnet-4-6', thinking: true },
  { label: 'Claude Opus 4.5', key: 'global.anthropic.claude-opus-4-5-20251101-v1:0', thinking: true },
  { label: 'Claude Opus 4.6', key: 'global.anthropic.claude-opus-4-6-v1', thinking: true },
  { label: 'Claude Sonnet 4.5', key: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0' },
  { label: 'Claude Haiku 4.5', key: 'global.anthropic.claude-haiku-4-5-20251001-v1:0' },
  { label: 'Gemini 3.1 Pro Preview', key: 'gemini-3.1-pro-preview' },
  { label: 'Gemini 3.1 Flash lite preview', key: 'gemini-3.1-flash-lite-preview' },
  { label: 'GPT-5.4', key: 'gpt-5.4' }
]

const sidebarModelOptions = computed(() => {
  if (isThinkingMode.value) {
    // 开启思考模式时，显示推理模型 + GPT-5.4
    return ALL_MODELS.filter(m => m.thinking || m.key === 'gpt-5.4')
  }
  // 关闭思考模式时，显示常规模型（全部非专属推理模型）
  return ALL_MODELS.filter(m => !m.thinking || m.key === 'gpt-5.4')
})

const selectedSidebarModel = ref('gpt-5.4')

const currentSidebarModelLabel = computed(() => {
  return ALL_MODELS.find(o => o.key === selectedSidebarModel.value)?.label || '选择模型'
})

// Sidebar image models | 侧边栏绘画模型
const sidebarImageModelOptions = [
  { label: 'Nano Banana 2 (推荐)', key: 'gemini-3.1-flash-image-preview' },
  { label: 'Nano Banana Pro', key: 'gemini-3-pro-image-preview' }
]
const selectedSidebarImageModel = ref('gemini-3.1-flash-image-preview')
const currentSidebarImageModelLabel = computed(() => {
  return sidebarImageModelOptions.find(o => o.key === selectedSidebarImageModel.value)?.label || '绘画模型'
})

// Toolbar tools | 工具栏工具
const tools = [
  { id: 'text', name: '文本', icon: TextOutline, action: () => addNewNode('text') },
  { id: 'image', name: '图片', icon: ImageOutline, action: () => addNewNode('image') },
  { id: 'imageConfig', name: '文生图', icon: ColorPaletteOutline, action: () => addNewNode('imageConfig') },
  { id: 'videoConfig', name: '视频生成', icon: VideocamOutline, action: () => addNewNode('videoConfig') },
  { id: 'undo', name: '撤销', icon: ArrowUndoOutline, action: () => undo(), disabled: () => !canUndo() },
  { id: 'redo', name: '重做', icon: ArrowRedoOutline, action: () => redo(), disabled: () => !canRedo() }
]

// Node type options for menu | 节点类型菜单选项
const nodeTypeOptions = [
  { type: 'text', name: '文本节点', icon: TextOutline, color: '#3b82f6' },
  { type: 'llmConfig', name: 'LLM文本生成', icon: ChatbubbleOutline, color: '#a855f7' },
  { type: 'imageConfig', name: '文生图配置', icon: ColorPaletteOutline, color: '#22c55e' },
  { type: 'videoConfig', name: '视频生成配置', icon: VideocamOutline, color: '#f59e0b' },
  { type: 'image', name: '图片节点', icon: ImageOutline, color: '#8b5cf6' },
  { type: 'video', name: '视频节点', icon: VideocamOutline, color: '#ef4444' },
  { type: 'promptExtract', name: '提示词提取', icon: ColorWandOutline, color: '#a78bfa' }
]

const quickCreateOptions = [
  { type: 'text', name: '文本', icon: TextOutline, description: '快速插入文本节点' },
  { type: 'image', name: '图片', icon: ImageOutline, description: '上传或引用图片内容' },
  { type: 'video', name: '视频', icon: VideocamOutline, description: '放入视频或生成结果卡片' },
  { type: 'promptExtract', name: '提示词提取', icon: ScanOutline, description: '从图片中反推场景或角色提示词' }
]

// Input placeholder | 输入占位符
const inputPlaceholder = '你可以试着说"帮我生成一个二次元的卡通角色"'

// Quick suggestions | 快捷建议
const suggestions = [
  '像个魔法森林',
  '三只不同的小猫',
  '生成多角度分镜',
  '夏日田野环绕漫步'
]

// Add new node | 添加新节点
const addNewNode = async (type, position = null) => {
  const targetPosition = position || getViewportCenterPosition()
  // 第四个参数传 true 表示立即保存历史记录，确保撤销是逐个节点进行的
  const nodeId = addNode(type, targetPosition, {}, true)
  bringNodeToFront(nodeId)
  showNodeMenu.value = false
  return nodeId
}

const getViewportCenterPosition = () => {
  const viewportCenterX = -viewport.value.x / viewport.value.zoom + (window.innerWidth / 2) / viewport.value.zoom
  const viewportCenterY = -viewport.value.y / viewport.value.zoom + (window.innerHeight / 2) / viewport.value.zoom

  return {
    x: viewportCenterX - 100,
    y: viewportCenterY - 100
  }
}

const bringNodeToFront = (nodeId) => {
  const maxZIndex = Math.max(0, ...nodes.value.map(n => n.zIndex || 0))
  updateNode(nodeId, { zIndex: maxZIndex + 1 })
  setTimeout(() => {
    updateNodeInternals(nodeId)
  }, 50)
}

// 初始化文件拖放功能
const { handleImportFile, onDragOver, onDrop } = useFileDrop({
  projectName,
  canvasContainerRef,
  screenToFlowCoordinate,
  addNode,
  updateNode,
  bringNodeToFront,
  viewport
})

// 文件转 base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const openQuickCreateMenuAtEvent = (event) => {
  const container = canvasContainerRef.value
  if (!container) return

  const rect = container.getBoundingClientRect()
  const localX = event.clientX - rect.left
  const localY = event.clientY - rect.top

  quickCreateMenuPosition.value = {
    x: Math.min(localX + 12, rect.width - 196),
    y: Math.min(localY + 12, rect.height - 180)
  }
  quickCreateCanvasPosition.value = {
    x: (localX - viewport.value.x) / viewport.value.zoom - 100,
    y: (localY - viewport.value.y) / viewport.value.zoom - 60
  }
  showQuickCreateMenu.value = true
  showNodeMenu.value = false
}

const createNodeAtQuickMenu = async (type) => {
  await addNewNode(type, quickCreateCanvasPosition.value)
  showQuickCreateMenu.value = false
}

const startSidebarResize = (event) => {
  if (isSidebarCollapsed.value) return
  event.preventDefault()
  isResizingSidebar.value = true
}

const handleSidebarResize = (event) => {
  if (!isResizingSidebar.value) return
  const nextWidth = window.innerWidth - event.clientX
  sidebarWidth.value = Math.min(900, Math.max(600, nextWidth))
}

const stopSidebarResize = () => {
  isResizingSidebar.value = false
}

const toggleSidebarCollapsed = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

// 自动滚动到底部 | Auto scroll to bottom
const scrollToBottom = () => {
  nextTick(() => {
    requestAnimationFrame(() => {
      const scrollContainer = document.querySelector('.chat-messages-container')
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        })
      }
    })
  })
}

const syncConversationDraft = (value) => {
  conversationSessions.value = conversationSessions.value.map(session =>
    session.id === activeConversationId.value
      ? { ...session, draft: value }
      : session
  )
}

const appendConversationMessage = (role, content, extra = {}) => {
  // 允许助手的空内容消息（用于展示加载中/思考中状态）
  if (role !== 'assistant' && !content && !extra.imageUrl) return

  conversationSessions.value = conversationSessions.value.map(session => {
    if (session.id !== activeConversationId.value) return session

    const nextMessages = [
      ...(session.messages || []),
      {
        id: `${role}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        role,
        content,
        ...extra
      }
    ]

    const nextTitle =
      session.title?.startsWith('新对话') && role === 'user'
        ? content.slice(0, 16) || session.title
        : session.title

    return {
      ...session,
      title: nextTitle,
      messages: nextMessages
    }
  })
  
  // 返回新消息的 ID，以便后续流式更新
  const lastSession = conversationSessions.value.find(s => s.id === activeConversationId.value)
  return lastSession?.messages[lastSession.messages.length - 1]?.id
}

const updateAssistantMessage = (messageId, content, reasoning = '', extra = {}) => {
  if (!messageId) return
  const sessionIndex = conversationSessions.value.findIndex(s => s.id === activeConversationId.value)
  if (sessionIndex === -1) return
  
  const messages = [...conversationSessions.value[sessionIndex].messages]
  const messageIndex = messages.findIndex(msg => msg.id === messageId)
  
  if (messageIndex !== -1) {
    messages[messageIndex] = { 
      ...messages[messageIndex], 
      content: content || messages[messageIndex].content,
      reasoning: reasoning || messages[messageIndex].reasoning,
      ...extra
    }
    conversationSessions.value[sessionIndex].messages = messages
    // 强制触发引用更新，确保 Store 的深度监听器能捕捉到变化
    conversationSessions.value = [...conversationSessions.value]
  }
}

// 简单的 Markdown 渲染 + 思考块处理
const renderMarkdown = (text, reasoning = '', isFinished = false) => {
  if (!text && !reasoning) return ''
  
  let mainContent = text || ''
  let thoughtHtml = ''
  
  // 综合处理推理内容
  let thoughtText = reasoning || ''
  
  // 提取思考块 <thought>...</thought>
  const thoughtMatch = text.match(/<thought>([\s\S]*?)<\/thought>/i)
  if (thoughtMatch) {
    thoughtText = thoughtMatch[1].trim()
    mainContent = text.replace(/<thought>[\s\S]*?<\/thought>/i, '').trim()
  }

  if (thoughtText) {
    const isOpen = !isFinished ? 'open' : ''
    const statusText = !isFinished ? '深度思考中...' : '已完成思考'
    
    thoughtHtml = `
      <div class="thought-container mb-4">
        <details class="group text-[var(--text-secondary)]" ${isOpen}>
          <summary class="flex items-center gap-2 cursor-pointer text-[12px] opacity-40 hover:opacity-100 transition-opacity list-none select-none">
            <span class="w-4 h-4 flex items-center justify-center transition-transform group-open:rotate-90">›</span>
            <span>${statusText}</span>
          </summary>
          <div class="mt-2 pl-4 border-l border-[rgba(255,255,255,0.08)] text-[13px] leading-relaxed opacity-60 whitespace-pre-wrap italic bg-white/5 p-3 rounded-lg">
            ${thoughtText}
          </div>
        </details>
      </div>
    `
  }


  // 处理标题
  let html = mainContent
    .replace(/^### (.*$)/gim, '<h3 class="chat-h3 font-bold mt-4 mb-2 opacity-95 text-base">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="chat-h2 font-bold mt-5 mb-2 text-lg border-b border-white/5 pb-1">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="chat-h1 font-bold mt-6 mb-3 text-xl">$1</h1>')
    // 处理加粗
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-[var(--accent-color)]">$1</strong>')
    // 处理列表
    .replace(/^\- (.*$)/gim, '<div class="chat-li flex gap-2 my-1.5"><span class="opacity-40">•</span><span>$1</span></div>')
    // 处理换行 (优化：缩减行间距)
    .replace(/\n\n+/g, '<div class="h-[0.4em]"></div>')
    .replace(/\n/g, '<div class="h-0"></div>')
  
  return thoughtHtml + html
}

const resetSidebarDebugState = () => {
  if (sidebarRequestTimer.value) {
    clearInterval(sidebarRequestTimer.value)
    sidebarRequestTimer.value = null
  }
  sidebarRequestStatus.value = ''
  sidebarElapsedSeconds.value = 0
  sidebarFirstResponseSeconds.value = null
  sidebarRequestStartedAt.value = 0
}

const startSidebarDebugState = () => {
  resetSidebarDebugState()
  sidebarRequestStartedAt.value = Date.now()
  sidebarRequestStatus.value = '请求已发出，等待服务器响应...'
  sidebarRequestTimer.value = setInterval(() => {
    const elapsed = Math.max(0, Math.floor((Date.now() - sidebarRequestStartedAt.value) / 1000))
    sidebarElapsedSeconds.value = elapsed

    if (sidebarFirstResponseSeconds.value !== null) {
      sidebarRequestStatus.value = '服务器已开始响应，正在整理回复...'
    } else if (elapsed >= 15) {
      sidebarRequestStatus.value = '服务器暂未响应，可能排队中或请求超时。'
    } else if (elapsed >= 8) {
      sidebarRequestStatus.value = '服务器响应较慢，继续等待中...'
    }
  }, 1000)
}

const markSidebarFirstResponse = () => {
  if (!sidebarRequestStartedAt.value || sidebarFirstResponseSeconds.value !== null) return
  sidebarFirstResponseSeconds.value = Math.max(0, Number(((Date.now() - sidebarRequestStartedAt.value) / 1000).toFixed(1)))
  sidebarRequestStatus.value = '服务器已开始响应，正在返回内容...'
}

const handleCreateConversation = () => {
  syncConversationDraft(chatInput.value)
  const newIndex = conversationSessions.value.length + 1
  const newSession = {
    id: `conversation_${Date.now()}`,
    title: `新对话 ${newIndex}`,
    draft: '',
    messages: []
  }
  conversationSessions.value = [newSession, ...conversationSessions.value]
  activeConversationId.value = newSession.id
  chatInput.value = ''
}

const handleConversationSelect = (conversationId) => {
  if (!conversationId || conversationId === activeConversationId.value) return
  syncConversationDraft(chatInput.value)
  const nextSession = conversationSessions.value.find(session => session.id === conversationId)
  if (!nextSession) return
  activeConversationId.value = conversationId
  chatInput.value = nextSession.draft || ''
}

const duplicateSelectedNodes = () => {
  syncSelectedNodeIds()
  if (selectedNodeIds.value.length === 0) return

  const selectedNodes = nodes.value.filter(node => selectedNodeIds.value.includes(node.id))
  const createdIds = []

  startBatchOperation()
  for (const node of selectedNodes) {
    const newId = addNode(node.type, { x: node.position.x + 60, y: node.position.y + 60 }, { ...node.data }, false)
    createdIds.push(newId)
  }
  endBatchOperation()

  clearNodeSelection()
  nodes.value = nodes.value.map(node => {
    const isNew = createdIds.includes(node.id)
    return {
      ...node,
      selected: isNew,
      data: {
        ...node.data,
        selected: isNew
      }
    }
  })
  syncSelectedNodeIds()
  createdIds.forEach(bringNodeToFront)
  window.$message?.success(`已复制 ${createdIds.length} 个节点`)
}

// Handle add workflow from panel | 处理从面板添加工作流
// Handle connection | 处理连接
const onConnect = (params) => {
  // Check connection types | 检查连接类型
  const sourceNode = nodes.value.find(n => n.id === params.source)
  const targetNode = nodes.value.find(n => n.id === params.target)
  
  if (sourceNode?.type === 'image' && targetNode?.type === 'videoConfig') {
    // Use imageRole edge type | 使用图片角色边类型
    addEdge({
      ...params,
      type: 'imageRole',
      data: { imageRole: 'first_frame_image' } // Default to first frame | 默认首帧
    })
  } else if ((sourceNode?.type === 'text' || sourceNode?.type === 'promptExtract') && targetNode?.type === 'imageConfig') {
    // 支持从 text 或 promptExtract 节点向 imageConfig 连线
    const existingTextEdges = edges.value.filter(e => 
      e.target === params.target && e.type === 'promptOrder'
    )
    const nextOrder = existingTextEdges.length + 1
    
    addEdge({
      ...params,
      type: 'promptOrder',
      data: { promptOrder: nextOrder }
    })
  } else if (sourceNode?.type === 'image' && targetNode?.type === 'imageConfig') {
    // Use imageOrder edge type | 使用图片顺序边类型
    // Calculate next order number | 计算下一个顺序号
    const existingImageEdges = edges.value.filter(e =>
      e.target === params.target && e.type === 'imageOrder'
    )

    // Get @ mentioned image count from connected TextNodes | 获取已连接 TextNode 中 @ 提及的图片数量
    let mentionedImageCount = 0
    const connectedTextEdges = edges.value.filter(e => e.target === params.target)
    for (const edge of connectedTextEdges) {
      const sourceNode = nodes.value.find(n => n.id === edge.source)
      if (sourceNode?.type === 'text') {
        const content = sourceNode.data?.content || ''
        // Count @ mentions of image nodes | 统计图片节点的 @ 提及
        const mentionRegex = /@\[([^\]|]+)(?:\|([^\]]+))?\]/g
        let match
        while ((match = mentionRegex.exec(content)) !== null) {
          const mentionedNode = nodes.value.find(n => n.id === match[1])
          if (mentionedNode?.type === 'image') {
            mentionedImageCount++
          }
        }
      }
    }

    // Next order = existing edges + mentioned image count + 1 | 下一个序号 = 现有边数 + @提及图片数 + 1
    const nextOrder = existingImageEdges.length + mentionedImageCount + 1

    addEdge({
      ...params,
      type: 'imageOrder',
      data: { imageOrder: nextOrder }
    })
  } else if (sourceNode?.type === 'llmConfig' && targetNode?.type === 'imageConfig') {
    // LLM output as prompt for image generation | LLM 输出作为图片生成提示词
    const existingTextEdges = edges.value.filter(e =>
      e.target === params.target && e.type === 'promptOrder'
    )
    const nextOrder = existingTextEdges.length + 1

    addEdge({
      ...params,
      type: 'promptOrder',
      data: { promptOrder: nextOrder }
    })
  } else if (sourceNode?.type === 'llmConfig' && targetNode?.type === 'videoConfig') {
    // LLM output as prompt for video generation | LLM 输出作为视频生成提示词
    addEdge({
      ...params,
      type: 'promptOrder',
      data: { promptOrder: 1 }
    })
  } else if (sourceNode?.type === 'image' && targetNode?.type === 'image') {
    // Image to Image connection | 图图连接 - 默认不使用角色标签
    addEdge({
      ...params,
      type: 'default'
    })
  } else {
    addEdge({
      ...params,
      type: 'default'
    })
  }

  // 记录连接成功的时间，用于防止在 onConnectEnd 中弹出不必要的菜单
  lastConnectTime.value = Date.now()
}

// 连线结束时的状态
const pendingConnection = ref(null)
const showConnectionMenu = ref(false)
const connectionMenuPosition = ref({ x: 0, y: 0 })
const connectionStartInfo = ref(null)
const lastConnectTime = ref(0) // 记录上一次成功连接的时间点

watch(showConnectionMenu, (newVal) => {
  if (!newVal && pendingConnection.value?.ghostNodeId) {
    removeNodes([pendingConnection.value.ghostNodeId])
    pendingConnection.value = null
  }
})

const onConnectStart = ({ nodeId, handleId, handleType }) => {
  connectionStartInfo.value = { nodeId, handleId, handleType }
}

// Handle connect end - 当连线拖到空白处时弹出菜单
const onConnectEnd = (event) => {
  // 延迟检查，给 onConnect 留出更新 lastConnectTime 的时间
  setTimeout(() => {
    // 如果最近 100ms 内发生了成功的物理连接，说明不是拖到空白处，直接退出
    if (Date.now() - lastConnectTime.value < 100) {
      connectionStartInfo.value = null
      return
    }

    // 检查是否连接到了目标节点
    const targetElement = event.target
    const isHandle = targetElement?.classList?.contains('vue-flow__handle')

    if (!isHandle && connectionStartInfo.value) {
      // 连线拖到了空白处，显示创建节点菜单
      const clientX = 'clientX' in event ? event.clientX : (event.changedTouches?.[0]?.clientX || 0)
      const clientY = 'clientY' in event ? event.clientY : (event.changedTouches?.[0]?.clientY || 0)

      const container = canvasContainerRef.value
      if (!container) {
        connectionStartInfo.value = null
        return
      }

    const rect = container.getBoundingClientRect()
    const position = screenToFlowCoordinate({ x: clientX - rect.left, y: clientY - rect.top })
    
    const ghostNodeId = addNode('ghost', position, {})
    
    addEdge({
      id: `ghost_edge_${Date.now()}`,
      source: connectionStartInfo.value.nodeId,
      sourceHandle: connectionStartInfo.value.handleId,
      target: ghostNodeId,
      targetHandle: 'left',
      type: 'default'
    })

    // 保存连接信息
    pendingConnection.value = {
      source: connectionStartInfo.value.nodeId,
      sourceHandle: connectionStartInfo.value.handleId,
      position,
      ghostNodeId
    }

    // 显示菜单
    connectionMenuPosition.value = { x: clientX, y: clientY - 10 }
    showConnectionMenu.value = true
  }
  
    // 不管是否成功触发菜单，最终清空抓取记录
    connectionStartInfo.value = null
  }, 50)
}

// 从连接菜单创建节点
const createNodeFromConnection = (type) => {
  if (!pendingConnection.value) return

  const { source, sourceHandle, position, ghostNodeId } = pendingConnection.value

  if (ghostNodeId) {
    removeNodes([ghostNodeId])
  }

  // 创建新节点
  const nodeId = addNode(type, position, {}, true)

  // 创建连线
  addEdge({
    source,
    sourceHandle,
    target: nodeId,
    targetHandle: 'left'
  })

  setTimeout(() => updateNodeInternals(nodeId), 50)

  // 关闭菜单
  showConnectionMenu.value = false
  pendingConnection.value = null
}

const syncSelectedNodeIds = () => {
  selectedNodeIds.value = nodes.value
    .filter(node => node.selected || node.data?.selected)
    .map(node => node.id)
}

const onNodeClick = (event) => {
  showQuickCreateMenu.value = false
  const clickedId = event.node.id
  const shouldKeepExisting = event.event?.shiftKey || event.event?.ctrlKey || event.event?.metaKey
  const nextSelected = new Set(shouldKeepExisting ? selectedNodeIds.value : [])

  if (shouldKeepExisting && nextSelected.has(clickedId)) {
    nextSelected.delete(clickedId)
  } else {
    nextSelected.add(clickedId)
  }

  selectedNodeIds.value = [...nextSelected]
  nodes.value = nodes.value.map(node => ({
    ...node,
    selected: nextSelected.has(node.id),
    data: {
      ...node.data,
      selected: nextSelected.has(node.id)
    }
  }))
}

// Handle edges change | 处理边变化
const onEdgesChange = (changes) => {
  // 应用变更到 store
  applyEdgeChanges(changes, edges.value)
  
  // Check if any edge is being removed | 检查是否有边被删除
  const hasRemoval = changes.some(change => change.type === 'remove')
  
  if (hasRemoval) {
    // Trigger history save after edge removal | 边删除后触发历史保存
    nextTick(() => {
      manualSaveHistory()
    })
  }
}

const onNodesChange = (changes) => {
  // 应用物理变更（位置、删除等）到 store
  applyNodeChanges(changes, nodes.value)
  
  let shouldSyncSelection = false

  for (const change of changes) {
    if (change.type === 'select') {
      // 直接修改节点，避免创建新数组
      const node = nodes.value.find(n => n.id === change.id)
      if (node) {
        node.selected = change.selected
        node.data.selected = change.selected
      }
      shouldSyncSelection = true
    }
  }

  if (shouldSyncSelection) {
    syncSelectedNodeIds()
  }
}

const onNodeDragStart = () => {
  startBatchOperation()
}

const onNodeDragStop = () => {
  endBatchOperation()
}

const sendSidebarMessage = () => sendMessage()

// Handle pane click | 处理画布点击
const onPaneClick = (event) => {
  showNodeMenu.value = false
  showConnectionMenu.value = false
  clearNodeSelection()

  if (!event || typeof event.clientX !== 'number' || typeof event.clientY !== 'number') {
    showQuickCreateMenu.value = false
    return
  }

  const now = Date.now()
  const deltaTime = now - lastPaneClick.value.time
  const deltaX = Math.abs(event.clientX - lastPaneClick.value.x)
  const deltaY = Math.abs(event.clientY - lastPaneClick.value.y)
  const isDoubleClick = deltaTime < 320 && deltaX < 12 && deltaY < 12

  if (isDoubleClick) {
    openQuickCreateMenuAtEvent(event)
    lastPaneClick.value = { time: 0, x: 0, y: 0 }
    return
  }

  showQuickCreateMenu.value = false
  lastPaneClick.value = {
    time: now,
    x: event.clientX,
    y: event.clientY
  }
}

const clearNodeSelection = () => {
  selectedNodeIds.value = []
  nodes.value = nodes.value.map(node => ({
    ...node,
    selected: false,
    data: {
      ...node.data,
      selected: false
    }
  }))
}

const isEditingFormElement = () => {
  const active = document.activeElement
  if (!active) return false
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) || active.isContentEditable
}

const deleteSelectedNodes = () => {
  syncSelectedNodeIds()
  if (selectedNodeIds.value.length === 0) return

  removeNodes(selectedNodeIds.value)
  selectedNodeIds.value = []
  window.$message?.success('已删除选中节点')
}

// 剪贴板缓存（仅本会话内有效）
const clipboardNodes = ref([])
const clipboardEdges = ref([])

// 跟踪鼠标在画布容器中的最后位置（屏幕坐标）
const lastMouseScreen = ref(null)
const handleCanvasMouseMove = (e) => {
  lastMouseScreen.value = { x: e.clientX, y: e.clientY }
}

const copySelectedNodes = () => {
  syncSelectedNodeIds()
  if (selectedNodeIds.value.length === 0) return false

  const idSet = new Set(selectedNodeIds.value)
  const copiedNodes = nodes.value
    .filter(n => idSet.has(n.id))
    .map(n => JSON.parse(JSON.stringify(n)))

  const copiedEdges = edges.value
    .filter(e => idSet.has(e.source) && idSet.has(e.target))
    .map(e => JSON.parse(JSON.stringify(e)))

  clipboardNodes.value = copiedNodes
  clipboardEdges.value = copiedEdges
  window.$message?.success(`已复制 ${copiedNodes.length} 个节点`)
  return true
}

const pasteNodes = () => {
  if (clipboardNodes.value.length === 0) {
    window.$message?.info('剪贴板为空')
    return
  }

  // 计算复制节点群的几何中心（基于原坐标）
  const xs = clipboardNodes.value.map(n => n.position?.x || 0)
  const ys = clipboardNodes.value.map(n => n.position?.y || 0)
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2

  // 决定粘贴目标点（画布坐标）：优先用鼠标位置，否则在原位置基础上偏移
  let targetX = centerX + 40
  let targetY = centerY + 40
  const container = canvasContainerRef.value
  if (lastMouseScreen.value && container) {
    const rect = container.getBoundingClientRect()
    const mx = lastMouseScreen.value.x
    const my = lastMouseScreen.value.y
    // 仅当鼠标确实在画布容器内时才用作粘贴目标
    if (mx >= rect.left && mx <= rect.right && my >= rect.top && my <= rect.bottom) {
      const flow = screenToFlowCoordinate({ x: mx - rect.left, y: my - rect.top })
      targetX = flow.x
      targetY = flow.y
    }
  }

  const dx = targetX - centerX
  const dy = targetY - centerY

  const idMap = new Map()
  const newNodeSpecs = clipboardNodes.value.map(src => ({
    type: src.type,
    position: {
      x: (src.position?.x || 0) + dx,
      y: (src.position?.y || 0) + dy,
    },
    data: { ...src.data, selected: false },
  }))

  const newIds = addNodes(newNodeSpecs)
  clipboardNodes.value.forEach((src, i) => idMap.set(src.id, newIds[i]))

  if (clipboardEdges.value.length > 0) {
    const newEdgeSpecs = clipboardEdges.value
      .map(e => {
        const source = idMap.get(e.source)
        const target = idMap.get(e.target)
        if (!source || !target) return null
        return {
          source,
          target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          type: e.type,
          data: e.data ? JSON.parse(JSON.stringify(e.data)) : undefined,
        }
      })
      .filter(Boolean)
    if (newEdgeSpecs.length > 0) addEdges(newEdgeSpecs)
  }

  selectedNodeIds.value = newIds
  window.$message?.success(`已粘贴 ${newIds.length} 个节点`)
}

const handleGlobalKeydown = (event) => {
  if (isEditingFormElement()) return

  // 撤销/重做
  if (event.ctrlKey || event.metaKey) {
    if (event.key === 'z') {
      event.preventDefault()
      if (event.shiftKey) {
        redo()
      } else {
        undo()
      }
      return
    }
    if (event.key === 'y') {
      event.preventDefault()
      redo()
      return
    }
    // 复制
    if (event.key === 'c' || event.key === 'C') {
      if (copySelectedNodes()) event.preventDefault()
      return
    }
    // 粘贴
    if (event.key === 'v' || event.key === 'V') {
      event.preventDefault()
      pasteNodes()
      return
    }
    // 复制并立即粘贴（"再制"）
    if (event.key === 'd' || event.key === 'D') {
      event.preventDefault()
      if (copySelectedNodes()) pasteNodes()
      return
    }
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    deleteSelectedNodes()
  }
}

// Handle project action | 处理项目操作
const handleProjectAction = (key) => {
  switch (key) {
    case 'rename':
      renameValue.value = projectName.value
      showRenameModal.value = true
      break
    case 'duplicate':
      // TODO: Implement duplicate
      window.$message?.info('复制功能开发中')
      break
    case 'delete':
      showDeleteModal.value = true
      break
  }
}

// Confirm rename | 确认重命名
const confirmRename = async () => {
  const projectId = route.params.id
  if (renameValue.value.trim()) {
    await projectsStore.updateProjectName(projectId, renameValue.value.trim())
    window.$message?.success('已重命名')
  }
  showRenameModal.value = false
}

// Confirm delete | 确认删除
const confirmDelete = async () => {
  const projectId = route.params.id
  await projectsStore.deleteProject(projectId)
  showDeleteModal.value = false
  window.$message?.success('项目已删除')
  router.push('/')
}

// Handle Enter key | 处理回车键
const handleEnterKey = (e) => {
  e.preventDefault()
  sendMessage()
}

const sendMessage = async () => {
  const content = chatInput.value.trim()
  if (!content || isProcessing.value) return

  // Check API configuration | 检查 API 配置
  if (!isApiConfigured.value) {
    window.$message?.warning('请先配置 API Key')
    showApiSettings.value = true
    return
  }

  isProcessing.value = true
  chatInput.value = ''
  // 发送后重置输入框高度
  if (chatTextareaRef.value) {
    chatTextareaRef.value.style.height = 'auto'
  }
  syncConversationDraft('')
  appendConversationMessage('user', content)
  scrollToBottom()
  startSidebarDebugState()
  
  // 先添加一个 AI 思考中的占位符
  const assistantMsgId = appendConversationMessage('assistant', '')
  scrollToBottom()

  const originalModel = modelStore.selectedChatModel
  modelStore.selectedChatModel = selectedSidebarModel.value

  const activeSession = conversationSessions.value.find(s => s.id === activeConversationId.value)
  
  // 查找最近的一张图片用于参考 (图生图) | Find last image for reference (Img2Img)
  let lastImageUrl = null
  if (activeSession) {
    const messagesWithImages = [...activeSession.messages].reverse()
    const msgWithImage = messagesWithImages.find(m => m.imageUrl)
    if (msgWithImage) lastImageUrl = msgWithImage.imageUrl
  }

  // 优化判定：支持修改词汇
  const isQuestion = /是什么|为什么|怎么|请解释|介绍一下|描述|说说|讲讲|分析|看看|\?|？/.test(content)
  const isModification = /改|变|换|调|修|变成/i.test(content) && !isQuestion
  const shouldGenerateImage = (/生成|画|绘|配图|海报|来一|做一|创作/i.test(content) || isModification) && !isQuestion
  const shouldCreateWorkflow = /工作流|节点|分镜|视频|动起来|镜头|场景/i.test(content) && !isQuestion

  // 同步上下文给 AI | Sync context to AI
  if (activeSession && chatHistory) {
    chatHistory.value = activeSession.messages
      .filter(m => m.id !== assistantMsgId && (m.content || m.reasoning))
      .map(m => ({ 
        role: m.role, 
        content: m.content || (m.reasoning ? `<thought>${m.reasoning}</thought>` : '') 
      }))
  }

  try {
    if (shouldCreateWorkflow) {
      // Smart Agent mode: explain what will be generated, then execute | 智能 Agent 模式：先说明要生成什么，然后执行
      sidebarRequestStatus.value = '正在分析你的需求...'
      updateAssistantMessage(assistantMsgId, '正在理解你的需求...')

      const maxY = nodes.value.length > 0 ? Math.max(...nodes.value.map(n => n.position.y)) : 0
      const baseX = 100
      const baseY = maxY + 200

      try {
        const result = await analyzeIntent(content)
        markSidebarFirstResponse()

        // 构建智能说明文案
        let explanation = ''
        if (isThinkingMode.value) {
          // 思考模式：详细说明
          explanation = `好的，我理解了你的需求。\n\n`
          explanation += `**我会为你生成：**\n${result?.description || '图片内容'}\n\n`

          if (result?.image_prompt) {
            explanation += `**画面描述：**\n${result.image_prompt}\n\n`
          }

          if (result?.workflow_type === 'text_to_image_to_video') {
            explanation += `**视频动态：**\n${result.video_prompt || '画面动起来'}\n\n`
          }

          if (result?.character) {
            explanation += `**角色设定：**\n${result.character.name} - ${result.character.description}\n\n`
          }

          if (result?.shots && result.shots.length > 0) {
            explanation += `**分镜数量：**${result.shots.length} 个场景\n\n`
          }

          explanation += `正在为你创建节点并开始生成...`
        } else {
          // 普通模式：简洁说明
          explanation = `好的，我会为你生成：${result?.description || '图片内容'}\n\n`
          if (result?.image_prompt) {
            explanation += `${result.image_prompt}\n\n`
          }
          explanation += `正在创建节点...`
        }

        updateAssistantMessage(assistantMsgId, explanation)

        const workflowParams = {
          workflow_type: result?.workflow_type || WORKFLOW_TYPES.TEXT_TO_IMAGE,
          image_prompt: result?.image_prompt || content,
          video_prompt: result?.video_prompt || content,
          character: result?.character,
          shots: result?.shots
        }

        sidebarRequestStatus.value = `正在生成：${result?.description || '图片'}...`
        const workflowResult = await executeWorkflow(workflowParams, { x: baseX, y: baseY })

        updateAssistantMessage(assistantMsgId, explanation + '\n\n✅ 节点已创建，正在生成中...')

        if (workflowResult?.imageUrl) {
          updateAssistantMessage(assistantMsgId, explanation + '\n\n✅ 生成完成！', '', { imageUrl: workflowResult.imageUrl })
        }
        sidebarRequestStatus.value = '生成完成'
      } catch (err) {
        console.error('Workflow error:', err)
        await createTextToImageWorkflow(content, { x: baseX, y: baseY })
        updateAssistantMessage(assistantMsgId, '好的，我会为你生成图片。\n\n正在创建节点...')
      }
    } else if (shouldGenerateImage) {
      // Smart Agent Image Generation | 智能 Agent 图片生成
      const modeText = lastImageUrl ? '正在理解你的修改需求...' : '正在构思画面...'
      sidebarRequestStatus.value = modeText

      let optimizedPrompt = ''
      let agentExplanation = ''

      try {
        // 构建智能 Agent 指令
        const polishInstruction = (isThinkingMode.value || lastImageUrl)
          ? `你是一个专业的 AI 绘画助手。${lastImageUrl ? '用户提供了参考图，' : ''}用户需求：”${content}”

## 你的任务：
1. 理解用户需求，构思完整的画面描述
2. ${isThinkingMode.value ? '进行深度思考，分析画面的构图、光影、色调、情绪等要素' : '简洁地说明要生成什么画面'}
3. 输出格式：
   ${isThinkingMode.value ? '【我会为你生成】\n详细的画面描述，包括：\n- 主体内容\n- 构图布局\n- 光影效果\n- 色调氛围\n- 艺术风格\n\n【优化后的提示词】\n完整的生图提示词' : '【我会为你生成】\n简洁的画面描述\n\n【提示词】\n优化后的提示词'}

${lastImageUrl ? '注意：需要保持原图的角色特征和场景氛围，只修改用户指定的部分。' : ''}`
          : `你是一个专业的 AI 绘画助手。用户需求：”${content}”

## 你的任务：
${isThinkingMode.value
  ? '1. 深度分析用户需求，构思完整的画面\n2. 详细说明画面的构图、光影、色调、风格等\n3. 输出格式：\n【我会为你生成】\n详细的画面描述\n\n【优化后的提示词】\n完整的生图提示词'
  : '1. 理解用户需求，简洁说明要生成什么画面\n2. 输出格式：\n【我会为你生成】\n简洁的画面描述\n\n【提示词】\n优化后的提示词'}`;

        // 使用流式对话优化提示词
        await sendChat(
          polishInstruction,
          true,
          {
            model: selectedSidebarModel.value,
            isThinking: isThinkingMode.value,
            images: lastImageUrl ? [lastImageUrl] : [],
            onStream: ({ content, reasoning }) => {
              agentExplanation = content
              updateAssistantMessage(assistantMsgId, content, reasoning)
              scrollToBottom()
            }
          }
        )

        // 从 AI 回复中提取提示词
        const promptMatch = agentExplanation.match(/【(?:优化后的)?提示词】\s*\n([\s\S]+?)(?:\n\n|$)/)
        if (promptMatch) {
          optimizedPrompt = promptMatch[1].trim()
        } else {
          // 如果没有匹配到，使用整个回复作为提示词
          optimizedPrompt = agentExplanation.split('\n\n').pop() || content
        }

        if (!optimizedPrompt) optimizedPrompt = content
        if (!optimizedPrompt.includes('--ar')) optimizedPrompt += ' --ar 9:16'
      } catch (e) {
        optimizedPrompt = content + ' --ar 9:16'
        agentExplanation = `好的，我会为你生成：${content}`
      }

      sidebarRequestStatus.value = '正在生成图片...'
      updateAssistantMessage(assistantMsgId, agentExplanation + '\n\n🎨 正在生成中...', '', { isGeneratingImage: true })
      scrollToBottom()

      try {
        const images = await generateImageApi({
          prompt: optimizedPrompt,
          model: selectedSidebarImageModel.value,
          size: '9:16',
          image: lastImageUrl
        })

        if (images?.[0]?.url) {
          sidebarRequestStatus.value = '生成完成'
          updateAssistantMessage(assistantMsgId, agentExplanation + '\n\n✅ 生成完成！', '', {
            imageUrl: images[0].url,
            isGeneratingImage: false
          })
          scrollToBottom()
        } else {
          throw new Error('未获取到有效的图片地址')
        }
      } catch (err) {
        console.error('Image generation detailed error:', err)
        sidebarRequestStatus.value = '图片生成失败'

        let errorMsg = err.response?.data?.code_reason || err.response?.data?.message || err.message || '网络请求超时或服务器繁忙'

        if (errorMsg.toLowerCase().includes('exhausted') || errorMsg.includes('429')) {
          errorMsg = '您的 API 额度已耗尽或触发了频率限制。\n\n建议：\n1. 点击侧边栏上方切换其他绘画模型\n2. 检查您的 API Key 余额'
        }

        updateAssistantMessage(assistantMsgId, `⚠️ 生成失败\n\n${errorMsg}`, '', { isGeneratingImage: false })
      }
    } else {
      // Normal Chat path
      sidebarRequestStatus.value = isThinkingMode.value ? 'AI 正在深度思考...' : 'AI 正在全力回复...'

      await sendChat(content, true, {
        model: selectedSidebarModel.value,
        systemPrompt: isThinkingMode.value
          ? CHAT_TEMPLATES.chat.thinkingPrompt
          : CHAT_TEMPLATES.chat.systemPrompt,
        onStream: ({ content, reasoning }) => {
          markSidebarFirstResponse()
          updateAssistantMessage(assistantMsgId, content, reasoning)
          scrollToBottom()
        }
      })
      sidebarRequestStatus.value = '对话回复完成。'
    }
  } catch (err) {
    sidebarRequestStatus.value = `请求失败：${err.message || '未知错误'}`
    window.$message?.error(err.message || '操作失败')
  } finally {
    isProcessing.value = false
    setTimeout(() => {
      resetSidebarDebugState()
    }, 1800)
  }
}

// Handle AI polish | 处理 AI 润色
const handlePolish = async () => {
  const input = chatInput.value.trim()
  if (!input) return
  
  // Check API configuration | 检查 API 配置
  if (!isApiConfigured.value) {
    window.$message?.warning('请先配置 API Key')
    showApiSettings.value = true
    return
  }

  isProcessing.value = true
  const originalInput = chatInput.value

  try {
    // Call chat API to polish the prompt | 调用 AI 润色提示词
    const result = await sendChat(input, true)
    
    if (result) {
      chatInput.value = result
      window.$message?.success('提示词已润色')
    }
  } catch (err) {
    chatInput.value = originalInput
    window.$message?.error(err.message || '润色失败')
  } finally {
    isProcessing.value = false
  }
}

// Go back to home | 返回首页
const goBack = () => {
  router.push('/')
}

// Check if mobile | 检测是否移动端
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

// Load project by ID | 根据ID加载项目
const loadProjectById = (projectId) => {
  // Update flow key to force VueFlow re-render | 更新 key 强制 VueFlow 重新渲染
  flowKey.value = Date.now()
  
  if (projectId && projectId !== 'new') {
    loadProject(projectId)
  } else {
    // New project - clear canvas | 新项目 - 清空画布
    clearCanvas()
  }
}

// Watch for route changes | 监听路由变化
watch(
  () => route.params.id,
  async (newId, oldId) => {
    if (newId && newId !== oldId) {
      // Save current project before switching | 切换前保存当前项目
      if (oldId) {
        await saveProject()
      }
      // Load new project | 加载新项目
      loadProjectById(newId)
    }
  }
)

watch(chatInput, (value) => {
  syncConversationDraft(value)
})

// Initialize | 初始化
onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('mousemove', handleSidebarResize)
  window.addEventListener('mouseup', stopSidebarResize)

  // Initialize projects store | 初始化项目存储
  await projectsStore.initialize()

  // Load project data | 加载项目数据
  loadProjectById(route.params.id)

  // Check for initial prompt from home page | 检查来自首页的初始提示词
  const initialPrompt = sessionStorage.getItem('dalong-canvas-initial-prompt')
  if (initialPrompt) {
    sessionStorage.removeItem('dalong-canvas-initial-prompt')
    chatInput.value = initialPrompt
    // Auto-send only when API is configured | 仅在已配置 API 时自动发送
    if (isApiConfigured.value) {
      nextTick(() => {
        sendMessage()
      })
    }
  }
})

// Cleanup on unmount | 卸载时清理
onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('mousemove', handleSidebarResize)
  window.removeEventListener('mouseup', stopSidebarResize)

  // Save project before leaving | 离开前保存项目
  saveProject()
})
</script>

<style>
/* Import Vue Flow styles | 引入 Vue Flow 样式 */
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/minimap/dist/style.css';

.canvas-flow {
  width: 100%;
  height: 100%;
}

.minimap-shell {
  width: 220px;
  height: 160px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(26, 26, 28, 0.92);
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(99, 102, 241, 0.08);
  overflow: hidden;
  transition: box-shadow 0.2s ease;
}

.minimap-shell:hover {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(99, 102, 241, 0.25);
}

.sidebar-minimap {
  width: 100%;
  height: 100%;
  display: block;
}

.sidebar-minimap :deep(svg) {
  width: 100%;
  height: 100%;
}

.sidebar-minimap :deep(.vue-flow__minimap) {
  position: relative !important;
  width: 100% !important;
  height: 100% !important;
  background: transparent !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.sidebar-minimap :deep(.vue-flow__minimap-mask) {
  fill: rgba(99, 102, 241, 0.12);
  stroke: rgba(99, 102, 241, 0.5);
  stroke-width: 1;
}

.sidebar-minimap :deep(.vue-flow__minimap-node) {
  rx: 3;
  opacity: 0.9;
}

.sidebar-resizer {
  width: 8px;
  cursor: col-resize;
  position: relative;
  background: transparent;
}

.sidebar-resizer::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 50%;
  transform: translateY(-50%);
  width: 2px;
  height: 56px;
  border-radius: 999px;
  background: var(--border-color);
  transition: background-color 0.2s ease;
}

.sidebar-resizer:hover::after {
  background: var(--text-secondary);
}

.vertical-sidebar-title {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  letter-spacing: 0.28em;
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.canvas-flow .vue-flow__selection,
.canvas-flow .vue-flow__nodesselection-rect.dragging {
  background: rgba(161, 161, 170, 0.22);
  border: 1px dashed rgba(255, 255, 255, 0.95);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.canvas-flow .vue-flow__nodesselection,
.canvas-flow .vue-flow__nodesselection-rect,
.canvas-flow .vue-flow__nodesselection-rect:focus,
.canvas-flow .vue-flow__nodesselection-rect:focus-visible {
  background: transparent !important;
  border: 0 !important;
  outline: 0 !important;
  box-shadow: none !important;
  pointer-events: none;
}

.canvas-flow .vue-flow__node.selected {
  box-shadow: none !important;
  outline: none !important;
  border-color: transparent !important;
}

.canvas-flow .vue-flow__edge.selected .vue-flow__edge-path {
  stroke: #fafafa;
  stroke-width: 2.5;
}
/* Quick create menu animation | 快捷创建菜单动画 */
.quick-create-menu-animation {
  animation: quickMenuScaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: top left;
}

@keyframes quickMenuScaleIn {
  0% { transform: scale(0.5); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

/* Chat Input Styling | 对话框极简工业风格 */
.chat-input-container {
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(20px);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.chat-input-container:focus-within {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(245, 245, 240, 0.5);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(245, 245, 240, 0.1) inset;
}

/* 思考模式柔和白光边框效果 | Thinking Mode Soft White Glow */
.chat-input-container.thinking-mode-active {
  border-color: rgba(245, 245, 240, 0.7);
  background: rgba(255, 255, 255, 0.03);
  box-shadow:
    0 0 8px rgba(245, 245, 240, 0.2),
    0 2px 8px rgba(0, 0, 0, 0.3);
  animation: thinking-pulse 2s ease-in-out infinite;
}

@keyframes thinking-pulse {
  0%, 100% {
    border-color: rgba(245, 245, 240, 0.7);
    box-shadow:
      0 0 8px rgba(245, 245, 240, 0.2),
      0 2px 8px rgba(0, 0, 0, 0.3);
  }
  50% {
    border-color: rgba(255, 255, 255, 0.8);
    box-shadow:
      0 0 12px rgba(245, 245, 240, 0.3),
      0 2px 8px rgba(0, 0, 0, 0.3);
  }
}

/* 全局滚动条优化 Custom Scrollbar for all elements | 仅在 Webkit 浏览器中有效 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

/* Markdown Content Rich Styling | 富文本排版美化 */
.chat-bubble-content {
  line-height: 1.45;
}
.chat-bubble-content strong {
  color: #fff; /* 突出显示加粗文字 */
}
.chat-h3 {
  color: var(--accent-color);
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}

.chat-textarea {
  width: 100%;
  height: auto;
  min-height: 48px;
  max-height: 300px;
  background: transparent;
  border: none;
  border-radius: 12px;
  padding: 8px 8px;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  outline: none;
  overflow-y: auto;
  transition: height 0.1s ease;
}

.chat-textarea::placeholder {
  color: var(--text-secondary);
  opacity: 0.5;
}

.chat-bottom-bar {
  display: flex;
  align-items: center;
  justify-content: flex-start; /* 靠左排列 */
  gap: 8px; /* 进一步收紧间距 */
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
}

.model-select-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 4px;
  width: 160px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.04);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
  white-space: nowrap;
}

.model-select-btn .truncate {
  max-width: 120px;
}

.model-select-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(245, 245, 240, 0.4);
  color: rgba(245, 245, 240, 0.95);
  transform: translateY(-1px);
}

.chat-send-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 20px;
  height: 40px;
  background: rgba(255, 255, 255, 0.95);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  color: #1a1a1c;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  margin-left: auto;
  white-space: nowrap;
  flex-shrink: 0;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.chat-send-btn span {
  letter-spacing: 1.5px;
  font-size: 12px;
}

.chat-send-btn:hover:not(:disabled) {
  background: rgba(245, 245, 240, 1);
  border-color: rgba(255, 255, 255, 0.3);
  color: #1a1a1c;
  transform: translateY(-2px);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.4),
    0 0 8px rgba(245, 245, 240, 0.3);
}

.chat-send-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.chat-send-btn:disabled {
  opacity: 0.2;
  cursor: not-allowed;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: none;
}

.thinking-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.04);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: var(--text-secondary);
  transition: all 0.2s ease;
  cursor: pointer;
}

.thinking-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  color: var(--text-primary);
  transform: translateY(-2px);
}

.thinking-toggle-btn.active {
  background: rgba(245, 245, 240, 0.12);
  border-color: rgba(245, 245, 240, 0.6);
  color: rgba(245, 245, 240, 0.95);
  box-shadow: 0 0 8px rgba(245, 245, 240, 0.2);
}

.thinking-glow-effect {
  position: absolute;
  inset: -2px;
  background: rgba(245, 245, 240, 0.4);
  border-radius: 10px;
  z-index: -1;
  animation: white-pulse 2s ease-in-out infinite;
  filter: blur(6px);
  pointer-events: none;
}

@keyframes white-pulse {
  0%, 100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.03);
  }
}

/* 图片生成中动画 | Image continuous loading animation */
.chat-image-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-left-color: #fff;
  border-radius: 50%;
  animation: chat-spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes chat-spin {
  to { transform: rotate(360deg); }
}

/* 思考跳动点动画 | Thinking dots animation */
.thinking-dots {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.thinking-dot {
  width: 4px;
  height: 4px;
  background: var(--text-secondary);
  border-radius: 50%;
  opacity: 0.4;
  animation: dot-jump 1.4s infinite ease-in-out both;
}

.thinking-dot:nth-child(1) { animation-delay: -0.32s; }
.thinking-dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes dot-jump {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1.0); opacity: 1; }
}

/* 多选工具栏动画 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}
</style>
