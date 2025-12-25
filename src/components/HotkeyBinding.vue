<template>
  <div class="flex items-center justify-between py-2 px-3 border border-gray-700 rounded">
    <span class="text-sm">{{ label }}</span>
    <div class="flex items-center gap-2">
      <n-button v-if="!isListening" size="small" @click="startListening">
        {{ formatKey(currentKey) }}
      </n-button>
      <div v-else class="flex items-center gap-2">
        <n-button size="small" @click="stopListening"> 按键盘设置... </n-button>
        <n-button size="small" text @click="stopListening"> 取消 </n-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const props = defineProps<{
  label: string;
  actionKey: string;
  currentKey: string;
}>();

const emit = defineEmits<{
  update: [actionKey: string, newKey: string];
}>();

const isListening = ref(false);

function formatKey(key: string): string {
  // 格式化按键显示
  const keyMap: Record<string, string> = {
    ArrowDown: "↓",
    ArrowUp: "↑",
    ArrowLeft: "←",
    ArrowRight: "→",
    Space: "Space",
    BracketLeft: "[",
    BracketRight: "]",
    KeyN: "N",
    KeyP: "P",
    ControlLeft: "Ctrl",
    ControlRight: "Ctrl",
    ShiftLeft: "Shift",
    ShiftRight: "Shift",
    AltLeft: "Alt",
    AltRight: "Alt",
    MetaLeft: "Meta",
    MetaRight: "Meta",
  };

  return keyMap[key] || key.replace(/^Key/, "").replace(/^Digit/, "");
}

function startListening() {
  isListening.value = true;
}

function stopListening() {
  isListening.value = false;
}

function handleKeydown(e: KeyboardEvent) {
  if (!isListening.value) return;

  e.preventDefault();
  e.stopPropagation();

  // 忽略功能键单独按下
  const isModifierKey = ["Control", "Shift", "Alt", "Meta"].includes(e.key);
  if (isModifierKey && !e.code.includes("Left") && !e.code.includes("Right")) {
    return;
  }

  // 使用 code 而不是 key，因为 code 更稳定
  const keyCode = e.code;

  // 如果按了 Escape，取消设置
  if (keyCode === "Escape") {
    stopListening();
    return;
  }

  // 保存新快捷键
  emit("update", props.actionKey, keyCode);
  stopListening();
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown, true);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown, true);
});
</script>
