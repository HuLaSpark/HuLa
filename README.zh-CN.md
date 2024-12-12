<p align="center">
  <img width="350px" height="150px" src="src/assets/logo/hula.png" />
</p>

<p align="center">一个基于Tauri、Vite 5、Vue 3 和 TypeScript 构建的即时通讯系统</p>

<div align="center">
  <a href="https://app.fossa.com/projects/git%2Bgithub.com%2FHuLaSpark%2FHuLa?ref=badge_shield"><img src="https://app.fossa.com/api/projects/git%2Bgithub.com%2FHuLaSpark%2FHuLa.svg?type=shield" alt=""></a>
  <a href="https://www.bestpractices.dev/zh-CN/projects/9692"><img src="https://bestpractices.coreinfrastructure.org/projects/9692/badge" alt="CI"></a>
  <img src="https://img.shields.io/badge/TypeScript-blue?logo=Typescript&style=flat&logoColor=fff">
  <img src="https://img.shields.io/badge/Vue3-35495E?logo=vue.js&logoColor=4FC08D">
  <img src="https://img.shields.io/badge/Tauri-24C8DB?logo=tauri&logoColor=FFC131">
  <img src="https://img.shields.io/badge/Rust-c57c54?logo=rust&logoColor=E34F26">
  <img src="https://img.shields.io/badge/Vite5-35495E?logo=vite&logoColor=41D1FF">
  <img src="https://img.shields.io/badge/UnoCss-efefef?logo=UnoCss&logoColor=606060">
  <img src="https://img.shields.io/badge/pnpm-909090?logo=pnpm&logoColor=FFC131">
  <img src="https://img.shields.io/badge/Sass-CC6699?logo=sass&logoColor=fff">
  <img src="https://img.shields.io/badge/UI组件库-Naive-059669">
</div>

<p align="center">
  gitee：<a href="https://gitee.com/HulaSpark/HuLa/stargazers"><img src="https://gitee.com/HulaSpark/HuLa/badge/star.svg?theme=gvp" alt="star"></a>
  github：<a href="https://gitee.com/link?target=https://github.com/HulaSpark/HuLa/stargazers"><img src="https://img.shields.io/github/stars/HulaSpark/HuLa" alt="star"></a>
</p>
<p align="center">
  微信: <img src="https://img.shields.io/badge/cy2439646234-07C160?logo=wechat&logoColor=fff">
</p>

<p align="center"><a href="README.md">English</a> | 中文</p>

## 项目介绍

HuLa 是一个基于 Tauri、Vite 5、Vue 3 和 TypeScript 构建的即时通讯系统。它利用了 Tauri 的跨平台能力和 Vue 3 的响应式设计，结合了 TypeScript 的类型安全特性和 Vite 5 的快速构建，为用户提供了一个高效、安全和易用的通讯解决方案。

## 技术栈

- **Tauri**: 为本项目提供了一个轻量级的、高性能的桌面应用容器，使得我们可以使用前端技术栈来开发跨平台的桌面应用。Tauri 的设计哲学是在保证安全性的前提下，尽可能减少资源占用。
- **Vite 5**: Vite 是一个现代化的前端构建工具，它利用原生 ES 模块导入的能力来提供一个快速的开发服务器，与此同时，它也为生产环境打包提供了强大的支持。Vite 5 是其最新的版本，带来了更多的优化和特性。
- **Vue 3**: Vue 3 是一个渐进式JavaScript框架，用于构建用户界面。它的组合式API、更好的TypeScript集成和对移动端的优化使得开发复杂的单页应用变得更加简单和高效。
- **TypeScript**: TypeScript 是 JavaScript 的一个超集，它在 JavaScript 的基础上增加了类型系统。这让我们能够在开发过程中捕获更多的错误，并且提供更好的编辑器支持。

## 项目预览

![img.png](preview/img.png)

![img_1.png](preview/img_1.png)

![img_2.png](preview/img_2.png)

![img_3.png](preview/img_3.png)

![img_4.png](preview/img_4.png)

![img_5.png](preview/img_5.png)

![img_6.png](preview/img_6.png)

![img_6.png](preview/img_7.png)

![img_6.png](preview/img_8.png)

## 感谢以下贡献者们！

<a href="https://github.com/HuLaSpark/HuLa/graphs/contributors">
  <img src="https://opencollective.com/HuLaSpark/contributors.svg?width=890" />
</a>

## 安装与运行

```bash
# 克隆项目
git clone https://gitee.com/HuLaSpark/HuLa.git
或者
git clone https://github.com/HuLaSpark/HuLa.git

# 进入项目目录
cd HuLa

# 安装依赖
pnpm install

# 运行开发服务器
pnpm run tauri:dev

# 构建生产版本
pnpm run tauri:build
```

## ⚠️ 注意事项(macOS用户)

网页上下载安装包会提示安装包已损坏，可能会遇到证书问题，这是因为 macOS 系统的安全机制导致的。请按照以下步骤解决：

#### 1. 打开 “系统设置” - “安全性与隐私”，如图勾选：允许 “任何来源” 下载的 App 运行：

![img.png](preview/img_9.png)

#### 2. 如果还报错，请在终端执行以下命令解决：

```bash
sudo xattr -rd com.apple.quarantine 你的安装包路径/HuLa.app
```

## 提交规范

执行 **pnpm run commit** 唤起 _git commit_ 交互，根据提示完成信息的输入和选择

## 免责声明

1. 本项目是作为一个开源项目提供的，开发者在法律允许的范围内不对软件的功能性、安全性或适用性提供任何形式的明示或暗示的保证
2. 用户明确理解并同意，使用本软件的风险完全由用户自己承担，软件以"现状"和"现有"基础提供。开发者不提供任何形式的担保，无论是明示还是暗示的，包括但不限于适销性、特定用途的适用性和非侵权的担保
3. 在任何情况下，开发者或其供应商都不对任何直接的、间接的、偶然的、特殊的、惩罚性的或后果性的损害承担责任，包括但不限于使用本软件产生的利润损失、业务中断、个人信息泄露或其他商业损害或损失
4. 所有在本项目上进行二次开发的用户，都需承诺将本软件用于合法目的，并自行负责遵守当地的法律和法规
5. 开发者有权在任何时间修改软件的功能或特性，以及本免责声明的任何部分，并且这些修改可能会以软件更新的形式体现

**本免责声明的最终解释权归开发者所有**


## License
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FHuLaSpark%2FHuLa.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2FHuLaSpark%2FHuLa?ref=badge_large)
