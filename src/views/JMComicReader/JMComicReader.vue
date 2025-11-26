<template>
  <ImageDecodeHandler />

  <div
    class="w-full h-screen overflow-hidden select-none bg-[#101014] text-gray-200 flex flex-col"
  >
    <n-config-provider
      :theme="darkTheme"
      class="h-full overflow-hidden flex flex-col"
    >
      <n-message-provider placement="bottom-right">
        <n-notification-provider placement="bottom-right">
          <!-- 顶部导航栏 -->
          <header
            class="min-h-14 border-b border-gray-800 bg-[#18181c] flex items-center px-4 justify-between shrink-0 z-20"
          >
            <div class="flex items-center gap-4 min-w-0 flex-1">
              <n-button
                text
                @click="sidebarCollapsed = !sidebarCollapsed"
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
                  :title="store.currentComic?.title"
                >
                  {{ store.currentComic?.title || "未选择漫画" }}
                </span>
                <div
                  v-if="store.currentChapter || store.readingImages.length > 0"
                  class="bg-black/80 backdrop-blur px-4 py-1.5 rounded-full border border-gray-800 flex items-center gap-4 shadow-xl shrink-0"
                >
                  <span class="text-xs text-gray-300 font-bold">{{
                    store.currentChapter?.title || "--"
                  }}</span>
                  <div class="w-px h-3 bg-gray-600"></div>
                  <span class="text-xs font-mono text-green-400">{{
                    store.readingImages.length > 0
                      ? `${store.currentImageIndex + 1}/${
                          store.readingImages.length
                        }`
                      : "--"
                  }}</span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-4 shrink-0">
              <template v-if="rightTab === 'images'">
                <!-- 自动滚动按钮 -->
                <n-button
                  :type="store.autoScroll ? 'primary' : 'default'"
                  size="small"
                  @click="toggleAutoScroll"
                  :disabled="rightTab !== 'images' || !store.currentChapter?.id"
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

                <n-button size="small" @click="handleRefresh">刷新</n-button>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-400">缩放</span>
                  <n-slider
                    v-model:value="imageScale"
                    :min="10"
                    :max="100"
                    :step="5"
                    :tooltip="false"
                    style="width: 100px"
                    size="small"
                  />
                  <span class="text-xs font-mono w-10 text-right text-gray-400"
                    >{{ imageScale }}%</span
                  >
                </div>
              </template>

              <!-- 详情/图片预览切换按钮组 -->
              <div
                class="flex items-center bg-gray-800/50 rounded-lg p-0.5 gap-0.5 h-7"
              >
                <button
                  @click="rightTab = 'detail'"
                  :class="[
                    'px-3 h-full rounded-md text-xs font-medium transition-all duration-200 flex items-center justify-center',
                    rightTab === 'detail'
                      ? 'bg-white/15 text-gray-200 shadow-sm'
                      : 'text-gray-400 hover:text-gray-300',
                  ]"
                >
                  详情
                </button>
                <button
                  @click="rightTab = 'images'"
                  :class="[
                    'px-3 h-full rounded-md text-xs font-medium transition-all duration-200 flex items-center justify-center',
                    rightTab === 'images'
                      ? 'bg-white/15 text-gray-200 shadow-sm'
                      : 'text-gray-400 hover:text-gray-300',
                  ]"
                >
                  图片预览
                </button>
              </div>

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

              <n-button
                size="small"
                :disabled="!store.currentComic?.id"
                @click="showDownloadManager = true"
              >
                下载
              </n-button>

              <n-button size="small" @click="goToHome">主页</n-button>
            </div>
          </header>

          <!-- 主体内容区 -->
          <n-split
            direction="horizontal"
            v-model:size="splitSize"
            :min="sidebarCollapsed ? 0 : 0.15"
            :max="sidebarCollapsed ? 0 : 0.5"
            :resizable="!sidebarCollapsed"
            class="flex-1 h-full overflow-hidden"
          >
            <template #1>
              <!-- 左侧侧边栏 -->
              <aside
                class="bg-[#18181c] border-r border-gray-800 flex flex-col h-full"
                v-show="!sidebarCollapsed"
              >
                <div class="h-full flex flex-col min-h-0">
                  <div class="p-3 flex-shrink-0 border-b border-gray-800/50">
                    <SearchBar @show-settings="store.toggleSettings()" />
                  </div>
                  <div class="flex-1 min-h-0 overflow-hidden">
                    <ComicList @select-comic="handleSelectComic" />
                  </div>
                  <div class="flex-shrink-0 border-t border-gray-800/50">
                    <PaginationBar />
                  </div>
                </div>
              </aside>
            </template>
            <template #2>
              <!-- 中间阅读区域 -->
              <main
                class="relative bg-[#050505] flex flex-col h-full overflow-hidden"
              >
                <!-- <div
                  v-if="store.detailLoading && store.readingImages.length === 0"
                  class="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/50 backdrop-blur-sm"
                >
                  <n-spin size="large" />
                  <span
                    class="mt-4 text-xs text-green-500 font-mono animate-pulse"
                    >正在读取数据流...</span
                  >
                </div> -->

                <!-- 未选择漫画 -->
                <div
                  v-if="!store.currentComic?.id"
                  class="flex-1 flex items-center justify-center text-gray-500"
                >
                  <n-empty description="请从左侧选择漫画" />
                </div>

                <!-- 详情视图 -->
                <div
                  v-else-if="rightTab === 'detail'"
                  class="flex-1 overflow-auto p-6"
                >
                  <ComicDetailPanel />
                </div>

                <!-- 图片预览视图 -->
                <div
                  v-else-if="rightTab === 'images'"
                  class="flex-1 relative overflow-hidden"
                >
                  <div
                    v-if="!store.currentChapter?.id"
                    class="absolute inset-0 flex items-center justify-center text-gray-500"
                  >
                    <n-empty description="请先选择一个章节" />
                  </div>
                  <div v-else class="w-full h-full">
                    <div
                      v-if="
                        store.detailLoading && store.readingImages.length === 0
                      "
                      class="absolute inset-0 flex items-center justify-center z-30 bg-black/50 backdrop-blur-sm"
                    >
                      <n-spin size="large">
                        <template #description>
                          <p class="mt-4">正在解析图片...</p>
                        </template>
                      </n-spin>
                    </div>
                    <div v-else class="w-full h-full viewer-container">
                      <JMImageViewer ref="imageViewerRef" />
                    </div>
                  </div>
                </div>
              </main>
            </template>
          </n-split>

          <!-- 下载管理弹窗 -->
          <JMDownloadPanel
            :show="showDownloadManager"
            :chapter-ids="downloadChapterIds"
            @update:show="(val: boolean) => (showDownloadManager = val)"
          />

          <!-- 设置面板 -->
          <JMSettingsPanel
            :show="store.showSettings"
            @update:show="(value) => (store.showSettings = value)"
          />
        </n-notification-provider>
      </n-message-provider>
    </n-config-provider>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { darkTheme, useMessage } from "naive-ui";
import { onKeyStroke } from "@vueuse/core";
import { useRouter } from "vue-router";
import { useJMComicStore } from "@/stores/jmcomic";
import { useSearch } from "@/hooks/useSearch";
import SearchBar from "./components/SearchBar.vue";
import ComicList from "./components/ComicList.vue";
import PaginationBar from "./components/PaginationBar.vue";
import JMSettingsPanel from "./components/JMSettingsPanel.vue";
import JMDownloadPanel from "./components/JMDownloadPanel.vue";
import JMImageViewer from "./components/JMImageViewer.vue";
import ImageDecodeHandler from "./components/ImageDecodeHandler.vue";
import ComicDetailPanel from "./components/ComicDetailPanel.vue";
import { eventBus } from "@/utils/event-bus";

const store = useJMComicStore();
const message = useMessage();
const router = useRouter();

const sidebarCollapsed = ref(false);
const rightTab = ref<"detail" | "images">("detail");
const imageViewerRef = ref<InstanceType<typeof JMImageViewer> | null>(null);
const splitSize = ref(0.2); // 默认左侧占 20%
const showDownloadManager = ref(false);
const downloadChapterIds = ref<string[]>([]);

// 监听 rightTab 变化并保存
watch(
  () => rightTab.value,
  (tab) => {
    store.setRightTab(tab);
  }
);

// 自动滚动定时器
let autoScrollInterval: number | null = null;

const imageScale = computed({
  get: () => store.imageScale,
  set: (value) => store.setImageScale(value),
});

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
  sidebarCollapsed.value = !sidebarCollapsed.value;
});

// 当选择章节时，自动切换到图片预览
watch(
  () => store.currentChapter,
  (chapter) => {
    if (chapter) {
      rightTab.value = "images";
    }
  }
);

// 监听章节选择事件，切换到图片预览
eventBus.on("chapter-selected", () => {
  rightTab.value = "images";
});

// 监听详情面板发出的下载事件，打开下载管理并传入章节列表
eventBus.on("jm-download" as any, (payload: { chapterIds: string[] }) => {
  downloadChapterIds.value = payload.chapterIds || [];
  if (downloadChapterIds.value.length > 0) {
    showDownloadManager.value = true;
  }
});

// 当侧边栏折叠/展开时，调整 split 大小
watch(
  () => sidebarCollapsed.value,
  (collapsed) => {
    if (collapsed) {
      splitSize.value = 0;
    } else {
      // 恢复默认大小或从 localStorage 读取
      const savedSize = localStorage.getItem("comic-reader-split-size");
      splitSize.value = savedSize ? parseFloat(savedSize) : 0.2;
    }
  }
);

// 保存 split 大小到 localStorage
watch(
  () => splitSize.value,
  (size) => {
    if (!sidebarCollapsed.value && size > 0) {
      localStorage.setItem("comic-reader-split-size", size.toString());
    }
  }
);

// 当切换视图时，如果离开图片预览，停止自动滚动
watch(
  () => rightTab.value,
  (tab) => {
    if (tab !== "images" && store.autoScroll) {
      stopAutoScroll();
      store.autoScroll = false;
    } else if (tab === "images" && store.autoScroll) {
      startAutoScroll();
    }
  }
);

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
  }, 16); // 约 60fps
}

function stopAutoScroll() {
  if (autoScrollInterval) {
    clearInterval(autoScrollInterval);
    autoScrollInterval = null;
  }
}

// 切换自动滚动
function toggleAutoScroll() {
  store.autoScroll = !store.autoScroll;
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

// 跳转到主页
function goToHome() {
  router.push("/local");
}

// 刷新功能
function handleRefresh() {
  if (store.currentComic?.id) {
    // 如果有当前漫画，重新加载漫画详情
    handleSelectComic(store.currentComic);
    message.info("已刷新当前漫画");
  } else {
    // 否则刷新搜索列表
    const { handleSearch } = useSearch();
    handleSearch(1, true);
    message.info("已刷新搜索列表");
  }
}

// 快捷键处理
function handleKeydown(e: KeyboardEvent) {
  const key = e.code;
  const hotkeys = store.hotkeys;

  // 检查是否在输入框中，如果是则不触发
  const activeElement = document.activeElement as HTMLElement;
  if (
    activeElement &&
    (activeElement.tagName === "INPUT" ||
      activeElement.tagName === "TEXTAREA" ||
      activeElement.isContentEditable)
  ) {
    return;
  }

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
    // 只在图片预览视图时才能切换自动滚动
    if (rightTab.value === "images" && store.currentChapter?.id) {
      e.preventDefault();
      e.stopPropagation();
      toggleAutoScroll();
    }
  } else if (key === hotkeys.speedUp) {
    e.preventDefault();
    store.autoScrollSpeed = Math.min(10, store.autoScrollSpeed + 1);
  } else if (key === hotkeys.speedDown) {
    e.preventDefault();
    store.autoScrollSpeed = Math.max(1, store.autoScrollSpeed - 1);
  }
}

const handleSelectComic = async (comic: any) => {
  store.setCurrentComic(comic);
  store.setChapterList([]);
  store.setCurrentChapter(null);
  store.setReadingImages([]);
  store.setCurrentImageIndex(0);
  rightTab.value = "detail";
  store.setDetailLoading(true);

  try {
    const comicId = comic.id;

    // 先检查缓存
    let detail: any = store.cacheUtils.get(comicId, "details");

    if (!detail) {
      if (!store.api) {
        throw new Error("API 未初始化");
      }
      detail = await store.api.getComic(comicId);
      if (detail) {
        store.cacheUtils.set(comicId, detail, "details");
      }
    }

    if (detail) {
      const albumId = detail.id || comic.id;
      const rawCover =
        detail.thumb || detail.cover || detail.thumb_url || comic.cover || "";
      store.setCurrentComic({
        ...comic,
        ...detail,
        title: detail.title || comic.title,
        description: detail.description || detail.intro || comic.description,
        tags: detail.tags || detail.tag_list || comic.tags || [],
        cover: processCoverUrl(rawCover, albumId),
      });

      // 提取章节列表
      if (
        detail.series &&
        Array.isArray(detail.series) &&
        detail.series.length > 0
      ) {
        store.setChapterList(
          detail.series
            .map((item: any) => {
              let title = item.name;
              if (!title || title.trim() === "") {
                const sortValue = item.sort || "";
                title = sortValue ? `第${sortValue}话` : "未知章节";
              }
              return {
                id: item.id || item.chapter_id,
                title: title,
                order: parseInt(item.sort || 0),
              };
            })
            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        );
      } else if (
        detail.photos &&
        Array.isArray(detail.photos) &&
        detail.photos.length > 0
      ) {
        store.setChapterList(
          detail.photos
            .map((photo: any, index: number) => ({
              id: photo.id || photo.photo_id || photo.chapter_id || index + 1,
              title: photo.title || photo.name || `第${index + 1}话`,
              order: photo.order || index + 1,
            }))
            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        );
      } else if (
        detail.chapters &&
        Array.isArray(detail.chapters) &&
        detail.chapters.length > 0
      ) {
        store.setChapterList(
          detail.chapters
            .map((chapter: any, index: number) => ({
              id: chapter.id || chapter.chapter_id || index + 1,
              title: chapter.title || chapter.name || `第${index + 1}话`,
              order: chapter.order || index + 1,
            }))
            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        );
      } else {
        const comicId = comic.id || detail?.id;
        store.setChapterList([
          {
            id: comicId,
            title: "第一章",
            order: 1,
          },
        ]);
      }
    }
  } catch (error: any) {
    console.error("获取漫画详情失败:", error);
  } finally {
    store.setDetailLoading(false);
  }
};

const processCoverUrl = (image: string, albumId: string): string => {
  const imageDomain = store.settings.imageDomain || "cdn-msp2.jmapiproxy2.cc";

  if (!image) {
    if (albumId) {
      return `https://${imageDomain}/media/albums/${albumId}_3x4.jpg`;
    }
    return "";
  }

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  if (image.startsWith("media/")) {
    return `https://${imageDomain}/${image}`;
  } else if (image.startsWith("albums/")) {
    return `https://${imageDomain}/media/${image}`;
  } else if (albumId) {
    return `https://${imageDomain}/media/albums/${albumId}_3x4.jpg`;
  } else {
    return `https://${imageDomain}/media/albums/${image}`;
  }
};

// 选择章节
const handleSelectChapter = async (chapter: any) => {
  store.setCurrentChapter(chapter);
  store.setReadingImages([]);
  store.setCurrentChapterImages([]);
  store.setCurrentImageIndex(0);
  rightTab.value = "images";
  store.setDetailLoading(true);

  try {
    const chapterId = chapter.id;

    // 先检查缓存
    let result: any = store.cacheUtils.get(chapterId, "chapters");

    if (!result) {
      if (!store.api) {
        throw new Error("API 未初始化");
      }
      result = await store.api.getChapterImages(chapterId);
      if (result && result.images) {
        store.cacheUtils.set(chapterId, result, "chapters");
      }
    }

    if (result && result.images && Array.isArray(result.images)) {
      store.setCurrentChapterImages(result.images);
      store.setReadingImages(
        result.images.map((img: any, idx: number) => ({
          url: img.url,
          index: idx,
        }))
      );
    } else {
      throw new Error("章节图片列表为空");
    }
  } catch (error: any) {
    console.error("获取章节图片失败:", error);
  } finally {
    store.setDetailLoading(false);
  }
};

// 暴露给子组件使用
defineExpose({
  handleSelectChapter,
});

onMounted(async () => {
  store.cacheUtils.clearExpired();
  // 从 localStorage 读取保存的 split 大小
  const savedSize = localStorage.getItem("comic-reader-split-size");
  if (savedSize && !sidebarCollapsed.value) {
    splitSize.value = parseFloat(savedSize);
  }
  // 恢复阅读状态
  const savedRightTab = await store.restoreReadingState();
  // 恢复 rightTab
  if (savedRightTab) {
    // 如果保存的是图片预览但没有章节，则显示详情
    if (savedRightTab === "images" && !store.currentChapter) {
      rightTab.value = "detail";
    } else {
      rightTab.value = savedRightTab;
    }
  } else if (store.currentChapter) {
    // 如果没有保存的 rightTab，但有章节，默认显示图片预览
    rightTab.value = "images";
  } else if (store.currentComic) {
    // 如果有漫画但没有章节，显示详情
    rightTab.value = "detail";
  }
  // 如果自动滚动开启，启动它
  if (store.autoScroll && rightTab.value === "images") {
    startAutoScroll();
  }
  // 注册快捷键
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  stopAutoScroll();
  window.removeEventListener("keydown", handleKeydown);
  eventBus.off("chapter-selected");
});
</script>

<style scoped>
/* 暗色主题下的 split 分隔条样式 */
:deep(.n-split-trigger) {
  background-color: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

:deep(.n-split-trigger:hover) {
  background-color: rgba(255, 255, 255, 0.1);
}

:deep(.n-split-trigger-bar) {
  background-color: rgba(255, 255, 255, 0.2);
}
</style>
