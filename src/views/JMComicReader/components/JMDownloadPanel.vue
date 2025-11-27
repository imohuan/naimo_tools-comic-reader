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
          共 {{ downloadStore.totalChapters }} 章节，已完成
          {{ downloadStore.finishedChapters }} 章节
        </div>
        <div class="flex items-center gap-10">
          <div class="flex items-center gap-1">
            <span>章节并发</span>
            <n-input-number
              v-model:value="downloadStore.fetchConcurrency"
              size="small"
              :min="1"
              :max="10"
              style="width: 80px"
            />
          </div>
          <div class="flex items-center gap-1">
            <span>图片并发</span>
            <n-input-number
              v-model:value="downloadStore.downloadConcurrency"
              size="small"
              :min="1"
              :max="20"
              style="width: 80px"
            />
          </div>
        </div>
      </div>

      <template v-if="downloadStore.comicGroups.length > 0">
        <n-collapse
          :accordion="false"
          :default-expanded-names="defaultExpandedNames"
        >
          <n-collapse-item
            v-for="group in downloadStore.comicGroups"
            :key="group.key"
            :title="`${group.comicTitle} (${group.finishedChapters}/${group.totalChapters})`"
            :name="group.key"
          >
            <div class="space-y-3">
              <div
                v-for="chapter in group.chapters"
                :key="chapter.chapterId"
                class="space-y-1 pl-6"
              >
                <div
                  class="flex items-center justify-between text-xs text-gray-300 gap-3"
                >
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="truncate">{{ chapter.chapterTitle }}</span>
                    <n-tag size="tiny" :type="statusTagType(chapter.status)">
                      {{ statusText(chapter.status) }}
                    </n-tag>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="whitespace-nowrap text-right text-gray-400">
                      {{ progressText(chapter) }}
                    </span>
                    <n-button
                      size="tiny"
                      text
                      type="error"
                      @click="downloadStore.deleteDownload(chapter.chapterId)"
                    >
                      删除
                    </n-button>
                  </div>
                </div>
                <n-progress
                  v-if="chapter.total > 0"
                  type="line"
                  :percentage="
                    Math.round((chapter.finished / chapter.total) * 100)
                  "
                  :show-indicator="false"
                  status="success"
                />
                <div v-else class="text-xs text-gray-500 italic">
                  待加载章节图片…
                </div>
                <div
                  v-if="chapter.status === 'error' && chapter.error"
                  class="text-xs text-red-400"
                >
                  {{ chapter.error }}
                </div>
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
import { computed } from "vue";
import { useJMDownloadStore } from "@/stores/jmDownload";

interface Props {
  show: boolean;
}

defineProps<Props>();
const emit = defineEmits<{ "update:show": [value: boolean] }>();

const downloadStore = useJMDownloadStore();

const defaultExpandedNames = computed(() =>
  downloadStore.comicGroups.map((group) => group.key)
);

const statusText = (status: string) => {
  switch (status) {
    case "pending":
      return "待开始";
    case "fetching":
      return "加载中";
    case "queued":
      return "待下载";
    case "downloading":
      return "下载中";
    case "completed":
      return "已完成";
    case "error":
      return "出错";
    default:
      return status;
  }
};

const statusTagType = (status: string) => {
  switch (status) {
    case "completed":
      return "success";
    case "error":
      return "error";
    case "downloading":
      return "info";
    case "fetching":
      return "warning";
    default:
      return "default";
  }
};

const progressText = (chapter: {
  finished: number;
  total: number;
  status: string;
}) => {
  if (chapter.total <= 0) {
    return "待加载";
  }
  const percent =
    chapter.total > 0
      ? Math.round((chapter.finished / chapter.total) * 100)
      : 0;
  return `${chapter.finished}/${chapter.total} (${percent}%)`;
};

const onUpdateShow = (value: boolean) => {
  emit("update:show", value);
};

const onCancel = () => {
  emit("update:show", false);
};
</script>
