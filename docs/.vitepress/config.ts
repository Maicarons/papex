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
    fr: {
      label: "Français",
      lang: "fr-FR",
      themeConfig: {
        nav: [
          { text: "Accueil", link: "/fr/" },
          { text: "Démarrage", link: "/fr/guide/getting-started" },
          { text: "Soumission", link: "/fr/guide/submission" },
          { text: "Rédaction en ligne", link: "/fr/guide/writespace" },
          { text: "Administration", link: "/fr/guide/administration" },
          { text: "À propos", link: "/fr/about" },
        ],
        sidebar: [
          {
            text: "Guide",
            items: [
              { text: "Démarrage", link: "/fr/guide/getting-started" },
              { text: "Soumission", link: "/fr/guide/submission" },
              { text: "Rédaction en ligne", link: "/fr/guide/writespace" },
              { text: "Administration", link: "/fr/guide/administration" },
              { text: "Configuration", link: "/fr/guide/configuration" },
              { text: "Déploiement", link: "/fr/guide/deployment" },
              { text: "API", link: "/fr/guide/api" },
            ],
          },
          { text: "À propos de Papex", link: "/fr/about" },
        ],
      },
    },
    ko: {
      label: "한국어",
      lang: "ko-KR",
      themeConfig: {
        nav: [
          { text: "홈", link: "/ko/" },
          { text: "시작하기", link: "/ko/guide/getting-started" },
          { text: "투고", link: "/ko/guide/submission" },
          { text: "온라인 집필", link: "/ko/guide/writespace" },
          { text: "관리 및 권한", link: "/ko/guide/administration" },
          { text: "소개", link: "/ko/about" },
        ],
        sidebar: [
          {
            text: "가이드",
            items: [
              { text: "시작하기", link: "/ko/guide/getting-started" },
              { text: "투고", link: "/ko/guide/submission" },
              { text: "온라인 집필", link: "/ko/guide/writespace" },
              { text: "관리 및 권한", link: "/ko/guide/administration" },
              { text: "설정", link: "/ko/guide/configuration" },
              { text: "배포", link: "/ko/guide/deployment" },
              { text: "API", link: "/ko/guide/api" },
            ],
          },
          { text: "Papex 소개", link: "/ko/about" },
        ],
      },
    },
    es: {
      label: "Español",
      lang: "es-ES",
      themeConfig: {
        nav: [
          { text: "Inicio", link: "/es/" },
          { text: "Primeros pasos", link: "/es/guide/getting-started" },
          { text: "Envío", link: "/es/guide/submission" },
          { text: "Redacción en línea", link: "/es/guide/writespace" },
          { text: "Administración", link: "/es/guide/administration" },
          { text: "Acerca de", link: "/es/about" },
        ],
        sidebar: [
          {
            text: "Guía",
            items: [
              { text: "Primeros pasos", link: "/es/guide/getting-started" },
              { text: "Envío", link: "/es/guide/submission" },
              { text: "Redacción en línea", link: "/es/guide/writespace" },
              { text: "Administración", link: "/es/guide/administration" },
              { text: "Configuración", link: "/es/guide/configuration" },
              { text: "Despliegue", link: "/es/guide/deployment" },
              { text: "API", link: "/es/guide/api" },
            ],
          },
          { text: "Acerca de Papex", link: "/es/about" },
        ],
      },
    },
    ru: {
      label: "Русский",
      lang: "ru-RU",
      themeConfig: {
        nav: [
          { text: "Главная", link: "/ru/" },
          { text: "Начало работы", link: "/ru/guide/getting-started" },
          { text: "Подача", link: "/ru/guide/submission" },
          { text: "Онлайн-редактирование", link: "/ru/guide/writespace" },
          { text: "Администрирование", link: "/ru/guide/administration" },
          { text: "О проекте", link: "/ru/about" },
        ],
        sidebar: [
          {
            text: "Руководство",
            items: [
              { text: "Начало работы", link: "/ru/guide/getting-started" },
              { text: "Подача", link: "/ru/guide/submission" },
              { text: "Онлайн-редактирование", link: "/ru/guide/writespace" },
              { text: "Администрирование", link: "/ru/guide/administration" },
              { text: "Конфигурация", link: "/ru/guide/configuration" },
              { text: "Развертывание", link: "/ru/guide/deployment" },
              { text: "API", link: "/ru/guide/api" },
            ],
          },
          { text: "О Papex", link: "/ru/about" },
        ],
      },
    },
    ar: {
      label: "العربية",
      lang: "ar",
      themeConfig: {
        nav: [
          { text: "الرئيسية", link: "/ar/" },
          { text: "البدء", link: "/ar/guide/getting-started" },
          { text: "تقديم البحث", link: "/ar/guide/submission" },
          { text: "التأليف عبر الإنترنت", link: "/ar/guide/writespace" },
          { text: "الإدارة", link: "/ar/guide/administration" },
          { text: "حول", link: "/ar/about" },
        ],
        sidebar: [
          {
            text: "الدليل",
            items: [
              { text: "البدء", link: "/ar/guide/getting-started" },
              { text: "تقديم البحث", link: "/ar/guide/submission" },
              { text: "التأليف عبر الإنترنت", link: "/ar/guide/writespace" },
              { text: "الإدارة", link: "/ar/guide/administration" },
              { text: "الإعدادات", link: "/ar/guide/configuration" },
              { text: "النشر", link: "/ar/guide/deployment" },
              { text: "API", link: "/ar/guide/api" },
            ],
          },
          { text: "حول Papex", link: "/ar/about" },
        ],
      },
    },
    de: {
      label: "Deutsch",
      lang: "de-DE",
      themeConfig: {
        nav: [
          { text: "Startseite", link: "/de/" },
          { text: "Erste Schritte", link: "/de/guide/getting-started" },
          { text: "Einreichung", link: "/de/guide/submission" },
          { text: "Online-Autorenschaft", link: "/de/guide/writespace" },
          { text: "Verwaltung", link: "/de/guide/administration" },
          { text: "Über", link: "/de/about" },
        ],
        sidebar: [
          {
            text: "Leitfaden",
            items: [
              { text: "Erste Schritte", link: "/de/guide/getting-started" },
              { text: "Einreichung", link: "/de/guide/submission" },
              { text: "Online-Autorenschaft", link: "/de/guide/writespace" },
              { text: "Verwaltung", link: "/de/guide/administration" },
              { text: "Konfiguration", link: "/de/guide/configuration" },
              { text: "Bereitstellung", link: "/de/guide/deployment" },
              { text: "API", link: "/de/guide/api" },
            ],
          },
          { text: "Über Papex", link: "/de/about" },
        ],
      },
    },
    it: {
      label: "Italiano",
      lang: "it-IT",
      themeConfig: {
        nav: [
          { text: "Home", link: "/it/" },
          { text: "Per iniziare", link: "/it/guide/getting-started" },
          { text: "Invio", link: "/it/guide/submission" },
          { text: "Scrittura online", link: "/it/guide/writespace" },
          { text: "Amministrazione", link: "/it/guide/administration" },
          { text: "Informazioni", link: "/it/about" },
        ],
        sidebar: [
          {
            text: "Guida",
            items: [
              { text: "Per iniziare", link: "/it/guide/getting-started" },
              { text: "Invio", link: "/it/guide/submission" },
              { text: "Scrittura online", link: "/it/guide/writespace" },
              { text: "Amministrazione", link: "/it/guide/administration" },
              { text: "Configurazione", link: "/it/guide/configuration" },
              { text: "Distribuzione", link: "/it/guide/deployment" },
              { text: "API", link: "/it/guide/api" },
            ],
          },
          { text: "Informazioni su Papex", link: "/it/about" },
        ],
      },
    },
    ja: {
      label: "日本語",
      lang: "ja-JP",
      themeConfig: {
        nav: [
          { text: "ホーム", link: "/ja/" },
          { text: "はじめに", link: "/ja/guide/getting-started" },
          { text: "投稿", link: "/ja/guide/submission" },
          { text: "オンライン執筆", link: "/ja/guide/writespace" },
          { text: "管理と権限", link: "/ja/guide/administration" },
          { text: "概要", link: "/ja/about" },
        ],
        sidebar: [
          {
            text: "ガイド",
            items: [
              { text: "はじめに", link: "/ja/guide/getting-started" },
              { text: "投稿", link: "/ja/guide/submission" },
              { text: "オンライン執筆", link: "/ja/guide/writespace" },
              { text: "管理と権限", link: "/ja/guide/administration" },
              { text: "設定", link: "/ja/guide/configuration" },
              { text: "デプロイ", link: "/ja/guide/deployment" },
              { text: "API", link: "/ja/guide/api" },
            ],
          },
          { text: "Papexについて", link: "/ja/about" },
        ],
      },
    },
    pt: {
      label: "Português",
      lang: "pt-BR",
      themeConfig: {
        nav: [
          { text: "Início", link: "/pt/" },
          { text: "Primeiros passos", link: "/pt/guide/getting-started" },
          { text: "Submissão", link: "/pt/guide/submission" },
          { text: "Redação on-line", link: "/pt/guide/writespace" },
          { text: "Administração", link: "/pt/guide/administration" },
          { text: "Sobre", link: "/pt/about" },
        ],
        sidebar: [
          {
            text: "Guia",
            items: [
              { text: "Primeiros passos", link: "/pt/guide/getting-started" },
              { text: "Submissão", link: "/pt/guide/submission" },
              { text: "Redação on-line", link: "/pt/guide/writespace" },
              { text: "Administração", link: "/pt/guide/administration" },
              { text: "Configuração", link: "/pt/guide/configuration" },
              { text: "Implantação", link: "/pt/guide/deployment" },
              { text: "API", link: "/pt/guide/api" },
            ],
          },
          { text: "Sobre o Papex", link: "/pt/about" },
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
