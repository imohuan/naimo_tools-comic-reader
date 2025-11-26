<template>
  <div
    ref="viewerContainer"
    class="viewer h-full flex-1 relative bg-[#050505] overflow-hidden outline-none focus:outline-none"
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
    >
      <template #default="{ item }">
        <div
          class="w-full flex items-center justify-center outline-none focus:outline-none ring-0 focus:ring-0 relative"
        >
          <div class="absolute top-3 left-3 z-10 flex">
            <FavoriteToggle
              :favorited="isItemFavorited(item.key)"
              :loading="isFavoriteBusy(item.key)"
              @add="handleFavoriteAdd(item)"
              @remove="handleFavoriteRemoval(item)"
            />
          </div>
          <img
            :ref="(el) => setImageRef(el, item)"
            :src="getImageSrc(item)"
            :alt="item.filename"
            class="w-auto h-auto object-contain bg-[#111] select-none outline-none focus:outline-none ring-0 focus:ring-0"
            :style="{
              width: `${store.imageScale}%`,
              maxWidth: '100%',
              display: 'block',
            }"
            loading="lazy"
            @load="onImageLoad($event, item)"
            @error="onImageError($event, item)"
          />
        </div>
      </template>
    </NVirtualList>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, reactive } from "vue";
import { NVirtualList, useMessage } from "naive-ui";
import FavoriteToggle from "@/components/FavoriteToggle.vue";
import { useJMComicStore } from "@/stores/jmcomic";
import { useComicStore } from "@/stores/comic";
import { eventBus } from "@/utils/event-bus";
import { buildFavoriteFilename } from "@/utils/favorite-utils";

const store = useJMComicStore();
const comicStore = useComicStore();
const message = useMessage();
const viewerContainer = ref<HTMLElement | null>(null);
const virtualListRef = ref<any>(null);
const estimatedItemHeight = ref(800);
const scrollTop = ref(0);
const imageRefs = new Map<string, HTMLImageElement>();
const favoriteMap = reactive(new Map<string, string>());
const favoriteLoading = reactive(new Set<string>());
const imageSrcMap = ref<Map<string, string>>(new Map());
const loadingLocalImages = new Set<string>();

// 存储每个item的实际高度
const itemHeights = ref<Map<string, number>>(new Map());

// 将图片列表转换为虚拟列表需要的格式
const virtualListItems = computed(() => {
  return store.readingImages.map((img, index) => ({
    key: `${img.url}-${index}`,
    url: img.url,
    index: img.index,
    filename: `image-${img.index + 1}`,
    path: img.path,
  }));
});

// 获取图片 src
function getImageSrc(item: any): string {
  const cacheKey = item.path || item.url;
  if (cacheKey && imageSrcMap.value.has(cacheKey)) {
    return imageSrcMap.value.get(cacheKey)!;
  }

  if (isLocalImage(item)) {
    loadLocalImage(cacheKey, item.path);
  }

  return item.url;
}

function isLocalImage(item: any): boolean {
  if (!item?.path) return false;
  return (
    item.url?.startsWith("file://") && !!window.naimo?.system?.getLocalImage
  );
}

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

async function loadLocalImage(cacheKey: string, filePath: string) {
  if (!filePath || !cacheKey) return;
  if (loadingLocalImages.has(cacheKey)) return;
  loadingLocalImages.add(cacheKey);

  try {
    const base64 = await window.naimo.system.getLocalImage(filePath);
    const dataUrl = `data:image/${getImageType(filePath)};base64,${base64}`;
    imageSrcMap.value.set(cacheKey, dataUrl);
  } catch (error) {
    console.error("加载本地图片失败:", error);
  } finally {
    loadingLocalImages.delete(cacheKey);
  }
}

// 预加载图片
function preloadImage(item: any): void {
  const src = getImageSrc(item);
  const img = new Image();
  img.src = src;
}

// 设置图片引用
function setImageRef(el: any, item: any) {
  if (el && item) {
    imageRefs.set(item.key, el);
    if (el.complete && el.naturalHeight > 0) {
      nextTick(() => updateItemHeight(item, el));
    }
  } else if (!el && item) {
    imageRefs.delete(item.key);
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
  if (
    image &&
    image.complete &&
    image.naturalWidth > 0 &&
    image.naturalHeight > 0
  ) {
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
  const response = await fetch(getImageSrc(item));
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

// 更新 item 高度
function updateItemHeight(item: any, img?: HTMLImageElement) {
  const image = img || imageRefs.get(item.key);
  if (!image || !virtualListRef.value || !viewerContainer.value) return;

  if (image.complete && image.naturalHeight > 0 && image.naturalWidth > 0) {
    const viewportWidth = viewerContainer.value.clientWidth || 1920;
    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;
    const zoomRatio = store.imageScale / 100;

    const maxScaledWidth = viewportWidth * zoomRatio;
    const scaledWidth = Math.min(maxScaledWidth, naturalWidth * zoomRatio);
    const scaledHeight = (naturalHeight * scaledWidth) / naturalWidth;
    const finalHeight = Math.max(scaledHeight + 8, 200);

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

function onImageLoad(event: Event, item: any) {
  if (item && event.target) {
    updateItemHeight(item, event.target as HTMLImageElement);
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
  if (!virtualListRef.value || !viewerContainer.value) return;

  const viewportHeight = viewerContainer.value.clientHeight;
  const centerScrollTop = scrollTop.value + viewportHeight / 2;
  const estimatedPage =
    Math.floor(centerScrollTop / estimatedItemHeight.value) + 1;
  const clampedPage = Math.max(
    1,
    Math.min(estimatedPage, store.readingImages.length)
  );

  if (clampedPage !== store.currentImageIndex + 1) {
    store.setCurrentImageIndex(clampedPage - 1);
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
  if (!store.readingImages.length) return;

  const currentIndex = store.currentImageIndex;
  const preloadRange = 3; // 预加载前后各3张

  // 预加载当前图片前后的图片
  for (
    let i = Math.max(0, currentIndex - preloadRange);
    i <= Math.min(store.readingImages.length - 1, currentIndex + preloadRange);
    i++
  ) {
    if (store.readingImages[i]) {
      preloadImage(store.readingImages[i]);
    }
  }
}

// Ctrl + 滚轮缩放
function handleWheel(e: WheelEvent) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -5 : 5;
    const newZoom = Math.max(10, Math.min(100, store.imageScale + delta));
    store.setImageScale(newZoom);
  }
}

// 暴露滚动容器引用供父组件使用
defineExpose({
  virtualListRef,
  getScrollContainer: () => {
    if (virtualListRef.value?.$el) {
      return (
        virtualListRef.value.$el.querySelector(".n-scrollbar-container") ||
        virtualListRef.value.$el.querySelector(".n-virtual-list") ||
        virtualListRef.value.$el.querySelector('[style*="overflow"]')
      );
    }
    return null;
  },
  scrollBy: (delta: number) => {
    const scrollContainer = virtualListRef.value?.$el?.querySelector(
      ".n-scrollbar-container"
    );
    if (scrollContainer) {
      scrollContainer.scrollTop += delta;
    } else if (virtualListRef.value?.scrollTo) {
      const currentScroll = scrollTop.value;
      virtualListRef.value.scrollTo({ top: currentScroll + delta });
    }
  },
});

// 监听当前章节变化，重置滚动位置
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

// 监听缩放变化，重新计算 item 高度
watch(
  () => store.imageScale,
  () => {
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

// 监听图片列表变化，清理旧的高度缓存并预加载图片
watch(
  () => store.readingImages,
  (newImages) => {
    // 清理旧的高度缓存和图片引用
    itemHeights.value.clear();
    imageRefs.clear();
    favoriteMap.clear();
    favoriteLoading.clear();
    imageSrcMap.value.clear();
    loadingLocalImages.clear();

    // 预加载前几张图片
    if (newImages.length > 0) {
      const preloadCount = Math.min(5, newImages.length);
      for (let i = 0; i < preloadCount; i++) {
        preloadImage(newImages[i]);
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
