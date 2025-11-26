<template>
  <div class="flex items-center gap-3 flex-shrink-0">
    <!-- <n-button circle quaternary @click="$emit('show-settings')" size="medium">
      <template #icon>
        <n-icon :size="20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path
              d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
            />
          </svg>
        </n-icon>
      </template>
    </n-button> -->
    <div class="flex-1 relative group">
      <n-input
        v-model:value="searchQuery"
        placeholder="输入车号(ID) 或 关键词"
        clearable
        @keyup.enter="handleSearchClick"
        :theme-overrides="{
          color: '#1f1f1f',
          colorHover: '#2a2a2a',
          colorFocus: '#1f1f1f',
          borderColor: '#3a3a3a',
          borderColorHover: '#4a4a4a',
          borderColorFocus: '#ec4899',
          textColor: '#e5e7eb',
          placeholderColor: '#6b7280',
          borderRadius: '6px',
          heightMedium: '40px',
        }"
        size="medium"
        class="search-input"
      >
        <template #prefix>
          <n-icon
            :size="18"
            class="text-gray-500 group-hover:text-gray-400 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </n-icon>
        </template>
      </n-input>
    </div>
    <n-select
      v-model:value="searchSort"
      :options="sortOptions"
      size="medium"
      style="width: 140px"
      :theme-overrides="{
        color: '#1f1f1f',
        colorHover: '#2a2a2a',
        colorFocus: '#1f1f1f',
        borderColor: '#3a3a3a',
        borderColorHover: '#4a4a4a',
        borderColorFocus: '#ec4899',
        textColor: '#e5e7eb',
        placeholderColor: '#6b7280',
        borderRadius: '6px',
        heightMedium: '40px',
      }"
    />
    <n-button
      @click="handleSearchClick"
      size="medium"
      color="#ec4899"
      class="search-btn transition-all duration-200 text-white!"
    >
      搜索
    </n-button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useJMComicStore } from "@/stores/jmcomic";
import { useSearch } from "@/hooks/useSearch";
import { SearchSort } from "@/utils/comic-api";

defineEmits<{
  "show-settings": [];
}>();

const store = useJMComicStore();
const { handleSearch } = useSearch();

const sortOptions = [
  { label: "最新", value: SearchSort.Latest },
  { label: "最多点阅的", value: SearchSort.View },
  { label: "最多图片", value: SearchSort.Picture },
  { label: "最多爱心", value: SearchSort.Like },
];

// 确保默认选择第一个选项
onMounted(() => {
  const currentSort = store.searchSort;
  const isValidSort = sortOptions.some((opt) => opt.value === currentSort);
  if (!isValidSort) {
    store.setSearchSort(sortOptions[0].value);
  }
});

const searchQuery = computed({
  get: () => store.searchQuery,
  set: (value) => store.setSearchQuery(value),
});

const searchSort = computed({
  get: () => store.searchSort,
  set: (value) => store.setSearchSort(value),
});

const handleSearchClick = () => {
  handleSearch(1, false);
};
</script>

<style scoped>
.search-input {
  transition: all 0.2s ease;
  outline: none;
  box-shadow: none;
}

.search-input:focus-within {
  outline: none;
  box-shadow: none;
}

.search-btn {
  font-weight: 500;
  letter-spacing: 0.3px;
}

.search-btn:hover {
  transform: translateY(-1px);
}

.search-btn:active {
  transform: translateY(0);
}
</style>
