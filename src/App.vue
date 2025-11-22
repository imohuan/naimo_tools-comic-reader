<template>
  <n-config-provider :theme="darkTheme">
    <n-global-style />
    <n-message-provider>
      <n-dialog-provider>
        <ComicReaderContent />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import {
  darkTheme,
  NMessageProvider,
  NConfigProvider,
  NGlobalStyle,
  NDialogProvider,
} from "naive-ui";
import ComicReaderContent from "./components/ComicReaderContent.vue";
</script>
