import { createRouter, createWebHashHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/local",
  },
  {
    path: "/local",
    name: "LocalReader",
    component: () => import("@/views/ComicReaderContent.vue"),
  },
  {
    path: "/jmcomic",
    name: "JMComicReader",
    component: () => import("@/views/JMComicReader/JMComicReader.vue"),
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
