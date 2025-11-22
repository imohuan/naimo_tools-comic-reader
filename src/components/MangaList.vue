<template>
  <div class="flex-1 overflow-y-auto">
    <div
      v-if="store.mangas.length === 0 && !store.loading.library"
      class="text-center py-10 text-gray-600 text-xs"
    >
      暂无数据
    </div>

    <n-scrollbar class="menu">
      <div class="p-2 pr-3">
        <template v-for="manga in store.mangas" :key="manga.name">
          <!-- 单章节漫画 -->
          <div v-if="manga.meta.chapterInfos.length === 1" class="mb-1">
            <div
              class="group flex items-center gap-2 rounded cursor-pointer transition-colors hover:bg-white/5"
              :class="{
                'bg-green-500/10 text-green-400':
                  store.currentManga?.name === manga.name &&
                  store.currentChapter ===
                    manga.meta.chapterInfos[0].chapterTitle,
              }"
              @click="
                handleChapterClick(
                  manga,
                  manga.meta.chapterInfos[0].chapterTitle
                )
              "
            >
              <div
                class="w-12 h-16 bg-gray-800 rounded-sm overflow-hidden border border-white/10 flex items-center justify-center flex-shrink-0 relative"
              >
                <n-image
                  :src="getCoverImageUrl(manga)"
                  :alt="manga.name"
                  lazy
                  object-fit="cover"
                  class="w-full h-full"
                  :img-props="{ class: 'w-full h-full object-cover' }"
                  fallback-src=""
                >
                  <template #placeholder>
                    <div class="w-full h-full flex items-center justify-center">
                      <span class="text-[8px] text-gray-500">封面</span>
                    </div>
                  </template>
                </n-image>
              </div>
              <div class="flex-1 min-w-0 flex flex-col overflow-hidden">
                <span
                  class="text-xs truncate font-medium leading-tight"
                  :title="manga.name"
                >
                  {{ manga.name }}
                </span>
                <n-tag
                  size="small"
                  :bordered="false"
                  class="text-[10px] h-4 px-1 bg-white/5 text-gray-500 mt-1 self-start"
                >
                  单章
                </n-tag>
              </div>
            </div>
          </div>

          <!-- 多章节漫画 -->
          <n-collapse
            v-else
            :default-expanded-names="getExpandedName(manga)"
            arrow-placement="right"
            class="mb-1"
          >
            <n-collapse-item :name="manga.name" class="w-full">
              <template #header>
                <div class="flex items-center gap-2 w-full">
                  <div
                    class="w-12 h-16 bg-gray-800 rounded-sm overflow-hidden border border-white/10 flex items-center justify-center flex-shrink-0 relative"
                  >
                    <n-image
                      :src="getCoverImageUrl(manga)"
                      :alt="manga.name"
                      lazy
                      object-fit="cover"
                      class="w-full h-full"
                      :img-props="{ class: 'w-full h-full object-cover' }"
                      fallback-src=""
                    >
                      <template #placeholder>
                        <div
                          class="w-full h-full flex items-center justify-center"
                        >
                          <span class="text-[8px] text-gray-500">{{
                            manga.meta.chapterInfos.length
                          }}</span>
                        </div>
                      </template>
                    </n-image>
                  </div>
                  <div class="flex-1 w-full">
                    <span
                      class="text-xs font-medium leading-tight"
                      :title="manga.name"
                    >
                      {{ manga.name }}
                    </span>
                  </div>
                  <n-tag
                    size="small"
                    :bordered="false"
                    class="text-[10px] h-4 px-1 bg-white/5 text-gray-500 flex-shrink-0"
                  >
                    {{ manga.meta.chapterInfos.length }}章
                  </n-tag>
                </div>
              </template>

              <div class="pl-14 pr-2 py-1 space-y-1">
                <div
                  v-for="chapter in manga.meta.chapterInfos"
                  :key="chapter.chapterId"
                  class="px-2 py-1.5 rounded cursor-pointer text-xs transition-colors hover:bg-white/5"
                  :class="{
                    'bg-green-500/10 text-green-400':
                      store.currentManga?.name === manga.name &&
                      store.currentChapter === chapter.chapterTitle,
                  }"
                  @click="handleChapterClick(manga, chapter.chapterTitle)"
                >
                  <span class="truncate block" :title="chapter.chapterTitle">
                    {{ chapter.chapterTitle }}
                  </span>
                </div>
              </div>
            </n-collapse-item>
          </n-collapse>
        </template>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import { NImage } from "naive-ui";
import { useComicStore } from "../stores/comic";
import type { MangaItem } from "../stores/comic";

const store = useComicStore();

// 封面图片 URL（使用 reactive 对象以便响应式更新）
const coverImageUrls = reactive<Record<string, string>>({});
// 正在加载的封面集合，避免重复加载
const loadingSet = new Set<string>();

// 获取封面图片 URL（用于 n-image 组件）
function getCoverImageUrl(manga: MangaItem): string | undefined {
  const cacheKey = manga.name;

  // 如果已经有 URL，直接返回
  if (coverImageUrls[cacheKey]) {
    return coverImageUrls[cacheKey];
  }

  // 如果还没有加载，触发加载
  if (!loadingSet.has(cacheKey)) {
    loadCoverImage(manga);
  }

  return undefined;
}

// 直接加载封面图片
async function loadCoverImage(manga: MangaItem) {
  const cacheKey = manga.name;

  // 如果已经在加载，跳过
  if (loadingSet.has(cacheKey)) {
    return;
  }

  // 标记为加载中
  loadingSet.add(cacheKey);

  try {
    // 获取第一章节的第一张图片作为封面
    if (manga.meta.chapterInfos.length === 0) {
      return;
    }

    const firstChapter = manga.meta.chapterInfos[0];
    const staticDirsArray = [...store.staticDirs].map((dir) => String(dir));
    const images = await window.comicReaderAPI.getChapterImages(
      staticDirsArray,
      String(manga.name),
      String(firstChapter.chapterTitle)
    );

    if (images.length === 0) {
      return;
    }

    const firstImage = images[0];
    let filePath = firstImage.path;

    if (!filePath && firstImage.url.startsWith("file://")) {
      filePath = decodeURIComponent(firstImage.url.replace(/^file:\/\/\//, ""));
    }

    if (!filePath) {
      return;
    }

    // 使用 getLocalImage API 获取 base64 数据
    if (window.naimo?.system?.getLocalImage) {
      const base64 = await window.naimo.system.getLocalImage(filePath);
      const ext = filePath.toLowerCase().split(".").pop() || "jpg";
      const typeMap: Record<string, string> = {
        jpg: "jpeg",
        jpeg: "jpeg",
        png: "png",
        gif: "gif",
        webp: "webp",
        bmp: "bmp",
      };
      const imageType = typeMap[ext] || "jpeg";
      const dataUrl = `data:image/${imageType};base64,${base64}`;
      // 使用 Vue 的响应式方式更新
      coverImageUrls[cacheKey] = dataUrl;
    }
  } catch (error) {
    console.error(`[MangaList] loadCoverImage: ${cacheKey} 加载失败`, error);
  } finally {
    loadingSet.delete(cacheKey);
  }
}

function getExpandedName(manga: (typeof store.mangas)[0]) {
  if (store.currentManga?.name === manga.name && store.currentChapter) {
    return manga.name;
  }
  return null;
}

async function handleChapterClick(
  manga: (typeof store.mangas)[0],
  chapterTitle: string
) {
  const chapters = manga.meta.chapterInfos;

  if (chapters.length === 0) {
    if (window.$message) {
      window.$message.warning("该漫画没有章节");
    }
    return;
  }

  store.setCurrentManga(manga);
  await loadChapter(manga, chapterTitle);
}

async function loadChapter(
  manga: (typeof store.mangas)[0],
  chapterTitle: string
) {
  store.setCurrentManga(manga);
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
    if (window.$message) {
      window.$message.error("加载章节失败");
    }
    if (window.naimo) {
      window.naimo.log.error("加载章节失败", error);
    }
  } finally {
    store.setLoading("chapter", false);
  }
}
</script>

<style>
.menu .n-scrollbar-rail__scrollbar {
  transform: translateX(1px) !important;
  /* width: 18px !important; */
  border-radius: 0px !important;
  right: 0;
}
</style>
