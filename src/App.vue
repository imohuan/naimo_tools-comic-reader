<template>
  <n-config-provider :theme="darkTheme">
    <n-global-style />
    <n-message-provider>
      <n-dialog-provider>
        <router-view />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { useEventListener } from "@vueuse/core";
import {
  darkTheme,
  NMessageProvider,
  NConfigProvider,
  NGlobalStyle,
  NDialogProvider,
} from "naive-ui";

// 按 ctrl + K 进入调试模式
function handleGlobalKeydown(event: KeyboardEvent) {
  if (event.ctrlKey && event.key === "k") {
    event.preventDefault();
    debugger;
  }
}
useEventListener(window, "keydown", handleGlobalKeydown);
</script>
