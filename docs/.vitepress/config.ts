import { defineConfig } from "vitepress";

export default defineConfig({
  base: "/docs/",
  outDir: "../.docs-dist",
  title: "Papex",
  ignoreDeadLinks: true,
  description: "Papex 开源学术文献平�? · 文档",
  cleanUrls: true,
  locales: {
    root: {
      label: "简体中�?",
      lang: "zh-CN",
      themeConfig: {
        nav: [
          { text: "首页", link: "/" },
          { text: "快速开�?", link: "/guide/getting-started" },
          { text: "投稿指南", link: "/guide/submission" },
          { text: "在线创作", link: "/guide/writespace" },
          { text: "管理与权�?", link: "/guide/administration" },
          { text: "关于", link: "/about" },
        ],
        sidebar: [
          {
            text: "指南",
            items: [
              { text: "快速开�?", link: "/guide/getting-started" },
              { text: "投稿指南", link: "/guide/submission" },
              { text: "在线创作", link: "/guide/writespace" },
              { text: "管理与权�?", link: "/guide/administration" },
              { text: "配置", link: "/guide/configuration" },
              { text: "部署", link: "/guide/deployment" },
              { text: "API", link: "/guide/api" },
            ],
          },
          { text: "关于 Papex", link: "/about" },
        ],
      },
    },
    en: {
      label: "English",
      lang: "en-US",
      themeConfig: {
        nav: [
          { text: "Home", link: "/en/" },
          { text: "Getting Started", link: "/en/guide/getting-started" },
          { text: "Submission", link: "/en/guide/submission" },
          { text: "Online Authoring", link: "/en/guide/writespace" },
          { text: "Administration", link: "/en/guide/administration" },
          { text: "About", link: "/en/about" },
        ],
        sidebar: [
          {
            text: "Guide",
            items: [
              { text: "Getting Started", link: "/en/guide/getting-started" },
              { text: "Submission", link: "/en/guide/submission" },
              { text: "Online Authoring", link: "/en/guide/writespace" },
              { text: "Administration", link: "/en/guide/administration" },
              { text: "Configuration", link: "/en/guide/configuration" },
              { text: "Deployment", link: "/en/guide/deployment" },
              { text: "API", link: "/en/guide/api" },
            ],
          },
          { text: "About Papex", link: "/en/about" },
        ],
      },
    },
  },
  themeConfig: {
    socialLinks: [
      { icon: "github", link: "https://github.com/" },
    ],
    search: {
      provider: "local",
    },
    footer: {
      message: "Papex �? Apache-2.0 协议开源�?",
      copyright: "Copyright © 2026 Papex",
    },
  },
});
