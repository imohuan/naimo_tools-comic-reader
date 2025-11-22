<template>
  <div
    ref="viewerContainer"
    class="viewer flex-1 relative bg-[#050505] overflow-hidden outline-none focus:outline-none"
    @wheel="handleWheel"
    tabindex="-1"
  >
    <NVirtualList
      ref="virtualListRef"
      :items="virtualListItems"
      :item-size="estimatedItemHeight"
      item-resizable
      key-field="key"
      style="height: 100%"
      @scroll="handleScroll"
      @wheel="handleWheel"
    >
      <template #default="{ item }">
        <div
          class="w-full flex items-center justify-center outline-none focus:outline-none ring-0 focus:ring-0"
          :style="{
            transform: `rotate(${store.rotation}deg)`,
          }"
        >
          <img
            :ref="(el) => setImageRef(el, item)"
            :src="getImageSrcSync(item)"
            :alt="item.filename"
            class="w-auto h-auto object-contain bg-[#111] select-none outline-none focus:outline-none ring-0 focus:ring-0"
            :style="{
              width: `${store.zoom}%`,
              maxWidth: '100%',
              display: 'block',
            }"
            loading="lazy"
            @load="onImageLoad($event, item)"
            @error="onImageError"
          />
        </div>
      </template>
    </NVirtualList>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { NVirtualList } from "naive-ui";
import { useComicStore } from "../stores/comic";
import type { ImageItem } from "../stores/comic";

const store = useComicStore();
const viewerContainer = ref<HTMLElement | null>(null);
const virtualListRef = ref<any>(null);
const scrollContainerRef = ref<HTMLElement | null>(null);
const estimatedItemHeight = ref(800);
const scrollTop = ref(0);
const isLoadingNextChapter = ref(false);
let loadNextChapterTimer: number | null = null;

// 存储每个item的实际高度
const itemHeights = ref<Map<string, number>>(new Map());
const imageRefs = new Map<string, HTMLImageElement>();

// 图片缓存：存储已加载的图片 base64 数据
const imageCache = new Map<string, string>();
// 图片 src 映射：存储每个图片的 src URL
const imageSrcMap = ref<Map<string, string>>(new Map());

// 同步获取图片 src（从缓存或触发异步加载）
function getImageSrcSync(item: ImageItem): string {
  const cacheKey = item.path || item.url;

  // 如果缓存中有，直接返回
  if (imageSrcMap.value.has(cacheKey)) {
    return imageSrcMap.value.get(cacheKey)!;
  }

  // 如果 URL 已经是 data URL，直接使用
  if (item.url.startsWith("data:")) {
    imageSrcMap.value.set(cacheKey, item.url);
    return item.url;
  }

  // 触发异步加载
  loadImageAsync(item);

  // 返回占位符或原始 URL
  return item.url;
}

// 异步加载图片
async function loadImageAsync(item: ImageItem) {
  const cacheKey = item.path || item.url;

  // 如果已经在加载中或已缓存，跳过
  if (imageSrcMap.value.has(cacheKey)) {
    return;
  }

  // 从 file:// URL 中提取路径，或直接使用 path 字段
  let filePath = item.path;
  if (!filePath && item.url.startsWith("file://")) {
    // 处理 file:// URL，转换为本地路径
    filePath = decodeURIComponent(item.url.replace(/^file:\/\/\//, ""));
  }

  if (!filePath) {
    // 如果没有路径，使用原始 URL
    imageSrcMap.value.set(cacheKey, item.url);
    return;
  }

  try {
    // 使用 getLocalImage API 获取 base64 数据
    if (window.naimo?.system?.getLocalImage) {
      const base64 = await window.naimo.system.getLocalImage(filePath);
      const dataUrl = `data:image/${getImageType(filePath)};base64,${base64}`;
      imageSrcMap.value.set(cacheKey, dataUrl);
      imageCache.set(cacheKey, dataUrl);
    } else {
      // API 不可用，使用原始 URL
      imageSrcMap.value.set(cacheKey, item.url);
    }
  } catch (error) {
    console.error(`加载图片失败: ${filePath}`, error);
    // 出错时使用原始 URL
    imageSrcMap.value.set(cacheKey, item.url);
  }
}

// 根据文件扩展名获取图片类型
function getImageType(filePath: string): string {
  const ext = filePath.toLowerCase().split(".").pop() || "jpg";
  const typeMap: Record<string, string> = {
    jpg: "jpeg",
    jpeg: "jpeg",
    png: "png",
    gif: "gif",
    webp: "webp",
    bmp: "bmp",
  };
  return typeMap[ext] || "jpeg";
}

// 内部获取滚动容器的方法
function getScrollContainer(): HTMLElement | null {
  if (virtualListRef.value?.$el) {
    return (
      virtualListRef.value.$el.querySelector(".n-scrollbar-container") ||
      virtualListRef.value.$el.querySelector(".n-virtual-list") ||
      virtualListRef.value.$el.querySelector('[style*="overflow"]') ||
      virtualListRef.value.$el.querySelector("[data-virtual-list-scroll]")
    );
  }
  return null;
}

// 暴露滚动容器引用供父组件使用
defineExpose({
  scrollContainerRef,
  virtualListRef,
  getScrollContainer,
  // 提供滚动方法
  scrollBy: (delta: number) => {
    const scrollContainer = getScrollContainer();
    if (scrollContainer) {
      scrollContainer.scrollTop += delta;
    } else if (virtualListRef.value?.scrollTo) {
      const currentScroll = scrollTop.value;
      virtualListRef.value.scrollTo({ top: currentScroll + delta });
    }
  },
});

// 将图片列表转换为虚拟列表需要的格式
const virtualListItems = computed(() => {
  return store.currentImages.map((img, index) => ({
    key: `${img.url}-${index}`,
    ...img,
    index,
  }));
});

// 设置图片引用
function setImageRef(el: any, item: any) {
  if (el && item) {
    imageRefs.set(item.key, el);
    // 如果图片已经加载完成，立即更新高度
    if (el.complete && el.naturalHeight > 0) {
      nextTick(() => updateItemHeight(item, el));
    }
  } else if (!el && item) {
    imageRefs.delete(item.key);
  }
}

// 更新item高度
function updateItemHeight(item: any, img?: HTMLImageElement) {
  const image = img || imageRefs.get(item.key);
  if (!image || !virtualListRef.value || !viewerContainer.value) return;

  if (image.complete && image.naturalHeight > 0 && image.naturalWidth > 0) {
    // 根据缩放比例和图片实际尺寸计算高度
    const viewportWidth = viewerContainer.value.clientWidth || 1920;
    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;
    const zoomRatio = store.zoom / 100;

    // 计算缩放后的宽度（不能超过视口宽度）
    const maxScaledWidth = viewportWidth * zoomRatio;
    const scaledWidth = Math.min(maxScaledWidth, naturalWidth * zoomRatio);

    // 计算缩放后的高度，保持宽高比
    const scaledHeight = (naturalHeight * scaledWidth) / naturalWidth;

    // 设置最小高度，确保有足够的显示空间
    const finalHeight = Math.max(scaledHeight + 8, 200); // 加上一点边距

    // 如果高度发生变化，更新虚拟列表
    const oldHeight = itemHeights.value.get(item.key);
    if (oldHeight !== finalHeight) {
      itemHeights.value.set(item.key, finalHeight);

      // 如果虚拟列表支持动态更新item大小，更新它
      if (virtualListRef.value?.updateItemSize) {
        virtualListRef.value.updateItemSize(item.key, finalHeight);
      }
    }
  }
}

function onImageLoad(event: Event, item?: any) {
  if (item && event.target) {
    updateItemHeight(item, event.target as HTMLImageElement);
  }
  updateCurrentPage();
}

function onImageError(e: Event) {
  (e.target as HTMLImageElement).style.display = "none";
}

function updateCurrentPage() {
  if (!virtualListRef.value || !viewerContainer.value) return;

  // 计算当前可见区域中心对应的图片索引
  const viewportHeight = viewerContainer.value.clientHeight;
  const centerScrollTop = scrollTop.value + viewportHeight / 2;

  // 估算当前页码（基于滚动位置和估算高度）
  const estimatedPage =
    Math.floor(centerScrollTop / estimatedItemHeight.value) + 1;
  const clampedPage = Math.max(
    1,
    Math.min(estimatedPage, store.currentImages.length)
  );

  if (clampedPage !== store.currentPage) {
    store.setCurrentPage(clampedPage);
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
  if (
    !store.currentManga ||
    store.loading.chapter ||
    isLoadingNextChapter.value
  ) {
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

// 监听当前章节变化，重置滚动位置（切换章节时）
watch(
  () => store.currentChapter,
  () => {
    if (virtualListRef.value) {
      nextTick(() => {
        virtualListRef.value?.scrollTo({ position: "top" });
        scrollTop.value = 0;
      });
    }
  }
);

// 监听缩放变化，重新计算item高度
watch(
  () => store.zoom,
  () => {
    // 重新计算所有已加载图片的高度
    nextTick(() => {
      virtualListItems.value.forEach((item) => {
        const img = imageRefs.get(item.key);
        if (img && img.complete) {
          updateItemHeight(item, img);
        }
      });
    });
  }
);

// 监听图片列表变化，预加载可见区域的图片
watch(
  () => store.currentImages,
  (newImages) => {
    // 清理旧的高度缓存
    itemHeights.value.clear();

    // 预加载前几张图片
    if (newImages.length > 0) {
      const preloadCount = Math.min(5, newImages.length);
      for (let i = 0; i < preloadCount; i++) {
        loadImageAsync(newImages[i]);
      }
    }
  },
  { immediate: true }
);

onMounted(() => {
  if (virtualListRef.value) {
    virtualListRef.value.scrollTo({ position: "top" });
  }
});
</script>

<style>
.viewer .n-scrollbar-rail__scrollbar {
  transform: translateX(-15px) !important;
  width: 18px !important;
  border-radius: 0px !important;
}

.viewer,
.viewer * {
  outline: none !important;
}

.viewer:focus,
.viewer:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}
</style>
