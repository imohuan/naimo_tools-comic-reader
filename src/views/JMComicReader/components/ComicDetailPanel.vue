<template>
  <div
    class="bg-cardbg rounded-xl p-6 shadow-lg flex flex-col md:flex-row gap-6"
  >
    <!-- 封面 -->
    <div class="w-full md:w-1/2 lg:w-1/3 flex-shrink-0">
      <n-image
        :src="getProxiedUrl(store.currentComic?.cover || '', true)"
        lazy
        :preview-disabled="false"
        class="w-full rounded-lg shadow-md object-cover aspect-[2/3]"
        @error="handleImgError"
      >
        <template #placeholder>
          <div
            class="flex items-center justify-center w-full h-full bg-gray-800"
          >
            <n-spin size="small" />
          </div>
        </template>
      </n-image>
    </div>

    <!-- 信息 -->
    <div class="flex-1">
      <h1 class="text-2xl md:text-3xl font-bold text-white mb-2">
        {{ store.currentComic?.title }}
      </h1>
      <p class="text-gray-400 text-sm mb-4">
        JM ID: {{ store.currentComic?.id }}
      </p>

      <div class="flex flex-wrap gap-2 mb-4">
        <n-tag
          v-for="tag in store.currentComic?.tags"
          :key="tag"
          type="default"
          round
        >
          {{ tag }}
        </n-tag>
      </div>

      <p class="text-gray-300 text-sm leading-relaxed mb-6">
        {{ store.currentComic?.description || "暂无简介..." }}
      </p>

      <div class="border-t border-gray-700 pt-4">
        <h3 class="text-lg font-semibold mb-3 flex items-center">章节列表</h3>
        <div
          v-if="store.detailLoading && store.chapterList.length === 0"
          class="py-10 text-center"
        >
          <n-spin size="large" />
        </div>
        <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <button
            v-for="chapter in store.chapterList"
            :key="chapter.id"
            class="px-4 py-3 bg-gray-700 hover:bg-primary rounded text-sm text-left transition truncate"
            :class="{ 'bg-primary': store.currentChapter?.id === chapter.id }"
            @click="handleSelectChapter(chapter)"
          >
            {{ chapter.title }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useJMComicStore } from "@/stores/jmcomic";
import { eventBus } from "@/utils/event-bus";

const store = useJMComicStore();

const getProxiedUrl = (url: string, isImage = false): string => {
  if (!url) return "";
  if (
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    url.includes("placeholder")
  )
    return url;

  if (store.settings.proxyUrl) {
    const typeParam = isImage ? "&type=image" : "";
    return `${store.settings.proxyUrl}${encodeURIComponent(url)}${typeParam}`;
  }

  return url;
};

const handleImgError = () => {
  // 错误处理
};

const handleSelectChapter = async (chapter: any) => {
  // 清理旧章节的所有 blob URL
  if (store.currentChapterImages && store.currentChapterImages.length > 0) {
    store.currentChapterImages.forEach((imageObj) => {
      if (imageObj.processedUrl && imageObj.processedUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imageObj.processedUrl);
        imageObj.processedUrl = undefined;
      }
    });
  }

  store.setCurrentChapter(chapter);
  store.setReadingImages([]);
  store.setCurrentChapterImages([]);
  store.setCurrentImageIndex(0);
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

    // 切换到图片预览视图
    eventBus.emit("chapter-selected", { chapterId: chapter.id });
  } catch (error: any) {
    console.error("获取章节图片失败:", error);
  } finally {
    store.setDetailLoading(false);
  }
};
</script>

<style scoped>
.bg-cardbg {
  background-color: #242424;
}
</style>
