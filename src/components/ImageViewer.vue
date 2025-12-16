<template>
  <div
    ref="viewerContainer"
    class="viewer flex-1 relative bg-[#050505] overflow-hidden outline-none focus:outline-none"
    tabindex="-1"
  >
    <n-scrollbar
      ref="scrollbarRef"
      id="image-scroll-container"
      class="menu viewer h-full w-full"
      style="height: 100%"
      @scroll="handleScroll"
      @wheel="handleWheel"
    >
      <div class="w-full flex flex-col items-center gap-0 py-0">
        <div
          v-for="item in imageItems"
          :key="item.key"
          class="w-full flex items-center justify-center outline-none focus:outline-none ring-0 focus:ring-0 relative"
          :style="getWrapperStyle()"
        >
          <div class="absolute top-3 left-3 z-10 flex">
            <FavoriteToggle
              :favorited="isItemFavorited(item.key)"
              :loading="isFavoriteBusy(item.key)"
              @add="handleFavoriteAdd(item)"
              @remove="handleFavoriteRemoval(item)"
            />
          </div>
          <LazyFileImage
            :item="item"
            :file-path="item.path"
            :img-style="{ width: `${store.zoom}%` }"
            img-class="block mx-auto max-w-full w-auto h-auto object-contain bg-[#111] select-none outline-none focus:outline-none ring-0 focus:ring-0"
            :get-scroll-container="getScrollContainer"
            @loaded="(e: Event) => onImageLoad(e, item)"
            @error="onImageError"
          />
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick, reactive } from "vue";
import { useMessage, NScrollbar } from "naive-ui";
import FavoriteToggle from "@/components/FavoriteToggle.vue";
import LazyFileImage from "./LazyFileImage.vue";
import { useComicStore } from "../stores/comic";
import type { ImageItem } from "../stores/comic";
import { BOOKMARKS_DIR_NAME, buildFavoriteFilename } from "@/utils/favorite-utils";

const store = useComicStore();
const message = useMessage();
const viewerContainer = ref<HTMLElement | null>(null);
const scrollbarRef = ref<any>(null);
const scrollContainerRef = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const isLoadingNextChapter = ref(false);
const skipScrollResetOnce = ref(false);
let loadNextChapterTimer: number | null = null;
const favoriteMap = reactive(new Map<string, string>());
const favoriteLoading = reactive(new Set<string>());
const isFavoritesView = computed(() => store.currentManga?.name === BOOKMARKS_DIR_NAME);

const imageRefs = new Map<string, HTMLImageElement>();
// 图片列表
type ExtendedImageItem = ImageItem & { key: string; index: number };
const imageItems = computed<ExtendedImageItem[]>(() => {
  return store.currentImages.map((img, index) => ({
    key: `${img.url}-${index}`,
    ...img,
    index,
  }));
});

// 内部获取滚动容器的方法
function getScrollContainer(): HTMLElement | null {
  if (scrollbarRef.value?.containerRef) {
    return scrollbarRef.value.containerRef as HTMLElement;
  }
  if (scrollContainerRef.value) {
    return scrollContainerRef.value;
  }
  const fallback = document.getElementById("image-scroll-container");
  if (fallback) {
    const container = fallback.querySelector(".n-scrollbar-container") || fallback;
    scrollContainerRef.value = container as HTMLElement;
    return container as HTMLElement;
  }
  return null;
}

// 暴露滚动容器引用供父组件使用
defineExpose({
  scrollContainerRef,
  getScrollContainer,
  // 提供滚动方法
  scrollBy: (delta: number) => {
    const scrollContainer = getScrollContainer();
    if (scrollContainer) {
      scrollContainer.scrollTop += delta;
    } else if (scrollbarRef.value?.scrollTo) {
      const currentScroll = scrollTop.value;
      scrollbarRef.value.scrollTo({ top: currentScroll + delta });
    }
  },
});

// 设置图片引用
function setImageRef(el: any, item: any) {
  if (el && item) {
    imageRefs.set(item.key, el);
  } else if (!el && item) {
    imageRefs.delete(item.key);
  }
}

function getWrapperStyle() {
  const style: Record<string, string> = {
    transform: `rotate(${store.rotation}deg)`,
    width: "100%",
  };
  return style;
}

function isItemFavorited(key: string): boolean {
  return favoriteMap.has(key);
}

function isFavoriteBusy(key: string): boolean {
  return favoriteLoading.has(key);
}

function getConfiguredStaticDirs(): string[] {
  return (store.staticDirs || [])
    .map((dir) => String(dir || "").trim())
    .filter((dir) => dir);
}

async function handleFavoriteAdd(item: any) {
  const key = item.key;
  const dirs = getConfiguredStaticDirs();
  if (dirs.length === 0) {
    message.warning("请先在设置中配置本地目录");
    return;
  }

  if (favoriteLoading.has(key)) {
    return;
  }

  const favoriteFilename = buildFavoriteFilename({
    comicTitle: store.currentManga?.name || "本地漫画",
    chapterTitle: store.currentChapter || "章节",
    originalName: item.filename,
    index: item.index + 1,
  });

  favoriteLoading.add(key);

  try {
    if (!item.path) {
      throw new Error("图片路径不可用");
    }
    await window.comicReaderAPI.saveImageToFavorites({
      staticDirs: dirs,
      filename: favoriteFilename,
      sourcePath: item.path,
    });
    favoriteMap.set(key, favoriteFilename);
    message.success("已添加收藏");
  } catch (error: any) {
    console.error("收藏图片失败:", error);
    message.error(error?.message || "收藏失败");
  } finally {
    favoriteLoading.delete(key);
  }
}

async function handleFavoriteRemoval(item: any) {
  const key = item.key;
  const dirs = getConfiguredStaticDirs();
  if (dirs.length === 0) {
    message.warning("请先在设置中配置本地目录");
    return;
  }

  if (favoriteLoading.has(key)) {
    return;
  }

  const filename =
    favoriteMap.get(key) ||
    buildFavoriteFilename({
      comicTitle: store.currentManga?.name || "本地漫画",
      chapterTitle: store.currentChapter || "章节",
      originalName: item.filename,
      index: item.index + 1,
    });

  favoriteLoading.add(key);

  try {
    await window.comicReaderAPI.removeFavoriteImage({
      staticDirs: dirs,
      filename,
    });
    favoriteMap.delete(key);
    message.success("已取消收藏");
  } catch (error: any) {
    console.error("取消收藏失败:", error);
    message.error(error?.message || "操作失败");
  } finally {
    favoriteLoading.delete(key);
  }
}

function onImageLoad(event: Event, item?: any) {
  if (item && event?.target) {
    const imgEl = event.target as HTMLImageElement;
    setImageRef(imgEl, item);
  }
  updateCurrentPage();
}

function onImageError(e: Event) {
  (e.target as HTMLImageElement).style.display = "none";
}

function updateCurrentPage() {
  const container = getScrollContainer();
  if (!container || !viewerContainer.value) return;

  const centerScrollTop = container.scrollTop + container.clientHeight / 2;
  let closestIndex = 0;
  let minDistance = Number.POSITIVE_INFINITY;

  imageItems.value.forEach((item, index) => {
    const img = imageRefs.get(item.key);
    if (!img) return;
    const offsetTop = img.offsetTop;
    const itemCenter = offsetTop + img.clientHeight / 2;
    const distance = Math.abs(itemCenter - centerScrollTop);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });

  const targetPage = Math.min(Math.max(1, closestIndex + 1), store.currentImages.length);

  if (targetPage !== store.currentPage) {
    store.setCurrentPage(targetPage);
  }
}

function handleScroll(e: Event) {
  const target = e.target as HTMLElement;
  scrollTop.value = target.scrollTop;
  updateCurrentPage();

  // 检查是否接近底部，如果是则触发加载下一章
  const scrollHeight = target.scrollHeight;
  const clientHeight = target.clientHeight;
  const distanceFromBottom = scrollHeight - (target.scrollTop + clientHeight);

  // 距离底部 500px 时加载下一章（防抖）
  if (distanceFromBottom < 500 && !isLoadingNextChapter.value) {
    if (loadNextChapterTimer) {
      clearTimeout(loadNextChapterTimer);
    }
    loadNextChapterTimer = window.setTimeout(() => {
      loadNextChapterIfAvailable();
    }, 300);
  }
}

// Ctrl + 滚轮缩放
function handleWheel(e: WheelEvent) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -5 : 5;
    const newZoom = Math.max(10, Math.min(100, store.zoom + delta));
    store.setZoom(newZoom);
  }
}

// 加载下一章（如果存在）
async function loadNextChapterIfAvailable() {
  if (!store.currentManga || store.loading.chapter || isLoadingNextChapter.value) {
    return;
  }

  const chapters = store.currentManga.meta.chapterInfos;
  if (chapters.length <= 1) return;

  const currentIndex = chapters.findIndex(
    (ch) => ch.chapterTitle === store.currentChapter
  );

  if (currentIndex >= 0 && currentIndex < chapters.length - 1) {
    isLoadingNextChapter.value = true;
    const nextChapter = chapters[currentIndex + 1];

    try {
      // 确保传递的是纯数组
      const staticDirsArray = [...store.staticDirs].map((dir) => String(dir));
      const images = await window.comicReaderAPI.getChapterImages(
        staticDirsArray,
        String(store.currentManga.name),
        String(nextChapter.chapterTitle)
      );

      // 追加图片而不是替换（连续阅读模式）
      const currentImages = [...store.currentImages];
      currentImages.push(...images);
      store.setCurrentImages(currentImages);

      // 更新当前章节
      skipScrollResetOnce.value = true; // 连续阅读时保留当前位置
      store.setCurrentChapter(nextChapter.chapterTitle);

      if (window.$message) {
        window.$message.success(`已加载下一章: ${nextChapter.chapterTitle}`);
      }
    } catch (error) {
      console.error("加载下一章失败:", error);
      if (window.$message) {
        window.$message.error("加载下一章失败");
      }
    } finally {
      isLoadingNextChapter.value = false;
    }
  }
}

// 重置滚动位置到顶部
function resetScrollPosition() {
  const container = getScrollContainer();
  nextTick(() => {
    if (scrollbarRef.value?.scrollTo) {
      scrollbarRef.value.scrollTo({ left: 0, top: 0 });
    } else if (container) {
      container.scrollTo({ left: 0, top: 0 });
    }
    scrollTop.value = 0;
  });
}

// 监听当前漫画变化，重置滚动位置（切换漫画时）
watch(
  () => store.currentManga?.name,
  () => {
    resetScrollPosition();
  }
);

// 监听当前章节变化，重置滚动位置（切换章节时）
watch(
  () => store.currentChapter,
  () => {
    if (skipScrollResetOnce.value) {
      skipScrollResetOnce.value = false;
      return;
    }
    resetScrollPosition();
  }
);

// 监听缩放变化，重新计算item高度
watch(
  () => store.zoom,
  () => {
    nextTick(() => {
      updateCurrentPage();
    });
  }
);

// 监听图片列表变化，重置状态
watch(
  imageItems,
  (items) => {
    imageRefs.clear();
    favoriteMap.clear();
    favoriteLoading.clear();

    if (isFavoritesView.value && items.length > 0) {
      items.forEach((item) => {
        favoriteMap.set(item.key, item.filename);
      });
    }
  },
  { immediate: true }
);

onMounted(() => {
  nextTick(() => {
    scrollContainerRef.value = getScrollContainer();
    if (scrollbarRef.value?.scrollTo) {
      scrollbarRef.value.scrollTo({ left: 0, top: 0 });
    }
  });
});
</script>
