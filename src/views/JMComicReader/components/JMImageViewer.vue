<template>
  <div
    ref="viewerContainer"
    class="viewer h-full flex-1 relative bg-[#050505] overflow-hidden outline-none focus:outline-none"
    tabindex="-1"
  >
    <n-scrollbar
      ref="scrollbarRef"
      id="jm-image-scroll-container"
      class="menu viewer h-full w-full"
      style="height: 100%"
      @scroll="handleScroll"
      @wheel="handleWheel"
    >
      <div class="w-full flex flex-col items-center gap-0 py-0">
        <div
          v-for="item in virtualListItems"
          :key="item.key"
          class="w-full flex items-center justify-center outline-none focus:outline-none ring-0 focus:ring-0 relative"
          :ref="(el) => setItemRef(el as HTMLElement | null, item)"
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
            :img-style="{ width: `${store.imageScale}%` }"
            img-class="block mx-auto max-w-full w-auto h-auto object-contain bg-[#111] select-none outline-none focus:outline-none ring-0 focus:ring-0"
            :get-scroll-container="getScrollContainer"
            @loaded="(e: Event) => onImageLoad(e, item)"
            @error="(e: Event) => onImageError(e, item)"
          />
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, reactive } from "vue";
import { NScrollbar, useMessage } from "naive-ui";
import FavoriteToggle from "@/components/FavoriteToggle.vue";
import LazyFileImage from "@/components/LazyFileImage.vue";
import { useJMComicStore } from "@/stores/jmcomic";
import { useComicStore } from "@/stores/comic";
import { eventBus } from "@/utils/event-bus";
import { buildFavoriteFilename } from "@/utils/favorite-utils";

const store = useJMComicStore();
const comicStore = useComicStore();
const message = useMessage();
const viewerContainer = ref<HTMLElement | null>(null);
const scrollbarRef = ref<any>(null);
const scrollContainerRef = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const imageRefs = new Map<string, HTMLImageElement>();
// 每个图片外层容器的引用，用于计算当前页
const itemRefs = new Map<string, HTMLElement>();
const favoriteMap = reactive(new Map<string, string>());
const favoriteLoading = reactive(new Set<string>());

// 将图片列表转换为渲染所需的格式（基础完整列表）
const imageItems = computed(() => {
  return store.readingImages.map((img, index) => ({
    key: `${img.url}-${index}`,
    url: img.url,
    index: img.index,
    filename: `image-${img.index + 1}`,
    path: img.path || "",
  }));
});

// 伪虚拟化配置：缓冲区（前置）
const VIRTUAL_BUFFER_BEFORE = 40;

// 伪虚拟化最大渲染数量（来自设置，可配置）
const maxRenderCount = computed(() => {
  const raw = (store as any).virtualMaxRenderCount ?? 100;
  const value = typeof raw === "number" ? raw : Number(raw) || 100;
  return Math.max(20, Math.min(500, value));
});

// 当前窗口起始下标（基于当前图片索引来滑动窗口）
const virtualStartIndex = computed(() => {
  const all = imageItems.value;
  const total = all.length;
  const limit = maxRenderCount.value;
  if (total <= limit) return 0;

  const currentIndex = Math.min(
    Math.max(0, store.currentImageIndex),
    total - 1
  );

  let start = Math.max(0, currentIndex - VIRTUAL_BUFFER_BEFORE);
  let end = Math.min(total, start + limit);

  // 确保窗口大小尽量保持 limit
  if (end - start < limit) {
    start = Math.max(0, end - limit);
  }

  return start;
});

// 实际用于渲染的伪虚拟化列表
const virtualListItems = computed(() => {
  const all = imageItems.value;
  const limit = maxRenderCount.value;
  if (all.length <= limit) return all;
  const start = virtualStartIndex.value;
  const end = Math.min(all.length, start + limit);
  return all.slice(start, end);
});

// 设置图片引用（用于截图/收藏）
function setImageRef(el: any, item: any) {
  if (el && item) {
    imageRefs.set(item.key, el);
  } else if (!el && item) {
    imageRefs.delete(item.key);
  }
}

// 设置图片容器引用（用于当前页计算和缩放锚点）
function setItemRef(el: HTMLElement | null, item: any) {
  if (el && item) {
    itemRefs.set(item.key, el);
  } else if (!el && item) {
    itemRefs.delete(item.key);
  }
}

function isItemFavorited(key: string): boolean {
  return favoriteMap.has(key);
}

function isFavoriteBusy(key: string): boolean {
  return favoriteLoading.has(key);
}

function getConfiguredStaticDirs(): string[] {
  return (comicStore.staticDirs || [])
    .map((dir) => String(dir || "").trim())
    .filter((dir) => dir);
}

async function captureImageArrayBuffer(item: any): Promise<ArrayBuffer> {
  const image = imageRefs.get(item.key);

  // 尝试使用 canvas 方式（更快，因为图片已加载）
  if (image && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error("无法导出图片"));
              return;
            }
            resolve(blob);
          }, "image/png");
        });

        return new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve(reader.result as ArrayBuffer);
          };
          reader.onerror = () => {
            reject(reader.error);
          };
          reader.readAsArrayBuffer(blob);
        });
      }
    } catch (error: any) {
      // 如果是跨域错误，回退到 fetch 方式
      if (
        error?.name === "SecurityError" ||
        error?.message?.includes("Tainted") ||
        error?.message?.includes("tainted")
      ) {
        console.warn("Canvas 跨域限制，使用 fetch 方式获取图片:", error);
        // 继续执行 fetch 方式
      } else {
        // 其他错误也回退到 fetch
        console.warn("Canvas 导出失败，使用 fetch 方式获取图片:", error);
      }
    }
  }

  // 回退方案：直接通过 fetch 获取图片数据
  const response = await fetch(image?.src || item.url);
  if (!response.ok) {
    throw new Error("无法获取图片数据");
  }
  return response.arrayBuffer();
}

async function handleFavoriteAdd(item: any) {
  const key = item.key;
  const dirs = getConfiguredStaticDirs();
  if (dirs.length === 0) {
    message.warning("请先在设置中配置本地阅读目录");
    return;
  }

  if (favoriteLoading.has(key)) {
    return;
  }

  const chapterImage = store.currentChapterImages[item.index];
  const favoriteFilename = buildFavoriteFilename({
    comicTitle: store.currentComic?.title || "收藏漫画",
    chapterTitle: store.currentChapter?.title || "章节",
    originalName: chapterImage?.filename || `image-${item.index + 1}`,
    index: item.index + 1,
  });

  favoriteLoading.add(key);

  try {
    const buffer = await captureImageArrayBuffer(item);
    await window.comicReaderAPI.saveImageToFavorites({
      staticDirs: dirs,
      filename: favoriteFilename,
      data: buffer,
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
    message.warning("请先在设置中配置本地阅读目录");
    return;
  }

  if (favoriteLoading.has(key)) {
    return;
  }

  const filename = favoriteMap.get(key);
  if (!filename) {
    message.warning("未找到收藏记录");
    return;
  }

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

function onImageLoad(event: Event, item: any) {
  if (item && event.target) {
    const imgEl = event.target as HTMLImageElement;
    setImageRef(imgEl, item);
    updateCurrentPage();

    // 发送图片加载事件
    eventBus.emit("image-decode", {
      type: "image-loaded",
      imageUrl: item.url,
      imageIndex: item.index,
    });
  }
}

function onImageError(_e: Event, item: any) {
  eventBus.emit("image-decode", {
    type: "image-error",
    imageUrl: item.url,
    imageIndex: item.index,
    error: new Error("图片加载失败"),
  });
}

function updateCurrentPage() {
  const container = getScrollContainer();
  if (!container || !viewerContainer.value) return;

  const centerScrollTop = container.scrollTop + container.clientHeight / 2;
  let closestIndexInWindow = 0;
  let minDistance = Number.POSITIVE_INFINITY;

  virtualListItems.value.forEach((item, index) => {
    const wrapper = itemRefs.get(item.key);
    if (!wrapper) return;
    const offsetTop = wrapper.offsetTop;
    const itemCenter = offsetTop + wrapper.clientHeight / 2;
    const distance = Math.abs(itemCenter - centerScrollTop);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndexInWindow = index;
    }
  });

  const globalIndex = virtualStartIndex.value + closestIndexInWindow;
  const targetPage = Math.min(
    Math.max(1, globalIndex + 1),
    store.readingImages.length
  );

  if (targetPage !== store.currentImageIndex + 1) {
    store.setCurrentImageIndex(targetPage - 1);
    // 当前页面变化时预加载
    preloadVisibleImages();
  }
}

function handleScroll(e: Event) {
  const target = e.target as HTMLElement;
  scrollTop.value = target.scrollTop;
  updateCurrentPage();

  // 预加载当前可见区域前后的图片
  preloadVisibleImages();
}

// 预加载可见区域附近的图片
function preloadVisibleImages() {
  // JM 阅读器中依赖 LazyFileImage 自身的懒加载，不再额外预加载
}

// 带锚点的缩放：保持当前页在视口中的相对位置尽量不变
function setScaleWithAnchor(targetScale: number) {
  const container = getScrollContainer();
  let anchorOffset: number | null = null;

  if (container && virtualListItems.value.length > 0) {
    const currentIndex = Math.min(
      Math.max(0, store.currentImageIndex),
      imageItems.value.length - 1
    );
    const currentItem = imageItems.value[currentIndex];
    const wrapper = currentItem ? itemRefs.get(currentItem.key) : null;

    if (wrapper) {
      const center = wrapper.offsetTop + wrapper.clientHeight / 2;
      // 记录当前页中心相对视口顶部的偏移量（缩放后保持这个偏移不变）
      anchorOffset = center - container.scrollTop;
    } else {
      // 兜底：使用视口中心作为锚点
      anchorOffset = container.clientHeight / 2;
    }
  }

  const newZoom = Math.max(10, Math.min(100, targetScale));
  const oldZoom = store.imageScale;
  if (newZoom === oldZoom) return;

  store.setImageScale(newZoom);

  // 等缩放生效后，再根据锚点调整滚动，让当前图片在视口中的位置尽量保持不变
  nextTick(() => {
    const containerAfter = getScrollContainer();
    if (!containerAfter || anchorOffset == null) return;

    const currentIndex = Math.min(
      Math.max(0, store.currentImageIndex),
      imageItems.value.length - 1
    );
    const currentItem = imageItems.value[currentIndex];
    const wrapper = currentItem ? itemRefs.get(currentItem.key) : null;

    if (!wrapper) return;

    const newCenter = wrapper.offsetTop + wrapper.clientHeight / 2;
    const targetScrollTop = newCenter - anchorOffset;

    containerAfter.scrollTo({
      top: Math.max(0, targetScrollTop),
      left: 0,
    });
  });
}

// Ctrl + 滚轮缩放
function handleWheel(e: WheelEvent) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -5 : 5;
    setScaleWithAnchor(store.imageScale + delta);
  }
}

// 滚动到顶部
function scrollToTop() {
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

// 获取滚动容器
function getScrollContainer(): HTMLElement | null {
  if (scrollbarRef.value?.containerRef) {
    return scrollbarRef.value.containerRef as HTMLElement;
  }
  if (scrollContainerRef.value) {
    return scrollContainerRef.value;
  }
  const fallback = document.getElementById("jm-image-scroll-container");
  if (fallback) {
    const container =
      (fallback.querySelector(".n-scrollbar-container") as HTMLElement) ||
      (fallback as HTMLElement);
    scrollContainerRef.value = container;
    return container;
  }
  return null;
}

// 暴露滚动容器引用供父组件使用
defineExpose({
  scrollContainerRef,
  getScrollContainer,
  scrollToTop,
  scrollBy: (delta: number) => {
    const container = getScrollContainer();
    if (container) {
      container.scrollTop += delta;
    } else if (scrollbarRef.value?.scrollTo) {
      const currentScroll = scrollTop.value;
      scrollbarRef.value.scrollTo({ top: currentScroll + delta });
    }
  },
  setScaleWithAnchor,
});

// 监听当前章节变化，重置滚动位置
watch(
  () => store.currentChapter,
  () => {
    scrollToTop();
  }
);

// 监听缩放变化，更新当前页
watch(
  () => store.imageScale,
  () => {
    nextTick(() => {
      updateCurrentPage();
    });
  }
);

// 监听图片列表变化，清理旧的高度缓存并预加载图片
watch(
  () => store.readingImages,
  () => {
    // 清理旧的高度缓存和图片引用
    imageRefs.clear();
    itemRefs.clear();
    favoriteMap.clear();
    favoriteLoading.clear();
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
