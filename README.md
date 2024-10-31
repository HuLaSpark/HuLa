<p align="center">
  <img width="350px" height="150px" src="src/assets/logo/hula.png" />
</p>

<p align="center">An Instant Messaging System Built with Tauri, Vite 5, Vue 3, and TypeScript</p>

<div align="center">
  <img src="https://img.shields.io/badge/TypeScript-blue?logo=Typescript&style=flat&logoColor=fff">
  <img src="https://img.shields.io/badge/Vue3-35495E?logo=vue.js&logoColor=4FC08D">
  <img src="https://img.shields.io/badge/Tauri-24C8DB?logo=tauri&logoColor=FFC131">
  <img src="https://img.shields.io/badge/Rust-c57c54?logo=rust&logoColor=E34F26">
  <img src="https://img.shields.io/badge/Vite5-35495E?logo=vite&logoColor=41D1FF">
  <img src="https://img.shields.io/badge/UnoCss-efefef?logo=UnoCss&logoColor=606060">
  <img src="https://img.shields.io/badge/pnpm-909090?logo=pnpm&logoColor=FFC131">
  <img src="https://img.shields.io/badge/Sass-CC6699?logo=sass&logoColor=fff">
  <img src="https://img.shields.io/badge/Design-Naive-059669">
</div>

<p align="center">
  gitee：<a href="https://gitee.com/HulaSpark/HuLa/stargazers"><img src="https://gitee.com/HulaSpark/HuLa/badge/star.svg?theme=gvp" alt="star"></a>
  github：<a href="https://gitee.com/link?target=https://github.com/HulaSpark/HuLa/stargazers"><img src="https://img.shields.io/github/stars/HulaSpark/HuLa" alt="star"></a>
</p>
<p align="center">
  WeChat: <img src="https://img.shields.io/badge/cy2439646234-07C160?logo=wechat&logoColor=fff">
</p>

<p align="center"><a href="README.zh-CN.md">中文</a> | English</p>

## Project Introduction

HuLa is an instant messaging system developed with Tauri, Vite 5, Vue 3, and TypeScript. It leverages the cross-platform capabilities of Tauri and the reactive design of Vue 3, combined with TypeScript's type safety features and the fast build system of Vite 5, to provide users with an efficient, secure, and easy-to-use communication solution.

## Technology Stack

- **Tauri**: Provides a lightweight, high-performance desktop application container, enabling the development of cross-platform desktop applications with a web technology stack. Tauri's design philosophy aims to minimize resource consumption while ensuring security.
- **Vite 5**: A modern front-end build tool that uses native ES module import to offer a fast development server. At the same time, it provides robust support for production builds. Vite 5 is its latest version, bringing more optimizations and features.
- **Vue 3**: A progressive JavaScript framework for building user interfaces. Its Composition API, improved TypeScript integration, and optimizations for mobile platforms make developing complex single-page applications simpler and more efficient.
- **TypeScript**: A superset of JavaScript that adds a type system to the language. It enables catching more errors during development and provides better support from editors.

## Project PreView

![img.png](preview/img.png)

![img_1.png](preview/img_1.png)

![img_2.png](preview/img_2.png)

![img_3.png](preview/img_3.png)

![img_4.png](preview/img_4.png)

![img_5.png](preview/img_5.png)

![img_6.png](preview/img_6.png)

![img_6.png](preview/img_7.png)

![img_6.png](preview/img_8.png)

## Thanks to the following contributors!

<a href="https://github.com/HuLaSpark/HuLa/graphs/contributors">
  <img src="https://opencollective.com/HuLaSpark/contributors.svg?width=890" />
</a>

## Installation and Running

```bash
# Clone the project
git clone https://gitee.com/HuLaSpark/HuLa.git
or
git clone https://github.com/HuLaSpark/HuLa.git

# Enter the project directory
cd HuLa

# Install dependencies
pnpm install

# Run the development server
pnpm run tauri:dev

# Build for production
pnpm run tauri:build
```

## ⚠️ Precautions(macOS Users)

Downloading the installation package on the web page will indicate that the installation package is corrupted, and you may encounter a certificate issue, which is caused by the security mechanism of the macOS system. Follow these steps to solve:

#### 1. Open "System Settings" - "Security & Privacy", as shown in the figure, check the box: Allow apps downloaded from "Any Source" to run:

![img.png](preview/img_9.png)

#### 2. If an error is reported, run the following command in the terminal to resolve the problem:

```bash
sudo xattr -rd com.apple.quarantine the Path To Install The Package/HuLa.app
```

## SubmissionSpecification

use **pnpm run commit** to invoke the _git commit_ interaction and follow the prompts to complete the input and selection of information
