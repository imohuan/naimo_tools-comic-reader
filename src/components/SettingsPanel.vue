<template>
  <n-drawer
    v-model:show="store.showSettings"
    :width="500"
    placement="right"
    :mask-closable="true"
  >
    <n-drawer-content title="设置" closable>
      <n-space vertical :size="24">
        <!-- 目录管理 -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <n-h3 style="margin: 0">目录管理</n-h3>
            <n-button size="small" type="primary" @click="handleAddDirectory">
              <template #icon>
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 4v16m8-8H4"
                  ></path>
                </svg>
              </template>
              添加目录
            </n-button>
          </div>
          <n-space vertical :size="8">
            <div
              v-for="(_, index) in store.staticDirs"
              :key="index"
              class="flex items-center gap-2 p-2 rounded border border-gray-700 bg-gray-800/30"
            >
              <n-input
                v-model:value="store.staticDirs[index]"
                size="small"
                class="flex-1"
                spellcheck="false"
                @blur="handleDirectoryChange(index)"
                @keydown.enter="handleDirectoryChange(index)"
              />
              <n-button
                size="small"
                quaternary
                @click="handleSelectDirectory(index)"
              >
                <template #icon>
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    ></path>
                  </svg>
                </template>
              </n-button>
              <n-button
                size="small"
                quaternary
                type="error"
                @click="handleRemoveDirectory(index)"
              >
                删除
              </n-button>
            </div>
            <div
              v-if="store.staticDirs.length === 0"
              class="text-center text-gray-500 py-4"
            >
              暂无目录，请添加目录
            </div>
          </n-space>
        </div>

        <!-- 快捷键设置 -->
        <div>
          <n-h3>快捷键设置</n-h3>
          <n-space vertical :size="16">
            <HotkeyBinding
              v-for="(action, key) in actionMap"
              :key="key"
              :label="action.label"
              :action-key="key"
              :current-key="store.hotkeys[key]"
              @update="handleHotkeyUpdate"
            />
          </n-space>
        </div>

        <!-- 自动滚动设置 -->
        <div>
          <n-h3>自动滚动设置</n-h3>
          <n-space vertical :size="12">
            <div class="flex items-center justify-between">
              <span>滚动速度</span>
              <div class="flex items-center gap-4 w-64">
                <n-slider
                  v-model:value="store.autoScrollSpeed"
                  :min="1"
                  :max="10"
                  :step="1"
                  :tooltip="false"
                  style="width: 200px"
                />
                <span class="text-sm font-mono w-10">{{
                  store.autoScrollSpeed
                }}</span>
              </div>
            </div>
          </n-space>
        </div>
      </n-space>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
import { useComicStore } from "../stores/comic";
import HotkeyBinding from "./HotkeyBinding.vue";
import { useMessage } from "naive-ui";
import { useDialog } from "naive-ui";

const store = useComicStore();
const message = useMessage();
const dialog = useDialog();

const actionMap = {
  scrollDown: { label: "向下滚动" },
  scrollUp: { label: "向上滚动" },
  autoScroll: { label: "切换自动滚动" },
  speedUp: { label: "增加滚动速度" },
  speedDown: { label: "减少滚动速度" },
  nextChapter: { label: "下一章" },
  prevChapter: { label: "上一章" },
};

function handleHotkeyUpdate(actionKey: string, newKey: string) {
  (store.hotkeys as any)[actionKey] = newKey;
}

// 添加目录
async function handleAddDirectory() {
  const dir = await window.comicReaderAPI.selectMangaDirectory();
  if (dir) {
    if (store.staticDirs.includes(dir)) {
      message.warning("该目录已存在");
      return;
    }
    store.addStaticDir(dir);
    message.success(`已添加目录: ${dir}`);
    if (window.naimo) {
      window.naimo.log.info(`已添加目录: ${dir}`);
    }
    // 自动刷新漫画列表
    if (window.$loadMangaList) {
      await window.$loadMangaList();
    }
  }
}

// 通过按钮选择目录
async function handleSelectDirectory(index: number) {
  const oldDir = store.staticDirs[index];
  const newDir = await window.comicReaderAPI.selectMangaDirectory();
  if (newDir && newDir !== oldDir) {
    if (store.staticDirs.includes(newDir)) {
      message.warning("该目录已存在");
      return;
    }
    store.staticDirs[index] = newDir;
    message.success(`已修改目录: ${oldDir} -> ${newDir}`);
    if (window.naimo) {
      window.naimo.log.info(`已修改目录: ${oldDir} -> ${newDir}`);
    }
    // 自动刷新漫画列表
    if (window.$loadMangaList) {
      await window.$loadMangaList();
    }
  }
}

// 输入框内容变化时的处理
async function handleDirectoryChange(index: number) {
  const newDir = store.staticDirs[index];
  if (!newDir || newDir.trim() === "") {
    message.warning("目录路径不能为空");
    return;
  }

  // 检查是否有重复
  const duplicateIndex = store.staticDirs.findIndex(
    (dir, idx) => dir === newDir && idx !== index
  );
  if (duplicateIndex !== -1) {
    message.warning("该目录已存在");
    return;
  }

  // 自动刷新漫画列表
  if (window.$loadMangaList) {
    await window.$loadMangaList();
  }
}

// 删除目录
function handleRemoveDirectory(index: number) {
  const dir = store.staticDirs[index];
  dialog.warning({
    title: "确认删除",
    content: `确定要删除目录 "${dir}" 吗？`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: () => {
      store.removeStaticDir(dir);
      message.success(`已删除目录: ${dir}`);
      if (window.naimo) {
        window.naimo.log.info(`已删除目录: ${dir}`);
      }
      // 自动刷新漫画列表
      if (window.$loadMangaList) {
        window.$loadMangaList();
      }
    },
  });
}
</script>
