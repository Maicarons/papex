import { defineConfig } from "vitepress";

// base 默认 /docs/ 用于 Next.js 在 /docs 路由提供文档（Vercel/自托管）。
// 部署到 GitHub Pages 项目站点（根路径 /papex/）时，由工作流传入 VITEPRESS_BASE 覆盖。
const base = process.env.VITEPRESS_BASE ?? "/docs/";

export default defineConfig({
  base,
  outDir: "../.docs-dist",
  title: "Papex",
  ignoreDeadLinks: true,
  description: "Papex open-source academic literature platform · Docs",
  cleanUrls: true,
  locales: {
    root: {
      label: "English",
      lang: "en-US",
      themeConfig: {
        nav: [
          { text: "Home", link: "/" },
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "Submission", link: "/guide/submission" },
          { text: "Online Authoring", link: "/guide/writespace" },
          { text: "Administration", link: "/guide/administration" },
          { text: "About", link: "/about" },
        ],
        sidebar: [
          {
            text: "Guide",
            items: [
              { text: "Getting Started", link: "/guide/getting-started" },
              { text: "Submission", link: "/guide/submission" },
              { text: "Online Authoring", link: "/guide/writespace" },
              { text: "Administration", link: "/guide/administration" },
              { text: "Configuration", link: "/guide/configuration" },
              { text: "Deployment", link: "/guide/deployment" },
              { text: "API", link: "/guide/api" },
            ],
          },
          { text: "About Papex", link: "/about" },
        ],
      },
    },
    zh: {
      label: "简体中文",
      lang: "zh-CN",
      themeConfig: {
        nav: [
          { text: "首页", link: "/zh/" },
          { text: "快速开始", link: "/zh/guide/getting-started" },
          { text: "投稿指南", link: "/zh/guide/submission" },
          { text: "在线创作", link: "/zh/guide/writespace" },
          { text: "管理与权限", link: "/zh/guide/administration" },
          { text: "关于", link: "/zh/about" },
        ],
        sidebar: [
          {
            text: "指南",
            items: [
              { text: "快速开始", link: "/zh/guide/getting-started" },
              { text: "投稿指南", link: "/zh/guide/submission" },
              { text: "在线创作", link: "/zh/guide/writespace" },
              { text: "管理与权限", link: "/zh/guide/administration" },
              { text: "配置", link: "/zh/guide/configuration" },
              { text: "部署", link: "/zh/guide/deployment" },
              { text: "API", link: "/zh/guide/api" },
            ],
          },
          { text: "关于 Papex", link: "/zh/about" },
        ],
      },
    },
  },
  themeConfig: {
    logo: "/logo.svg",
    socialLinks: [
      { icon: "github", link: "https://github.com/Maicarons/papex" },
    ],
    search: {
      provider: "local",
    },
    footer: {
      message: "Papex is open source under the Apache-2.0 license.",
      copyright: "Copyright © 2026 Papex",
    },
  },
});
