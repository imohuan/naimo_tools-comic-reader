<template>
  <div
    class="w-full h-screen overflow-hidden select-none bg-[#101014] text-gray-200 flex flex-col"
  >
    <!-- 顶部导航栏 -->
    <header
      class="min-h-14 border-b border-gray-800 bg-[#18181c] flex items-center px-4 justify-between shrink-0 z-20"
    >
      <div class="flex items-center gap-4 min-w-0 flex-1">
        <n-button
          text
          @click="store.toggleSidebar()"
          class="text-gray-400 hover:text-white"
        >
          <template #icon>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
          </template>
        </n-button>
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <span
            class="font-bold text-sm text-gray-200 line-clamp-1 truncate max-w-1/3 inline-block"
            :title="store.currentManga?.name"
          >
            {{ store.currentManga?.name || "未选择漫画" }}
          </span>
          <div
            v-if="store.currentChapter || store.currentPageInfo"
            class="bg-black/80 backdrop-blur px-4 py-1.5 rounded-full border border-gray-800 flex items-center gap-4 shadow-xl shrink-0"
          >
            <span class="text-xs text-gray-300 font-bold">{{
              store.currentChapter || "--"
            }}</span>
            <div class="w-px h-3 bg-gray-600"></div>
            <span class="text-xs font-mono text-green-400">{{
              store.currentPageInfo
            }}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-4 shrink-0">
        <!-- 自动滚动按钮 -->
        <n-button
          :type="store.autoScroll ? 'primary' : 'default'"
          size="small"
          @click="store.toggleAutoScroll()"
        >
          <template #icon>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              ></path>
            </svg>
          </template>
          {{ store.autoScroll ? "停止滚动" : "自动滚动" }}
        </n-button>

        <!-- 设置按钮 -->
        <n-button size="small" @click="store.toggleSettings()">
          <template #icon>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              ></path>
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              ></path>
            </svg>
          </template>
          设置
        </n-button>

        <n-button size="small" @click="loadMangaList">刷新</n-button>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-400">缩放</span>
          <n-slider
            v-model:value="store.zoom"
            :min="10"
            :max="100"
            :step="5"
            :tooltip="false"
            style="width: 100px"
            size="small"
          />
          <span class="text-xs font-mono w-10 text-right text-gray-400"
            >{{ store.zoom }}%</span
          >
        </div>
        <n-button size="small" @click="goToJMComic">JMComic</n-button>
      </div>
    </header>

    <!-- 主体内容区 -->
    <div ref="containerRef" class="flex flex-1 overflow-hidden relative">
      <n-split
        v-if="!store.sidebarCollapsed"
        v-model:size="sidebarSizePercent"
        :max="0.5"
        :min="0.1"
        direction="horizontal"
        :resizable="true"
        :resize-trigger-size="8"
        class="flex-1 h-full overflow-hidden"
        @update:size="handleSplitSizeChange"
      >
        <template #1>
          <!-- 左侧侧边栏 -->
          <aside
            class="bg-[#18181c] border-r border-gray-800 flex flex-col h-full z-10 overflow-hidden"
          >
            <div
              class="p-3 flex justify-between items-center border-b border-gray-800/50 shrink-0"
            >
              <div class="flex items-center gap-2">
                <n-button
                  text
                  size="small"
                  :type="store.expandedMode ? 'primary' : 'default'"
                  @click="
                    store.toggleExpandedMode();
                    loadMangaList();
                  "
                  :title="
                    store.expandedMode
                      ? '展开模式：每个章节独立显示'
                      : '折叠模式：按漫画分组显示'
                  "
                >
                  <template #icon>
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <!-- 展开模式：层级展开图标，表示每个章节独立显示 -->
                      <path
                        v-if="store.expandedMode"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 5l7 7-7 7"
                      ></path>
                      <!-- 折叠模式：层级折叠图标，表示按漫画分组显示 -->
                      <path
                        v-else
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 9l-7 7-7-7"
                      ></path>
                    </svg>
                  </template>
                </n-button>
                <span class="text-xs font-bold text-gray-500 tracking-wider"
                  >书架 LIBRARY</span
                >
              </div>
              <n-button text size="small" @click="loadMangaList">
                <template #icon>
                  <svg
                    class="w-4 h-4"
                    :class="{ 'animate-spin': store.loading.library }"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    ></path>
                  </svg>
                </template>
              </n-button>
            </div>
            <MangaList />
          </aside>
        </template>
        <template #2>
          <!-- 中间阅读区域 -->
          <main class="flex-1 relative bg-[#050505] flex flex-col overflow-hidden h-full">
            <div
              v-if="store.loading.chapter && store.currentImages.length === 0"
              class="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/50 backdrop-blur-sm"
            >
              <n-spin size="large" />
              <span class="mt-4 text-xs text-green-500 font-mono animate-pulse"
                >正在读取数据流...</span
              >
            </div>
            <ImageViewer ref="imageViewerRef" />
          </main>
        </template>
      </n-split>
      <template v-else>
        <!-- 侧边栏折叠时 -->
        <aside
          class="bg-[#18181c] border-r border-gray-800 flex flex-col h-full z-10"
          style="width: 0; overflow: hidden; opacity: 0"
        ></aside>
        <main class="flex-1 relative bg-[#050505] flex flex-col overflow-hidden h-full">
          <div
            v-if="store.loading.chapter && store.currentImages.length === 0"
            class="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/50 backdrop-blur-sm"
          >
            <n-spin size="large" />
            <span class="mt-4 text-xs text-green-500 font-mono animate-pulse"
              >正在读取数据流...</span
            >
          </div>
          <ImageViewer ref="imageViewerRef" />
        </main>
      </template>
    </div>

    <!-- 设置面板 -->
    <SettingsPanel v-if="store.showSettings" />
  </div>
</template>

<script setup lang="ts">
/// <reference path="../types/comic-reader.d.ts" />
import { ref, onMounted, onUnmounted, nextTick, watch } from "vue";
import { useMessage } from "naive-ui";
import { onKeyStroke } from "@vueuse/core";
import { useRouter } from "vue-router";
import { useComicStore } from "@/stores/comic";
import type { ImageItem, MangaItem } from "@/stores/comic";
import MangaList from "@/components/MangaList.vue";
import ImageViewer from "@/components/ImageViewer.vue";
import SettingsPanel from "@/components/SettingsPanel.vue";
import { BOOKMARKS_DIR_NAME } from "@/utils/favorite-utils";

// 在子组件中使用 useMessage，此时 MessageProvider 已经挂载
const message = useMessage();
const router = useRouter();
const store = useComicStore();
const imageViewerRef = ref<InstanceType<typeof ImageViewer> | null>(null);
const containerRef = ref<HTMLElement | null>(null);

// n-split 使用百分比（0-1），需要与像素值转换
const sidebarSizePercent = ref(0.2); // 默认 20%

// 获取容器实际宽度
function getContainerWidth(): number {
  if (containerRef.value) {
    return containerRef.value.offsetWidth || containerRef.value.clientWidth;
  }
  return window.innerWidth || 1920;
}

// 将像素值转换为百分比
function pixelToPercent(pixels: number): number {
  const containerWidth = getContainerWidth();
  if (containerWidth === 0) return 0.2;
  return Math.max(0.1, Math.min(0.5, pixels / containerWidth));
}

// 将百分比转换为像素值
function percentToPixel(percent: number): number {
  const containerWidth = getContainerWidth();
  const pixels = percent * containerWidth;
  return Math.max(200, Math.min(800, pixels));
}

// 处理 split 尺寸变化
function handleSplitSizeChange(value: number) {
  const pixels = percentToPixel(value);
  store.setSidebarWidth(pixels);
}

// 监听侧边栏宽度变化，同步到百分比
watch(
  () => store.sidebarWidth,
  (width) => {
    nextTick(() => {
      sidebarSizePercent.value = pixelToPercent(width);
    });
  },
  { immediate: true }
);

// 监听窗口大小变化，重新计算百分比
watch(
  () => store.sidebarCollapsed,
  (collapsed) => {
    if (!collapsed) {
      nextTick(() => {
        sidebarSizePercent.value = pixelToPercent(store.sidebarWidth);
      });
    }
  }
);

// 自动滚动定时器
let autoScrollInterval: number | null = null;

// 跳转到 JMComic 路由
function goToJMComic() {
  router.push("/jmcomic");
}

// 加载漫画列表
async function loadMangaList() {
  if (store.staticDirs.length === 0) {
    message.warning("请先选择漫画目录");
    return;
  }

  store.setLoading("library", true);
  try {
    // 确保传递的是纯数组，创建新数组避免传递响应式对象
    const staticDirsArray = [...store.staticDirs].map((dir) => String(dir));
    const mangas = await window.comicReaderAPI.getMangaList(
      staticDirsArray,
      store.expandedMode
    );
    store.setMangas(mangas);
    await refreshCurrentSelection(mangas);
  } catch (error) {
    console.error("加载漫画列表失败:", error);
    message.error("加载漫画列表失败");
    if (window.naimo) {
      window.naimo.log.error("加载漫画列表失败", error);
    }
  } finally {
    store.setLoading("library", false);
  }
}

// 检查是否在输入框中
function isInInputElement(): boolean {
  const activeElement = document.activeElement as HTMLElement;
  if (!activeElement) return false;
  return (
    activeElement.tagName === "INPUT" ||
    activeElement.tagName === "TEXTAREA" ||
    activeElement.isContentEditable
  );
}

// 自动滚动功能
function startAutoScroll() {
  if (autoScrollInterval) return;

  autoScrollInterval = window.setInterval(() => {
    if (!imageViewerRef.value) return;

    // 如果当前焦点在输入框中，则不执行滚动
    if (isInInputElement()) return;

    const speed = store.autoScrollSpeed * 2; // 像素/帧

    // 优先使用组件暴露的scrollBy方法
    if (imageViewerRef.value.scrollBy) {
      imageViewerRef.value.scrollBy(speed);
      return;
    }

    // 备用方案：直接获取滚动容器
    const scrollContainer = imageViewerRef.value.getScrollContainer?.();
    if (scrollContainer) {
      scrollContainer.scrollTop += speed;
      return;
    }

    // 最后的备用方案：通过DOM查找
    const viewerEl = imageViewerRef.value.$el;
    if (viewerEl) {
      const scrollable =
        viewerEl.querySelector(".n-scrollbar-container") ||
        viewerEl.querySelector(".n-virtual-list") ||
        viewerEl.querySelector('[style*="overflow"]');
      if (scrollable) {
        scrollable.scrollTop += speed;
      }
    }
  }, 16); // 约 60fps
}

function stopAutoScroll() {
  if (autoScrollInterval) {
    clearInterval(autoScrollInterval);
    autoScrollInterval = null;
  }
}

// 监听自动滚动状态
watch(
  () => store.autoScroll,
  (enabled) => {
    if (enabled) {
      startAutoScroll();
    } else {
      stopAutoScroll();
    }
  }
);

// 快捷键处理
function handleKeydown(e: KeyboardEvent) {
  const key = e.code;
  const hotkeys = store.hotkeys;

  // 检查是否在输入框中，如果是则不触发快捷键
  if (isInInputElement()) return;

  // 检查是否是快捷键
  if (key === hotkeys.scrollDown) {
    e.preventDefault();
    if (imageViewerRef.value) {
      // 使用和自动滚动相同的方法
      if (imageViewerRef.value.scrollBy) {
        imageViewerRef.value.scrollBy(100);
        return;
      }
      // 备用方案：直接获取滚动容器
      const scrollContainer = imageViewerRef.value.getScrollContainer?.();
      if (scrollContainer) {
        scrollContainer.scrollTop += 100;
        return;
      }
    }
  } else if (key === hotkeys.scrollUp) {
    e.preventDefault();
    if (imageViewerRef.value) {
      // 使用和自动滚动相同的方法
      if (imageViewerRef.value.scrollBy) {
        imageViewerRef.value.scrollBy(-100);
        return;
      }
      // 备用方案：直接获取滚动容器
      const scrollContainer = imageViewerRef.value.getScrollContainer?.();
      if (scrollContainer) {
        scrollContainer.scrollTop -= 100;
        return;
      }
    }
  } else if (key === hotkeys.autoScroll) {
    e.preventDefault();
    store.toggleAutoScroll();
  } else if (key === hotkeys.speedUp) {
    e.preventDefault();
    store.setAutoScrollSpeed(Math.min(10, store.autoScrollSpeed + 1));
  } else if (key === hotkeys.speedDown) {
    e.preventDefault();
    store.setAutoScrollSpeed(Math.max(1, store.autoScrollSpeed - 1));
  } else if (key === hotkeys.nextChapter) {
    e.preventDefault();
    loadNextChapter();
  } else if (key === hotkeys.prevChapter) {
    e.preventDefault();
    loadPrevChapter();
  }
}

// 加载下一章
async function loadNextChapter() {
  if (!store.currentManga || store.loading.chapter) return;

  const chapters = store.currentManga.meta.chapterInfos;
  if (chapters.length <= 1) return;

  const currentIndex = chapters.findIndex(
    (ch) => ch.chapterTitle === store.currentChapter
  );

  if (currentIndex >= 0 && currentIndex < chapters.length - 1) {
    const nextChapter = chapters[currentIndex + 1];
    await loadChapter(store.currentManga, nextChapter.chapterTitle);
  } else {
    message.info("已经是最后一章了");
  }
}

// 加载上一章
async function loadPrevChapter() {
  if (!store.currentManga || store.loading.chapter) return;

  const chapters = store.currentManga.meta.chapterInfos;
  if (chapters.length <= 1) return;

  const currentIndex = chapters.findIndex(
    (ch) => ch.chapterTitle === store.currentChapter
  );

  if (currentIndex > 0) {
    const prevChapter = chapters[currentIndex - 1];
    await loadChapter(store.currentManga, prevChapter.chapterTitle);
  } else {
    message.info("已经是第一章了");
  }
}

// 加载章节
async function loadChapter(manga: typeof store.currentManga, chapterTitle: string) {
  if (!manga || !chapterTitle) return;

  store.setCurrentChapter(chapterTitle);
  store.setLoading("chapter", true);

  try {
    // 确保传递的是纯数组
    const staticDirsArray = [...store.staticDirs].map((dir) => String(dir));
    const images = await window.comicReaderAPI.getChapterImages(
      staticDirsArray,
      String(manga.name),
      String(chapterTitle)
    );
    store.setCurrentImages(sortImagesByTimeIfNeeded(manga.name, images ?? []));
  } catch (error) {
    console.error("加载章节失败:", error);
    message.error("加载章节失败");
  } finally {
    store.setLoading("chapter", false);
  }
}

function sortImagesByTimeIfNeeded(
  mangaName: string | undefined,
  images: ImageItem[]
): ImageItem[] {
  if (mangaName !== BOOKMARKS_DIR_NAME) {
    return images;
  }
  return [...images].sort((a, b) => (b.mtimeMs ?? 0) - (a.mtimeMs ?? 0));
}

async function refreshCurrentSelection(latestMangas: MangaItem[]) {
  const selectedName = store.currentManga?.name;
  if (!selectedName) {
    return;
  }

  const updatedManga = latestMangas.find((item) => item.name === selectedName);
  if (!updatedManga) {
    store.setCurrentManga(null);
    store.setCurrentChapter("");
    store.setCurrentImages([]);
    return;
  }

  const previousChapter = store.currentChapter;
  store.setCurrentManga(updatedManga);

  if (!previousChapter) {
    return;
  }

  const hasSameChapter = updatedManga.meta.chapterInfos.some(
    (ch) => ch.chapterTitle === previousChapter
  );
  const fallbackChapter = updatedManga.meta.chapterInfos[0]?.chapterTitle;
  const targetChapter = hasSameChapter ? previousChapter : fallbackChapter;

  if (targetChapter) {
    await loadChapter(updatedManga, targetChapter);
    return;
  }

  store.setCurrentChapter("");
  store.setCurrentImages([]);
}

// Tab 键切换侧边栏
onKeyStroke("Tab", (e) => {
  // 检查是否在输入框中，如果是则不切换
  const target = e.target as HTMLElement;
  if (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  ) {
    return;
  }
  e.preventDefault();
  store.toggleSidebar();
});

// 初始化
onMounted(async () => {
  // 等待 DOM 挂载后设置 message
  await nextTick();
  // 挂载到 window 以便其他组件中使用
  window.$message = message;
  window.$loadMangaList = loadMangaList;

  // 注册快捷键
  window.addEventListener("keydown", handleKeydown);

  // 注册功能触发事件
  if (window.naimo) {
    window.naimo.onEnter(async (params: any) => {
      console.log("漫画阅读功能被触发", params);
      window.naimo.log.info("漫画阅读器已加载");
    });
  }

  // 如果自动滚动开启，启动它
  if (store.autoScroll) {
    startAutoScroll();
  }

  if (window.naimo) {
    window.naimo.log.info("漫画阅读器初始化完成");
  }

  setTimeout(async () => {
    // 如果有已配置的目录，自动加载
    if (store.staticDirs.length > 0) {
      await loadMangaList();
    }
  }, 100);
});

onUnmounted(() => {
  stopAutoScroll();
  window.removeEventListener("keydown", handleKeydown);
});
</script>
