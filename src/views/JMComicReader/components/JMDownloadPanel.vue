<template>
  <n-modal
    :show="show"
    preset="card"
    title="下载管理"
    style="width: 80%; max-width: 1200px"
    :mask-closable="true"
    :closable="true"
    @update:show="onUpdateShow"
  >
    <div class="space-y-4">
      <div class="flex items-center justify-between text-xs text-gray-400">
        <div>
          共 {{ totalChapters }} 章节，已完成 {{ finishedChapters }} 章节
        </div>
        <div class="flex items-center gap-1">
          <span>并发数</span>
          <n-input-number
            v-model:value="concurrency"
            size="small"
            :min="1"
            :max="20"
            style="width: 90px"
          />
        </div>
      </div>

      <template v-if="comicGroups.length > 0">
        <n-collapse :accordion="false">
          <n-collapse-item
            v-for="group in comicGroups"
            :key="group.key"
            :title="`${group.comicTitle} (${group.finishedChapters}/${group.totalChapters})`"
            :name="group.key"
          >
            <div class="space-y-3">
              <div
                v-for="chapter in group.chapters"
                :key="chapter.id"
                class="space-y-1 pl-6"
              >
                <div
                  class="flex items-center justify-between text-xs text-gray-300"
                >
                  <span class="truncate mr-2">{{ chapter.chapterTitle }}</span>
                  <span class="whitespace-nowrap text-right text-gray-400">
                    {{ chapter.finished }}/{{ chapter.total }} ({{
                      chapter.total > 0
                        ? Math.round((chapter.finished / chapter.total) * 100)
                        : 0
                    }}%))
                  </span>
                </div>
                <n-progress
                  v-if="chapter.total > 0"
                  type="line"
                  :percentage="
                    Math.round((chapter.finished / chapter.total) * 100)
                  "
                  :show-indicator="false"
                />
              </div>
            </div>
          </n-collapse-item>
        </n-collapse>
      </template>
      <template v-else>
        <div
          class="py-10 flex flex-col items-center justify-center text-gray-500 text-sm"
        >
          <n-empty description="暂无下载任务" />
        </div>
      </template>

      <div class="flex justify-end gap-2 mt-2">
        <n-button size="small" @click="onCancel">关闭</n-button>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import { useJMComicStore } from "@/stores/jmcomic";

interface Props {
  show: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{ "update:show": [value: boolean] }>();

const store = useJMComicStore();

interface ChapterStat {
  comicTitle: string;
  chapterTitle: string;
  total: number;
  finished: number;
}

const chapterStats = reactive<Record<string, ChapterStat>>({});

const comicGroups = computed(() => {
  const groups: Record<
    string,
    {
      comicTitle: string;
      key: string;
      chapters: Array<ChapterStat & { id: string }>;
      finishedChapters: number;
      totalChapters: number;
    }
  > = {};

  for (const [chapterId, stat] of Object.entries(chapterStats)) {
    const key = stat.comicTitle || "未知作品";
    if (!groups[key]) {
      groups[key] = {
        comicTitle: key,
        key,
        chapters: [],
        finishedChapters: 0,
        totalChapters: 0,
      };
    }
    const group = groups[key];
    group.chapters.push({ ...stat, id: chapterId });
    group.totalChapters += 1;
    if (stat.total > 0 && stat.finished >= stat.total) {
      group.finishedChapters += 1;
    }
  }

  return Object.values(groups);
});

const totalChapters = computed(() =>
  comicGroups.value.reduce((sum, g) => sum + g.totalChapters, 0)
);

const finishedChapters = computed(() =>
  comicGroups.value.reduce((sum, g) => sum + g.finishedChapters, 0)
);

const concurrency = computed<number>({
  get() {
    const v = (store.settings as any).downloadConcurrency;
    return typeof v === "number" && v > 0 ? v : 10;
  },
  set(value: number) {
    (store.settings as any).downloadConcurrency = value || 10;
  },
});

const onUpdateShow = (value: boolean) => {
  emit("update:show", value);
};

const onCancel = () => {
  emit("update:show", false);
};
const updateChapterStat = (payload: {
  chapterId?: string;
  chapterTitle?: string;
  comicTitle?: string;
  chapterTotal?: number;
  finishedDelta?: number;
}) => {
  const chapterId = payload.chapterId;
  if (!chapterId) return;

  if (!chapterStats[chapterId]) {
    chapterStats[chapterId] = {
      comicTitle: payload.comicTitle || "",
      chapterTitle: payload.chapterTitle || "",
      total: payload.chapterTotal || 0,
      finished: 0,
    };
  }

  const stat = chapterStats[chapterId];
  if (payload.chapterTitle) stat.chapterTitle = payload.chapterTitle;
  if (payload.comicTitle) stat.comicTitle = payload.comicTitle;
  if (
    typeof payload.chapterTotal === "number" &&
    payload.chapterTotal > stat.total
  ) {
    stat.total = payload.chapterTotal;
  }
  if (payload.finishedDelta) {
    stat.finished += payload.finishedDelta;
  }
};

let unProgress: (() => void) | undefined;
let unCompleted: (() => void) | undefined;
let unError: (() => void) | undefined;

onMounted(() => {
  if (!(window as any).naimo?.download) return;

  unProgress = naimo.download.onDownloadProgress((status: any) => {
    const meta = status.metadata || {};
    if (meta.source !== "jm-comic") return;
    updateChapterStat({
      chapterId: meta.chapterId,
      chapterTitle: meta.chapterTitle,
      comicTitle: meta.comicTitle,
      chapterTotal: meta.chapterTotal,
    });
  });

  unCompleted = naimo.download.onDownloadCompleted((status: any) => {
    const meta = status.metadata || {};
    if (meta.source !== "jm-comic") return;
    updateChapterStat({
      chapterId: meta.chapterId,
      chapterTitle: meta.chapterTitle,
      comicTitle: meta.comicTitle,
      chapterTotal: meta.chapterTotal,
      finishedDelta: 1,
    });
  });

  unError = naimo.download.onDownloadError((status: any) => {
    const meta = status.metadata || {};
    if (meta.source !== "jm-comic") return;
    // 失败也视为该章节中一个任务结束
    updateChapterStat({
      chapterId: meta.chapterId,
      chapterTitle: meta.chapterTitle,
      comicTitle: meta.comicTitle,
      chapterTotal: meta.chapterTotal,
      finishedDelta: 1,
    });
  });
});

onUnmounted(() => {
  if (unProgress) unProgress();
  if (unCompleted) unCompleted();
  if (unError) unError();
});
</script>
