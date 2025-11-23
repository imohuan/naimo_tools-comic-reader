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
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
    <div class="flex flex-1 overflow-hidden relative">
      <!-- 左侧侧边栏 - 固定宽度 300px -->
      <aside
        class="bg-[#18181c] border-r border-gray-800 flex flex-col shrink-0 z-10"
        :style="{
          width: store.sidebarCollapsed ? '0px' : '300px',
          opacity: store.sidebarCollapsed ? 0 : 1,
          overflow: store.sidebarCollapsed ? 'hidden' : 'visible',
          minWidth: store.sidebarCollapsed ? '0' : '300px',
          maxWidth: store.sidebarCollapsed ? '0' : '300px',
        }"
      >
        <div
          class="p-3 flex justify-between items-center border-b border-gray-800/50 shrink-0"
        >
          <span class="text-xs font-bold text-gray-500 tracking-wider"
            >书架 LIBRARY</span
          >
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

      <!-- 中间阅读区域 -->
      <main class="flex-1 relative bg-[#050505] flex flex-col overflow-hidden">
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
import MangaList from "@/components/MangaList.vue";
import ImageViewer from "@/components/ImageViewer.vue";
import SettingsPanel from "@/components/SettingsPanel.vue";

// 在子组件中使用 useMessage，此时 MessageProvider 已经挂载
const message = useMessage();
const router = useRouter();
const store = useComicStore();
const imageViewerRef = ref<InstanceType<typeof ImageViewer> | null>(null);

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
    const mangas = await window.comicReaderAPI.getMangaList(staticDirsArray);
    store.setMangas(mangas);
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

// 自动滚动功能
function startAutoScroll() {
  if (autoScrollInterval) return;

  autoScrollInterval = window.setInterval(() => {
    if (!imageViewerRef.value) return;

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
async function loadChapter(
  manga: typeof store.currentManga,
  chapterTitle: string
) {
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
    store.setCurrentImages(images);
  } catch (error) {
    console.error("加载章节失败:", error);
    message.error("加载章节失败");
  } finally {
    store.setLoading("chapter", false);
  }
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

  // 如果有已配置的目录，自动加载
  if (store.staticDirs.length > 0) {
    await loadMangaList();
  }

  // 如果自动滚动开启，启动它
  if (store.autoScroll) {
    startAutoScroll();
  }

  if (window.naimo) {
    window.naimo.log.info("漫画阅读器初始化完成");
  }
});

onUnmounted(() => {
  stopAutoScroll();
  window.removeEventListener("keydown", handleKeydown);
});
</script>
