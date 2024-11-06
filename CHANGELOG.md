

## [2.5.3](https://github.com/HuLaSpark/HuLa/compare/v2.5.2...v2.5.3) (2024-11-06)


### 🐛 Bug Fixes | Bug 修复

* **component:** :bug: 修复输入框换行不兼容webkit的问题 ([345d830](https://github.com/HuLaSpark/HuLa/commit/345d83068711df087dd0ba403446c739151a11dd))
* **layout:** :bug: 修复聊天框改变宽度的时候可以选中文本的问题 ([56d79cc](https://github.com/HuLaSpark/HuLa/commit/56d79ccc8ba015a313eabcd938757f35d1d840a4))
* **layout:** :bug: 修复选择了图片不显示在输入框中的bug ([c7cdac6](https://github.com/HuLaSpark/HuLa/commit/c7cdac69ce6fa185489dcb480991e3a268fec99d))
* **service:** :bug: 修复请求接口bug ([f3723d4](https://github.com/HuLaSpark/HuLa/commit/f3723d4e5a2342314ce6e85931a49f1ddfecab0b))


### ⚡️ Performance Improvements | 性能优化

* **component:** :zap: 优化右键菜单功能 ([7b53029](https://github.com/HuLaSpark/HuLa/commit/7b530297ac37122ead00a15864e16a73a5547d04))

## [2.5.2](https://github.com/HuLaSpark/HuLa/compare/v2.5.1...v2.5.2) (2024-10-31)

### 🐛 Bug Fixes | Bug 修复

- **build:** :bug: 升级wry版本修复mac安装报错问题 ([fefa2f9](https://github.com/HuLaSpark/HuLa/commit/fefa2f970305839064764cd1d82a0d8e557f3148))
- **component:** :bug: 修复聊天框内右键菜单问题 ([e59630b](https://github.com/HuLaSpark/HuLa/commit/e59630b70ed0d245174c97136d502bb63cac03ec))

## [2.5.1](https://github.com/HuLaSpark/HuLa/compare/v2.5.0...v2.5.1) (2024-10-29)

### 🐛 Bug Fixes | Bug 修复

- **build:** :bug: 修复release配置导致打包的问题 ([4cd9a93](https://github.com/HuLaSpark/HuLa/commit/4cd9a9355d3c5cbd9101b709a839017c92538bfd))
- **build:** :bug: 添加不同编译版本，以修复不同架构安装出错问题 ([19fb138](https://github.com/HuLaSpark/HuLa/commit/19fb138d51afd2884c1abd7fc62ae47762c2678b))
- **global:** :bug: 修复艾特弹窗在mac下高度问题导致不显示 ([8a18e84](https://github.com/HuLaSpark/HuLa/commit/8a18e84ce781a7a987575ed9f27d2a8eff334bb6))
- **layout:** :bug: 修复更新弹窗显示更新的内容 ([bd7f6fb](https://github.com/HuLaSpark/HuLa/commit/bd7f6fbe7f27e69275e54c776d761a1751289bf0))
- **view:** :bug: 修复消息输入框部分bug ([24b8a51](https://github.com/HuLaSpark/HuLa/commit/24b8a517d85f5895ae66db64ac7d6d8ae547cad4))

## [2.5.0](https://github.com/HuLaSpark/HuLa/compare/v2.4.0...v2.5.0) (2024-10-27)

### ⚠ BREAKING CHANGES

- **util:** http请求异常bug

### ✨ Features | 新功能

- **layout:** :sparkles: 自动更新增加进度条 ([4ee3e2b](https://github.com/HuLaSpark/HuLa/commit/4ee3e2b8a36b34cdc996a8b538bddea61bbf1af2))

### 🐛 Bug Fixes | Bug 修复

- **api:** 修改websocket请求地址, 修改请求方式采用fetch处理 ([e55f863](https://github.com/HuLaSpark/HuLa/commit/e55f86385fb8e25e826ae57341e0d818f5fe34b2))
- **build:** :bug: 修复因为类型导致打包出错 ([db26e6b](https://github.com/HuLaSpark/HuLa/commit/db26e6bdf65003c1263574464a194236aa341129))
- **layout:** :bug: 修复更新进度条显示异常bug ([45e2bfc](https://github.com/HuLaSpark/HuLa/commit/45e2bfce669c76cbb72be641febf59509b3e6204))
- **service:** :bug: 修复打包后访问不了正式服务器的bug ([c8d42ab](https://github.com/HuLaSpark/HuLa/commit/c8d42ab31e1e6b41b3a30f1664d1be0c28d4ed36))
- **service:** :bug: 修复请求体包裹多层data的问题 ([d97d24f](https://github.com/HuLaSpark/HuLa/commit/d97d24f1c1d554e5477b221c725e45100655c0e0))
- **util:** :bug: http请求异常bug ([6e82a09](https://github.com/HuLaSpark/HuLa/commit/6e82a099a2a51ea08548c4d5da496393a94b7b05))
- **view:** :bug: 修复点击右侧布局页面时候不跳转回消息页 ([be0edf9](https://github.com/HuLaSpark/HuLa/commit/be0edf974778b58fe5af9ec030d9927999a6d7bb))

## [2.4.0](https://github.com/HuLaSpark/HuLa/compare/v2.3.0...v2.4.0) (2024-10-24)

### ✨ Features | 新功能

- **ide:** :sparkles: 新增.idea文件提供idea的项目图标 ([84b6039](https://github.com/HuLaSpark/HuLa/commit/84b6039a81370d9d71c8394e6dbb4145b1fb7f1e))
- **layout:** :sparkles: 菜单优化|插件优化|新增菜单显示模式切换 ([78f09c5](https://github.com/HuLaSpark/HuLa/commit/78f09c5bb9449f5546823f71265c247c137a9e55))
- **setting:** :sparkles: 新增开机启动功能 ([91ad538](https://github.com/HuLaSpark/HuLa/commit/91ad538f72909e16f232310a58a5b7610dfd08f0))

### 🐛 Bug Fixes | Bug 修复

- **layout:** :bug: 代码修复 ([96ad89c](https://github.com/HuLaSpark/HuLa/commit/96ad89c05d2b9d104b4a80f064892d63381441a2))
- **layout:** :bug: 修复侧边栏顶部空白块颜色和无法缩小主页面问题 ([1999f30](https://github.com/HuLaSpark/HuLa/commit/1999f30b0e363d63bf1f1a8c0fda7bdc80c9b8b7))
- **layout:** :bug: 修复窗体高度整体变大bug ([396a103](https://github.com/HuLaSpark/HuLa/commit/396a103a24255568f426b1c08e4d7e7beb60264b))
- **layout:** :bug: 插件菜单增加图标和点击事件 ([bcbb61a](https://github.com/HuLaSpark/HuLa/commit/bcbb61a652a121e2cf251d6b4dfefa1c7bf00dec))
- **view:** :bug: 修复一些页面拖动区域问题 ([1183b7e](https://github.com/HuLaSpark/HuLa/commit/1183b7e3baabcbb9cfabe23327583221ae083ae8)), closes [#25](https://github.com/HuLaSpark/HuLa/issues/25)
- **view:** :bug: 修复侧边栏图标和字体宽度不一致问题 ([901218b](https://github.com/HuLaSpark/HuLa/commit/901218b043aa87ef4f5c972eb01aeb37ee4c56a5))
