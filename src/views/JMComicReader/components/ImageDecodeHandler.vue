<template></template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useJMComicStore } from "@/stores/jmcomic";
import { eventBus, type ImageDecodeEvent } from "@/utils/event-bus";

const store = useJMComicStore();

// 检查 blob URL 是否可用
async function checkBlobUrlAvailable(url: string): Promise<boolean> {
  if (!url || !url.startsWith("blob:")) {
    return false;
  }

  try {
    // 使用 fetch 检查 blob URL 是否仍然有效
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch (error) {
    // 如果 fetch 失败，尝试使用 Image 对象加载
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      // 设置超时，避免长时间等待
      setTimeout(() => resolve(false), 2000);
      img.src = url;
    });
  }
}

// 处理图片解码
async function handleImageDecode(event: ImageDecodeEvent) {
  debugger;
  if (event.type === "image-loaded") {
    // 找到对应的图片对象
    const imageObj = store.currentChapterImages.find(
      (img) => img.url === event.imageUrl || img.index === event.imageIndex + 1
    );

    if (!imageObj) {
      return;
    }

    // 判断 imageObj.processedUrl 是否可用
    if (imageObj.processedUrl) {
      const isAvailable = await checkBlobUrlAvailable(imageObj.processedUrl);
      if (!isAvailable) {
        // blob URL 已失效，清除它以便重新处理
        imageObj.processedUrl = undefined;
      }
    }

    // 如果图片需要解码且尚未处理
    if (
      imageObj.blockNum > 0 &&
      !imageObj.processedUrl &&
      !imageObj.isProcessing
    ) {
      try {
        if (!store.api) {
          return;
        }

        const processedUrl = await store.api.processImage(imageObj);

        if (processedUrl && processedUrl.startsWith("blob:")) {
          // 更新 readingImages 中的 URL
          const readingImage = store.readingImages.find(
            (img) => img.index === event.imageIndex
          );
          if (readingImage) {
            readingImage.url = processedUrl;
          }

          // 发送解码成功事件
          eventBus.emit("image-decode", {
            type: "image-decoded",
            imageUrl: event.imageUrl,
            imageIndex: event.imageIndex,
            decodedUrl: processedUrl,
          });
        }
      } catch (error) {
        console.error("图片解码失败:", error);
        eventBus.emit("image-decode", {
          type: "image-error",
          imageUrl: event.imageUrl,
          imageIndex: event.imageIndex,
          error: error as Error,
        });
      }
    }
  }
}

// 监听图片解码事件
const eventHandler = (event: ImageDecodeEvent) => {
  handleImageDecode(event);
};

onMounted(() => {
  eventBus.on("image-decode", eventHandler);
});

onUnmounted(() => {
  eventBus.off("image-decode", eventHandler);
});
</script>
