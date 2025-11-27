<template>
  <div
    ref="containerRef"
    class="p-4 border-t border-gray-800 flex items-center gap-4 flex-shrink-0"
  >
    <div ref="paginationRef" class="flex-1 min-w-0">
      <n-pagination
        v-model:page="currentPage"
        :page-size="store.pageSize"
        :item-count="store.totalItems"
        :page-slot="pageSlot"
        @update:page="(page: number) => handlePageChange(page, true)"
        :disabled="store.loading"
        size="small"
      />
    </div>
    <div class="flex items-center gap-2 flex-shrink-0">
      <n-button
        :type="store.autoLoadNextPage ? 'primary' : 'default'"
        size="small"
        round
        @click="toggleAutoLoad"
        :theme-overrides="{
          colorPrimary: '#ec4899',
          colorPrimaryHover: '#db2777',
          colorPrimaryPressed: '#be185d',
          borderRadius: '8px',
          heightSmall: '32px',
          paddingSmall: '0 16px',
        }"
        class="transition-all"
      >
        <template #icon>
          <n-icon :size="16">
            <svg
              v-if="store.autoLoadNextPage"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
              />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </n-icon>
        </template>
        {{ store.autoLoadNextPage ? "自动加载" : "手动翻页" }}
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";
import { useJMComicStore } from "@/stores/jmcomic";
import { usePagination } from "@/hooks/usePagination";

const store = useJMComicStore();
const { handlePageChange } = usePagination();

const containerRef = ref<HTMLElement | null>(null);
const paginationRef = ref<HTMLElement | null>(null);
const pageSlot = ref(7);

const currentPage = computed({
  get: () => store.currentPage,
  set: (value) => store.setCurrentPage(value),
});

const toggleAutoLoad = () => {
  store.toggleAutoLoadNextPage();
};

// 根据宽度计算合适的 page-slot 值
const calculatePageSlot = () => {
  if (!paginationRef.value) return;

  const containerWidth = paginationRef.value.clientWidth;
  // 每个页码按钮大约需要 40px（包括间距）
  // 左右箭头和省略号大约需要 80px
  const buttonWidth = 40;
  const baseWidth = 80;
  const availableWidth = containerWidth - baseWidth;

  // 计算能显示多少个页码按钮
  const maxButtons = Math.floor(availableWidth / buttonWidth);

  // 限制在合理范围内：最小 3 个，最大 9 个
  const calculatedSlot = Math.max(3, Math.min(9, maxButtons));

  // 如果是奇数，调整为奇数（分页通常显示奇数个按钮更美观）
  pageSlot.value =
    calculatedSlot % 2 === 0 ? calculatedSlot - 1 : calculatedSlot;
};

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  calculatePageSlot();

  // 使用 ResizeObserver 监听容器宽度变化
  if (paginationRef.value && window.ResizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      calculatePageSlot();
    });
    resizeObserver.observe(paginationRef.value);
  } else {
    // 降级方案：使用 window resize 事件
    window.addEventListener("resize", calculatePageSlot);
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  } else {
    window.removeEventListener("resize", calculatePageSlot);
  }
});
</script>
