<template>
  <div class="favorite-toggle inline-flex">
    <n-popconfirm
      v-if="favorited"
      trigger="click"
      :placement="placement"
      :positive-text="confirmPositiveText"
      :negative-text="confirmNegativeText"
      :disabled="loading"
      @positive-click="handleRemove"
    >
      <template #trigger>
        <button
          type="button"
          class="favorite-toggle__btn favorite-toggle__btn--active"
          :class="{ 'favorite-toggle__btn--disabled': loading }"
          :disabled="loading"
          @click.stop
          :title="removeTitle"
          aria-pressed="true"
        >
          <svg
            class="favorite-toggle__icon"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path :d="heartPath" />
          </svg>
        </button>
      </template>
      {{ removeConfirmText }}
    </n-popconfirm>
    <button
      v-else
      type="button"
      class="favorite-toggle__btn"
      :class="{ 'favorite-toggle__btn--disabled': loading }"
      :disabled="loading"
      @click.stop="handleAdd"
      :title="addTitle"
      aria-pressed="false"
    >
      <svg
        class="favorite-toggle__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <path :d="heartPath" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  favorited: boolean;
  loading?: boolean;
  placement?: "top" | "bottom" | "left" | "right";
  addTitle?: string;
  removeTitle?: string;
  removeConfirmText?: string;
  confirmPositiveText?: string;
  confirmNegativeText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  favorited: false,
  loading: false,
  placement: "top",
  addTitle: "加入收藏",
  removeTitle: "取消收藏",
  removeConfirmText: "确认取消收藏？",
  confirmPositiveText: "确认",
  confirmNegativeText: "取消",
});

const emit = defineEmits<{
  (e: "add"): void;
  (e: "remove"): void;
}>();

const heartPath =
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

function handleAdd() {
  if (!props.loading) {
    emit("add");
  }
}

function handleRemove() {
  if (!props.loading) {
    emit("remove");
  }
}
</script>

<style scoped>
.favorite-toggle__btn {
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  background-color: rgba(0, 0, 0, 0.6);
  color: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border: none;
  outline: none;
}

.favorite-toggle__btn:not(.favorite-toggle__btn--disabled):hover {
  color: #fff;
  background-color: rgba(255, 255, 255, 0.15);
}

.favorite-toggle__btn--active {
  color: #f87171;
}

.favorite-toggle__btn--active:not(.favorite-toggle__btn--disabled):hover {
  color: #f87171;
  background-color: rgba(0, 0, 0, 0.2);
}

.favorite-toggle__btn--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.favorite-toggle__icon {
  width: 1.25rem;
  height: 1.25rem;
}
</style>
