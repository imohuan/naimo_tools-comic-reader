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
          class="w-full flex items-center justify-center outline-none focus:outline-none ring-0 focus:ring-0"
        >
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
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { NVirtualList } from "naive-ui";
import { useJMComicStore } from "@/stores/jmcomic";
import { eventBus } from "@/utils/event-bus";

const store = useJMComicStore();
const viewerContainer = ref<HTMLElement | null>(null);
const virtualListRef = ref<any>(null);
const estimatedItemHeight = ref(800);
const scrollTop = ref(0);
const imageRefs = new Map<string, HTMLImageElement>();

// 存储每个item的实际高度
const itemHeights = ref<Map<string, number>>(new Map());

// 将图片列表转换为虚拟列表需要的格式
const virtualListItems = computed(() => {
  return store.readingImages.map((img, index) => ({
    key: `${img.url}-${index}`,
    url: img.url,
    index: img.index,
    filename: `image-${img.index + 1}`,
  }));
});

// 获取图片 src
function getImageSrc(item: any): string {
  return item.url;
}

// 预加载图片
function preloadImage(url: string): void {
  const img = new Image();
  img.src = url;
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
    if (store.readingImages[i]?.url) {
      preloadImage(store.readingImages[i].url);
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
    // 清理旧的高度缓存
    itemHeights.value.clear();

    // 预加载前几张图片
    if (newImages.length > 0) {
      const preloadCount = Math.min(5, newImages.length);
      for (let i = 0; i < preloadCount; i++) {
        preloadImage(newImages[i].url);
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

<style scoped>
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
