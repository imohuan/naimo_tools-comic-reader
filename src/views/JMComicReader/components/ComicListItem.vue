<template>
  <div
    ref="rootRef"
    class="bg-cardbg rounded-lg overflow-hidden hover:ring-2 ring-primary transition cursor-pointer group"
    :class="{ 'ring-2 ring-primary': isActive }"
    @click="handleClick"
  >
    <div class="aspect-[2/3] overflow-hidden relative">
      <n-image
        :src="getProxiedUrl(comic.cover || '', true)"
        lazy
        preview-disabled
        class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
        :intersection-observer-options="{
          root: container,
          rootMargin: '300px',
        }"
        @error="handleImgError"
      >
        <template #placeholder>
          <div class="flex items-center justify-center w-full h-full bg-gray-800">
            <n-spin size="small" />
          </div>
        </template>
      </n-image>
      <div
        class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2"
      >
        <span class="text-xs text-gray-300">{{ comic.author }}</span>
      </div>
    </div>
    <div class="p-2 flex flex-col gap-2">
      <h3 class="text-xs font-bold line-clamp-2 h-8 text-gray-100">
        {{ comic.title }}
      </h3>
      <div class="flex justify-between items-center mt-1">
        <n-tag size="tiny" type="info">{{ comic.id }}</n-tag>
        <span class="text-xs text-gray-500">{{ comic.date || "最新" }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import { useJMComicStore } from "@/stores/jmcomic";

const props = defineProps<{
  comic: any;
  isActive: boolean;
  container: HTMLElement | null;
  isSidebarCollapsed?: boolean;
}>();

const emit = defineEmits<{
  select: [comic: any];
}>();

const store = useJMComicStore();
const rootRef = ref<HTMLElement | null>(null);

const getProxiedUrl = (url: string, isImage = false): string => {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("blob:") || url.includes("placeholder"))
    return url;

  if (store.settings.proxyUrl && store.settings.imageProxyEnabled !== false) {
    const typeParam = isImage ? "&type=image" : "";
    return `${store.settings.proxyUrl}${encodeURIComponent(url)}${typeParam}`;
  }

  return url;
};

const handleImgError = () => {
  // 可以在这里添加占位图或重试逻辑
};

const scrollIntoViewIfNeeded = async () => {
  if (!props.isActive) return;
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 100));
  const el = rootRef.value;
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
};

const handleClick = () => {
  emit("select", props.comic);
};

onMounted(() => {
  scrollIntoViewIfNeeded();
});

watch(
  () => props.isActive,
  () => {
    scrollIntoViewIfNeeded();
  }
);

watch(
  () => props.container,
  () => {
    scrollIntoViewIfNeeded();
  }
);

watch(
  () => props.isSidebarCollapsed,
  (collapsed, prev) => {
    if (prev === undefined) return;
    if (prev && !collapsed) {
      scrollIntoViewIfNeeded();
    }
  }
);
</script>

<style scoped>
.bg-cardbg {
  background-color: #242424;
}
</style>
