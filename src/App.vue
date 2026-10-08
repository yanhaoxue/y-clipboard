<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { api } from './api'
import { useStore } from './composables/useStore'
import type { ClipboardRecord } from './types'
import Sidebar from './components/Sidebar.vue'
import Toolbar from './components/Toolbar.vue'
import VirtualList from './components/VirtualList.vue'
import ImagePreview from './components/ImagePreview.vue'
import CodePreview from './components/CodePreview.vue'

const store = useStore()

const selectedRecord = computed(() =>
  store.filtered.value[store.selectedIndex.value] ?? null
)

/* ---------- 全屏预览：图片看大图，代码看全文 ---------- */

const previewOpen = ref(false)
const previewIndex = ref(0)

/**
 * 当前过滤结果里所有"值得全屏看"的记录（←→ 在这批之间切换）。
 * 图片在卡片里看不清细节，代码在卡片里放不下 —— 两者都需要更大的空间。
 */
const previewableRecords = computed(() =>
  store.filtered.value.filter((r) => r.kind === 'image' || r.kind === 'code')
)

const previewRecord = computed(() => previewableRecords.value[previewIndex.value] ?? null)

function openPreview(r: ClipboardRecord): void {
  const i = previewableRecords.value.findIndex((x) => x.id === r.id)
  if (i < 0) return
  previewIndex.value = i
  previewOpen.value = true
}

function movePreview(delta: number): void {
  const len = previewableRecords.value.length
  if (len === 0) return
  previewIndex.value = (previewIndex.value + delta + len) % len
}

function closePreview(): void {
  previewOpen.value = false
}

function copyPreview(r: ClipboardRecord): void {
  closePreview()
  void store.copyRecord(r)
}

const starredIds = computed(() => {
  const set = new Set<string>()
  // 以当前渲染的集合为准：远端搜索结果不在 records 里，否则它们的星标会丢失
  for (const r of store.filtered.value) {
    const k = store.favKey(r)
    if (store.favorites.value.some((f) => f.id === k)) set.add(k)
  }
  return set
})

/* ---------- 主题 ---------- */

function applyTheme(): void {
  const t = api.theme()
  document.documentElement.classList.toggle('dark', t.dark)
  if (t.accent) document.documentElement.style.setProperty('--accent', t.accent)
}

/* ---------- 键盘流 ---------- */

function onKeyDown(e: KeyboardEvent): void {
  const inInput = e.target instanceof HTMLInputElement

  // 预览层打开时接管键盘：Esc 关闭 / ←→ 切换 / Enter 复制
  if (previewOpen.value) {
    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        closePreview()
        return
      case 'ArrowLeft':
        e.preventDefault()
        movePreview(-1)
        return
      case 'ArrowRight':
        e.preventDefault()
        movePreview(1)
        return
      case 'Enter':
        e.preventDefault()
        if (previewRecord.value) copyPreview(previewRecord.value)
        return
    }
    return
  }

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      store.moveSelection(1)
      break
    case 'ArrowUp':
      e.preventDefault()
      store.moveSelection(-1)
      break
    case 'Home':
      if (inInput) return
      e.preventDefault()
      store.setCat('all')
      break
    case ' ': {
      // Space：选中项是图片（看大图）或代码（看全文）时打开全屏预览
      if (inInput) return
      const rec = selectedRecord.value
      if (rec && (rec.kind === 'image' || rec.kind === 'code')) {
        e.preventDefault()
        openPreview(rec)
      }
      break
    }
    case 'Enter': {
      e.preventDefault()
      const rec = selectedRecord.value
      if (rec) void store.copyRecord(rec)
      break
    }
    case 'Delete':
      if (inInput) return
      e.preventDefault()
      if (selectedRecord.value) void store.deleteRecord(selectedRecord.value)
      break
    case 'Escape':
      e.preventDefault()
      api.outPlugin()
      break
  }
}

/* ---------- 生命周期 ---------- */

onMounted(() => {
  applyTheme()
  api.onThemeChange(applyTheme)
  window.addEventListener('keydown', onKeyDown)
  store.init()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <div class="app">
    <Toolbar />
    <div class="app-body">
      <Sidebar />
      <main class="main">
        <VirtualList
          v-if="store.filtered.value.length > 0"
          :items="store.filtered.value"
          :selected-id="selectedRecord?.id ?? null"
          :starred-ids="starredIds"
          :img-scale="store.imgScale.value"
          :reset-key="store.listKey.value"
          @copy="(r) => store.copyRecord(r)"
          @star="(r) => store.toggleStar(r)"
          @remove="(r) => store.deleteRecord(r)"
          @preview="openPreview"
          @reveal="(p) => store.revealFile(p)"
          @load-more="store.loadMore()"
        />

        <div v-else class="empty">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke-width="1.2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3h9a2 2 0 0 1 2 2v11M5 7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM11 12h4M11 16h4" stroke="currentColor" />
          </svg>
          <p class="empty-title">
            {{ store.loading.value
              ? '正在查找…'
              : store.query.value ? '没有匹配的记录' : '暂无剪贴板历史' }}
          </p>
          <p class="empty-sub">
            {{ store.loading.value
              ? '正在从更久的历史里找这一类记录'
              : store.query.value
                ? '换个关键词，或等待远端搜索结果'
                : '复制任何内容后，会自动出现在这里' }}
          </p>
        </div>
      </main>
    </div>

    <!-- 全屏预览层：按类型走不同的查看器 -->
    <ImagePreview
      v-if="previewOpen && previewRecord?.kind === 'image'"
      :record="previewRecord"
      :index="previewIndex"
      :total="previewableRecords.length"
      @close="closePreview"
      @prev="movePreview(-1)"
      @next="movePreview(1)"
      @copy="copyPreview"
    />
    <CodePreview
      v-else-if="previewOpen && previewRecord?.kind === 'code'"
      :record="previewRecord"
      :index="previewIndex"
      :total="previewableRecords.length"
      @close="closePreview"
      @prev="movePreview(-1)"
      @next="movePreview(1)"
      @copy="copyPreview"
    />
  </div>
</template>

<style scoped>
.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-3);
}

.empty-icon { width: 44px; height: 44px; opacity: 0.5; }
.empty-title { font-size: 13.5px; color: var(--text-2); }
.empty-sub { font-size: 12px; }
</style>
