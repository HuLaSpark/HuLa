<p align="center">
  <img width="144px" src="logo.png" />
</p>

<h1 align="center">HuLa</h1>
<p align="center">一个基于Tauri、Vite 5、Vue 3 和 TypeScript 构建的即时通讯系统</p>

<p align="center"><a href="README.md">English</a> | 中文</p>

## 项目介绍

HuLa 是一个基于 Tauri、Vite 5、Vue 3 和 TypeScript 构建的即时通讯系统。它利用了 Tauri 的跨平台能力和 Vue 3 的响应式设计，结合了 TypeScript 的类型安全特性和 Vite 5 的快速构建，为用户提供了一个高效、安全和易用的通讯解决方案。

## 技术栈

- **Tauri**: 为本项目提供了一个轻量级的、高性能的桌面应用容器，使得我们可以使用前端技术栈来开发跨平台的桌面应用。Tauri 的设计哲学是在保证安全性的前提下，尽可能减少资源占用。
- **Vite 5**: Vite 是一个现代化的前端构建工具，它利用原生 ES 模块导入的能力来提供一个快速的开发服务器，与此同时，它也为生产环境打包提供了强大的支持。Vite 5 是其最新的版本，带来了更多的优化和特性。
- **Vue 3**: Vue 3 是一个渐进式JavaScript框架，用于构建用户界面。它的组合式API、更好的TypeScript集成和对移动端的优化使得开发复杂的单页应用变得更加简单和高效。
- **TypeScript**: TypeScript 是 JavaScript 的一个超集，它在 JavaScript 的基础上增加了类型系统。这让我们能够在开发过程中捕获更多的错误，并且提供更好的编辑器支持。

## 项目架构

HuLa 采用了模块化的架构设计，前端使用 Vue 3 构建用户界面，通过 TypeScript 来增强代码的可读性和维护性。在后端，我们使用 Tauri 框架来打包和发布应用，利用它与操作系统的原生集成为用户提供了更多的功能和更高的性能。

## 安装与运行

```bash
# 克隆项目
git clone https://gitee.com/nongyehong/HuLa-IM-Tauri.git
或者
git clone https://github.com/nongyehong/HuLa-IM-Tauri.git

# 进入项目目录
cd HuLa

# 安装依赖
pnpm install

# 运行开发服务器
pnpm run tauri:dev

# 构建生产版本
pnpm run tauri:build