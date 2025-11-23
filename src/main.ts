/// <reference path="../typings/naimo.d.ts" />
/// <reference path="./types/comic-reader.d.ts" />

import { createApp } from "vue";
import { createPinia } from "pinia";
import native from "naive-ui";
import router from "./router";
import App from "./App.vue";
import "./style.css";

// ==================== 热重载 ====================
if (import.meta.hot) {
  import.meta.hot.on("preload-changed", async (data) => {
    console.log("📝 检测到 preload 变化:", data);
    console.log("🔨 正在触发 preload 构建...");
    try {
      const response = await fetch("/__preload_build");
      const result = await response.json();
      if (result.success) {
        console.log("✅ Preload 构建完成");
        await window.naimo.hot();
        console.log("🔄 Preload 热重载完成");
        location.reload();
      } else {
        console.error("❌ Preload 构建失败");
      }
    } catch (error) {
      console.error("❌ 触发 preload 构建失败:", error);
    }
  });
}

// 创建 Pinia 实例
const pinia = createPinia();

// 创建 Vue 应用
const app = createApp(App);

// 使用 Pinia
app.use(pinia);

// 使用路由
app.use(router);

app.use(native);

// 挂载应用
app.mount("#app");

// 记录初始化
if (window.naimo) {
  window.naimo.log.info("漫画阅读器初始化完成");
}
