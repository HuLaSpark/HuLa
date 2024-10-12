# [2.2.0](https://github.com/HuLaSpark/HuLa/compare/v2.1.0...v2.2.0) (2024-10-08)


### Bug Fixes

* **common:** :bug: 修复插件下载模块进度问题 ([85bc525](https://github.com/HuLaSpark/HuLa/commit/85bc525c1191d65eee0aef0592bf6a2e47746244))
* **component:** :bug: 修复ait弹出框问题 ([b40d233](https://github.com/HuLaSpark/HuLa/commit/b40d233e999143f734b9a10715f872fade33f0c4))


### Features

* **common:** :sparkles: 在设置中新增指引视频 ([e8a8acf](https://github.com/HuLaSpark/HuLa/commit/e8a8acf99007383df3f898947da9798cf6b8c376))
* **component:** :sparkles: 新增苹方作为默认字体 ([aa1e07b](https://github.com/HuLaSpark/HuLa/commit/aa1e07b521f2f991d25a115d489c2b7a810c3313)), closes [#15](https://github.com/HuLaSpark/HuLa/issues/15)
* **style:** :sparkles: 完善超级变变变样式更改 ([4b25751](https://github.com/HuLaSpark/HuLa/commit/4b25751e6e6aa0706090c3e8cd3c6bffa4d61468))
* **style:** :sparkles: 新增超级变变变功能(Beta) ([16b0879](https://github.com/HuLaSpark/HuLa/commit/16b08797eceff2779a561dfb1d09bb31aa481473))


### Performance Improvements

* :zap: 发布v2.2.0版本 ([2a47187](https://github.com/HuLaSpark/HuLa/commit/2a47187f8726b6e38ffbf76bda034e6daeaebbd8))
* **style:** :zap: 优化聊天框内主题适配 ([60055af](https://github.com/HuLaSpark/HuLa/commit/60055afd1a58e12700c2e68995aa7068168b6318))
* **style:** :zap: 优化顶部栏和其他内容的一些样式 ([90929a4](https://github.com/HuLaSpark/HuLa/commit/90929a44312af5b93344c4169c0fc77b5d03fe9b))


### BREAKING CHANGES

* **style:** 修复mac端图标和windows端图标的大小不一致问题｜重新单独配置不同系统的不同tauri.conf.json文件
* **component:** 使用本地连接icon



# [2.1.0](https://github.com/HuLaSpark/HuLa/compare/v2.0.0...v2.1.0) (2024-09-13)


### Bug Fixes

* **component:** :bug: 修复windows上的样式问题 ([bb6a9d4](https://github.com/HuLaSpark/HuLa/commit/bb6a9d440db4777989d9a922a5135350e2dbf894))
* **component:** :bug: 修复系统托盘功能和一些样式问题 ([18277ef](https://github.com/HuLaSpark/HuLa/commit/18277ef0f1ce286b77b91dbc8c6ea8a628eba7d3))
* **layout:** :bug: 修复ts类型错误导致打包出差问题 ([0d7f7e0](https://github.com/HuLaSpark/HuLa/commit/0d7f7e024d9404fe5fe6829504594a902c27c501))
* **style:** :bug: 统一修复svg点击时有轮廓问题 ([ce68fa1](https://github.com/HuLaSpark/HuLa/commit/ce68fa134368b34802d5b101a1f98a2493f7120b))
* **system:** :bug: 修复mac端右键菜单透明度问题 ([39d795f](https://github.com/HuLaSpark/HuLa/commit/39d795ff655afd699340d3021a0b471c3060b11c))
* **system:** :bug: 修复win下窗口高度不一致问题 ([30bb3de](https://github.com/HuLaSpark/HuLa/commit/30bb3de5d10ffea949c32b505f6501b3f7d0f573))


### Features

* chatbot删除全部会话功能和右键菜单重命名 ([3426c5f](https://github.com/HuLaSpark/HuLa/commit/3426c5f24fafe66c3543ee8f4172d2dae05740e4))
* **component:** :sparkles: 新增插件功能(Bate) ([392b7c9](https://github.com/HuLaSpark/HuLa/commit/392b7c99bd38fd2f298e7732499dc7510e4d286a))


### Performance Improvements

* :zap: 优化mac标签栏 ([a7c587d](https://github.com/HuLaSpark/HuLa/commit/a7c587d74b771e32e3b61eaef2ba5c902c0e4f6f))
* **component:** :zap: 升级插件版本内容及其样式 ([8d65ca1](https://github.com/HuLaSpark/HuLa/commit/8d65ca198fa8a01252e0dc7f07f4bd6c796dbfe1))


### BREAKING CHANGES

* **system:** 新增mac端弹出框的关闭按钮



# [2.0.0](https://github.com/HuLaSpark/HuLa/compare/v1.6.0...v2.0.0) (2024-08-15)


### Bug Fixes

* **system:** :bug: 修复mac端兼容问题 ([0daef59](https://github.com/HuLaSpark/HuLa/commit/0daef59a9f41326a8e82885c3b84857ec3761e92))


### Features

* **common:** :sparkles: 新增修改字体功能 ([6bd6f64](https://github.com/HuLaSpark/HuLa/commit/6bd6f641f1c012dd53bd7dcb5cf4a314bf7d527b))
* **component:** :sparkles: 新增是否启用界面阴影功能、收缩页面按钮功能 ([085a773](https://github.com/HuLaSpark/HuLa/commit/085a773967fd0a26525a2f87dc1d8fddb8d71f1a))
* **view:** :sparkles: 新增搜索页面功能 ([866ba89](https://github.com/HuLaSpark/HuLa/commit/866ba89b93d1a2587afb16fac745779093b9af19))
* **view:** :sparkles: 新增锁屏功能 ([1407343](https://github.com/HuLaSpark/HuLa/commit/14073438d5a9dc82117a84f97b5bd8f239fdfcd4))


### Performance Improvements

* :zap: 优化锁屏页面功能 ([85b6cad](https://github.com/HuLaSpark/HuLa/commit/85b6cad03fdcd538adbdae9fc2e63e0ef72b465a))
* **system:** :zap: 升级tauri-v2版本 ([57dcad1](https://github.com/HuLaSpark/HuLa/commit/57dcad1e9306421c161d555181a9deda48f5685e))



# [1.6.0](https://github.com/HuLaSpark/HuLa/compare/v1.5.0...v1.6.0) (2024-07-03)


### Bug Fixes

* **components:** :bug: 修复回复功能缺陷 ([af50422](https://github.com/HuLaSpark/HuLa/commit/af5042261bc598a68b94db780a332ab38d5a577c))
* **hook:** :bug: 修复回复功能不显示问题 ([9d0fee7](https://github.com/HuLaSpark/HuLa/commit/9d0fee7e5eb0919846d526b1f5a331d3a47f68d8))
* **rust:** :bug: 修复mac系统背景玻璃拟态导致的问题 (#IA5AO8) ([89a7605](https://github.com/HuLaSpark/HuLa/commit/89a7605055d3ab7de83491e1745773458237d7d3)), closes [#IA5AO8](https://github.com/HuLaSpark/HuLa/issues/IA5AO8)


### Features

* :sparkles: 发布v1.6.0版本 ([71a1dd9](https://github.com/HuLaSpark/HuLa/commit/71a1dd93833d4c9534945f28fe636115ef59e862))
* **component:** :sparkles: 新增GPT欢迎页面，完善设置页面 ([9b771e0](https://github.com/HuLaSpark/HuLa/commit/9b771e02ec31af1238f9662e839df6197f501376))
* **component:** :sparkles: 新增GPT组件 ([7260840](https://github.com/HuLaSpark/HuLa/commit/7260840f4b50bcbb4dad8645a84ade8280de4036))
* **component:** :sparkles: 新增GPT页面设置功能 ([4c85b4a](https://github.com/HuLaSpark/HuLa/commit/4c85b4afccdafe83aa0fcbd53e94ef5fc63a7a70))
* **components:** :sparkles: 完善右键功能的显示资料 ([cf4820b](https://github.com/HuLaSpark/HuLa/commit/cf4820bffbdee50fc1e7b44c72b51cd2c4d80091))
* **components:** :sparkles: 实现群聊回复表情功能 ([1fb3530](https://github.com/HuLaSpark/HuLa/commit/1fb3530cbdceef702430b272b99d3e99277c52d0))
* **style:** :sparkles: 新增项目版本信息打印 ([e17cb7c](https://github.com/HuLaSpark/HuLa/commit/e17cb7c24a233417ab34a1de3b04cbdc32ebc2e0))
* **view:** :sparkles: 新增GPT首页推荐功能样式 ([e927a95](https://github.com/HuLaSpark/HuLa/commit/e927a95fa4f95da7299459941b00d2f633217bca))


### Performance Improvements

* **components:** :zap: 优化群聊回复表情功能 ([0c4615d](https://github.com/HuLaSpark/HuLa/commit/0c4615d4135fb3f740cb88f8f38502c9fc90bc5d))
* **components:** :zap: 优化表情回应 ([94d2cb1](https://github.com/HuLaSpark/HuLa/commit/94d2cb1fec8db8901ffc85cdf8680919c58abf11))
* **services:** :zap: 优化请求接口以及消息提示 ([0355f97](https://github.com/HuLaSpark/HuLa/commit/0355f976b854d96e613160d2bf6cc7e5605ea0ac))
* **system:** :zap: 对接后端服务 ([ea4b82b](https://github.com/HuLaSpark/HuLa/commit/ea4b82be25a058a198716cebcf8becfcf252819c))
* **views:** :zap: 优化页面收缩功能 ([31f7e17](https://github.com/HuLaSpark/HuLa/commit/31f7e1732cbe571e3f53564c57a339812b2c1a5b))



# [1.5.0](https://github.com/HuLaSpark/HuLa/compare/v1.4.0...v1.5.0) (2024-04-19)



# [1.4.0](https://github.com/HuLaSpark/HuLa/compare/v1.3.0-beta...v1.4.0) (2024-04-01)



# [1.3.0-beta](https://github.com/HuLaSpark/HuLa/compare/v1.2.9-alpha...v1.3.0-beta) (2024-03-12)



## 1.2.9-alpha (2024-03-08)



