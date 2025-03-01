# Changelog

## <small>2.6.6 (2025-03-01)</small>

* fix(global): :bug: 修复一些内容的类型问题 ([2c16343](https://github.com/HuLaSpark/HuLa/commit/2c16343))
* fix(service): :bug: 修复oss接口配置问题 ([5e2f6e4](https://github.com/HuLaSpark/HuLa/commit/5e2f6e4))
* perf(component): :zap: 优化一些功能的操作体验和样式 ([31c1709](https://github.com/HuLaSpark/HuLa/commit/31c1709))
* perf(service): :zap: 优化http模块 ([801ec4e](https://github.com/HuLaSpark/HuLa/commit/801ec4e))
* feat(component): :sparkles: 增加预加载页面样式 ([90f108a](https://github.com/HuLaSpark/HuLa/commit/90f108a))

## <small>2.6.5 (2025-02-27)</small>

* fix(common): :bug: 修复登出账号时没有清空系统托盘图标上的未读数(MacOS) ([383a776](https://github.com/HuLaSpark/HuLa/commit/383a776))
* fix(component): :bug: 修复加好友/群聊顶部栏不可操作问题和窗口通信响应式问题 ([b08e7d8](https://github.com/HuLaSpark/HuLa/commit/b08e7d8))
* fix(component): :bug: 修复跳转到会话选中回退第一个问题 ([029f3f9](https://github.com/HuLaSpark/HuLa/commit/029f3f9))
* fix(config): :bug: 修复检查更新问题(暂时先切换回github) ([d6d488b](https://github.com/HuLaSpark/HuLa/commit/d6d488b))
* fix(file): :bug: 修复git未监听文件名大小写修改 ([9a8659b](https://github.com/HuLaSpark/HuLa/commit/9a8659b))
* fix(git): :bug: 删除多余的文件，导致打包出错 ([df7fed3](https://github.com/HuLaSpark/HuLa/commit/df7fed3))
* fix(global): :bug: 修改全局使用到的一些类型为string ([3333aa0](https://github.com/HuLaSpark/HuLa/commit/3333aa0)), closes [#211](https://github.com/HuLaSpark/HuLa/issues/211)
* fix(worker): :bug: 修复ws连接问题和一些页面组件问题 ([eadea02](https://github.com/HuLaSpark/HuLa/commit/eadea02))
* perf(component): :zap: 优化侧边栏功能 ([d1f831d](https://github.com/HuLaSpark/HuLa/commit/d1f831d))
* perf(component): :zap: 优化加好友/群聊窗体样式和功能 ([6716913](https://github.com/HuLaSpark/HuLa/commit/6716913))
* perf(component): :zap: 优化自动登录功能 ([5cb9bfc](https://github.com/HuLaSpark/HuLa/commit/5cb9bfc))
* perf(service): :zap: 优化群聊功能 (#208) ([0e07e33](https://github.com/HuLaSpark/HuLa/commit/0e07e33)), closes [#208](https://github.com/HuLaSpark/HuLa/issues/208)
* perf(view): :zap: 优化登录逻辑 ([67cad46](https://github.com/HuLaSpark/HuLa/commit/67cad46))
* perf(view): :zap: 优化群聊侧边栏用户信息展示 ([4b03f57](https://github.com/HuLaSpark/HuLa/commit/4b03f57))
* perf(view): :zap: 优化群聊侧边栏状态展示和聊天框顶部栏状态展示 ([e15cf9b](https://github.com/HuLaSpark/HuLa/commit/e15cf9b))
* perf(view): :zap: 优化图片查看器 ([22f84f1](https://github.com/HuLaSpark/HuLa/commit/22f84f1))
* feat(component): :sparkles: 新增用户状态切换 ([5098733](https://github.com/HuLaSpark/HuLa/commit/5098733))
* feat(service): :sparkles: 增加双token校验 ([776b6ec](https://github.com/HuLaSpark/HuLa/commit/776b6ec)), closes [#IBNT91](https://github.com/HuLaSpark/HuLa/issues/IBNT91)
* feat(view): :sparkles: 添加好友或群，基本完成了查找添加好友相关的内容，可以查出来群聊信息暂时还没有写添加 (#209) ([90a8985](https://github.com/HuLaSpark/HuLa/commit/90a8985)), closes [#209](https://github.com/HuLaSpark/HuLa/issues/209)
* chore: 发布 v2.6.4 ([ac9d922](https://github.com/HuLaSpark/HuLa/commit/ac9d922))
* [Snyk] Upgrade @tauri-apps/plugin-clipboard-manager from 2.2.0 to 2.2.1 (#206) ([54354c6](https://github.com/HuLaSpark/HuLa/commit/54354c6)), closes [#206](https://github.com/HuLaSpark/HuLa/issues/206)
* [Snyk] Upgrade @tauri-apps/plugin-http from 2.2.0 to 2.3.0 (#207) ([cbf5f4d](https://github.com/HuLaSpark/HuLa/commit/cbf5f4d)), closes [#207](https://github.com/HuLaSpark/HuLa/issues/207)
* docs(readme): :memo: 更新赞助者名单 ([4d9aabe](https://github.com/HuLaSpark/HuLa/commit/4d9aabe))


### BREAKING CHANGE

* 一次性查出多条。添加好友用的是AddFriendsModal.vu页面进行一些修改,

closed https://gitee.com/HuLaSpark/HuLa/issues/IBJYSD

* fix(view): :bug: 修改创建窗体minH的问题

## <small>2.6.4 (2025-02-21)</small>

* fix(common): :bug: 修复登出账号时没有清空系统托盘图标上的未读数(MacOS) ([383a776](https://github.com/HuLaSpark/HuLa/commit/383a776))
* fix(component): :bug: 修复跳转到会话选中回退第一个问题 ([029f3f9](https://github.com/HuLaSpark/HuLa/commit/029f3f9))
* fix(config): :bug: 修复检查更新问题(暂时先切换回github) ([d6d488b](https://github.com/HuLaSpark/HuLa/commit/d6d488b))
* fix(file): :bug: 修复git未监听文件名大小写修改 ([9a8659b](https://github.com/HuLaSpark/HuLa/commit/9a8659b))
* fix(git): :bug: 删除多余的文件，导致打包出错 ([df7fed3](https://github.com/HuLaSpark/HuLa/commit/df7fed3))
* fix(worker): :bug: 修复ws连接问题和一些页面组件问题 ([eadea02](https://github.com/HuLaSpark/HuLa/commit/eadea02))
* feat(component): :sparkles: 新增用户状态切换 ([5098733](https://github.com/HuLaSpark/HuLa/commit/5098733))
* feat(service): :sparkles: 增加双token校验 ([776b6ec](https://github.com/HuLaSpark/HuLa/commit/776b6ec)), closes [#IBNT91](https://github.com/HuLaSpark/HuLa/issues/IBNT91)
* [Snyk] Upgrade @tauri-apps/plugin-clipboard-manager from 2.2.0 to 2.2.1 (#206) ([54354c6](https://github.com/HuLaSpark/HuLa/commit/54354c6)), closes [#206](https://github.com/HuLaSpark/HuLa/issues/206)
* [Snyk] Upgrade @tauri-apps/plugin-http from 2.2.0 to 2.3.0 (#207) ([cbf5f4d](https://github.com/HuLaSpark/HuLa/commit/cbf5f4d)), closes [#207](https://github.com/HuLaSpark/HuLa/issues/207)
* perf(view): :zap: 优化群聊侧边栏用户信息展示 ([4b03f57](https://github.com/HuLaSpark/HuLa/commit/4b03f57))
* perf(view): :zap: 优化群聊侧边栏状态展示和聊天框顶部栏状态展示 ([e15cf9b](https://github.com/HuLaSpark/HuLa/commit/e15cf9b))
* perf(view): :zap: 优化图片查看器 ([22f84f1](https://github.com/HuLaSpark/HuLa/commit/22f84f1))
* docs(readme): :memo: 更新赞助者名单 ([4d9aabe](https://github.com/HuLaSpark/HuLa/commit/4d9aabe))

## <small>2.6.3 (2025-02-15)</small>

* feat(component): :sparkles: 增加更换头像功能 ([63ba2e6](https://github.com/HuLaSpark/HuLa/commit/63ba2e6))
* feat(directive): :sparkles: 新增图片查看器 ([6a06f32](https://github.com/HuLaSpark/HuLa/commit/6a06f32))
* feat(preview): :sparkles: 增加本地开发配置以及赞助渠道 ([788da74](https://github.com/HuLaSpark/HuLa/commit/788da74))
* feat(service): ✨ 可选参数禁用http请求重试 (#202) ([223b9f2](https://github.com/HuLaSpark/HuLa/commit/223b9f2)), closes [#202](https://github.com/HuLaSpark/HuLa/issues/202)
* build(deps-dev): bump vitest from 3.0.1 to 3.0.5 (#201) ([2a857e3](https://github.com/HuLaSpark/HuLa/commit/2a857e3)), closes [#201](https://github.com/HuLaSpark/HuLa/issues/201)
* build(deps): bump dompurify from 3.2.3 to 3.2.4 (#205) ([835fb88](https://github.com/HuLaSpark/HuLa/commit/835fb88)), closes [#205](https://github.com/HuLaSpark/HuLa/issues/205)
* build(mobile): :package: 修改移动端文件的位置和配置 ([12e81fd](https://github.com/HuLaSpark/HuLa/commit/12e81fd))
* perf(common): :zap: 优化图片查看器和请求重试报错机制 ([25c39b7](https://github.com/HuLaSpark/HuLa/commit/25c39b7))
* perf(component): :zap: 优化图片查看器 ([3afd91e](https://github.com/HuLaSpark/HuLa/commit/3afd91e))
* fix(view): :bug: 修复好友申请方不知道对方已同意的bug (#203) ([01fd658](https://github.com/HuLaSpark/HuLa/commit/01fd658)), closes [#203](https://github.com/HuLaSpark/HuLa/issues/203)
* Dev retry (#199) ([7abc4b3](https://github.com/HuLaSpark/HuLa/commit/7abc4b3)), closes [#199](https://github.com/HuLaSpark/HuLa/issues/199)
* docs: :memo: 更新wx群二维码 ([1ad09e6](https://github.com/HuLaSpark/HuLa/commit/1ad09e6))

## <small>2.6.2 (2025-01-23)</small>

* feat(strategy): :sparkles: 增加表情包功能支持 ([6b19f07](https://github.com/HuLaSpark/HuLa/commit/6b19f07))
* feat(strategy): :sparkles: 增加发送图片功能(beta) ([f1aef7c](https://github.com/HuLaSpark/HuLa/commit/f1aef7c))
* chore(deps): update dependency vite to v6.0.9 [security] (#195) ([5777318](https://github.com/HuLaSpark/HuLa/commit/5777318)), closes [#195](https://github.com/HuLaSpark/HuLa/issues/195)
* perf(component): :zap: 优化组件加载、浏览器指纹生成 (#192) ([0252956](https://github.com/HuLaSpark/HuLa/commit/0252956)), closes [#192](https://github.com/HuLaSpark/HuLa/issues/192)
* perf(icon): :zap: 修改全平台icon（除了mac） (#193) ([eea52ea](https://github.com/HuLaSpark/HuLa/commit/eea52ea)), closes [#193](https://github.com/HuLaSpark/HuLa/issues/193)
* perf(view): :zap: 优化已删除好友的界面展示 ([69d7722](https://github.com/HuLaSpark/HuLa/commit/69d7722))

## <small>2.6.1 (2025-01-17)</small>

* fix(Android): :bug: 修复安卓启动配置 (#191) ([5176aee](https://github.com/HuLaSpark/HuLa/commit/5176aee)), closes [#191](https://github.com/HuLaSpark/HuLa/issues/191)
* fix(build): :bug: 去除alsa-sys的安装 ([b5f8402](https://github.com/HuLaSpark/HuLa/commit/b5f8402))
* fix(build): :bug: 修复ubuntu alsa-sys包版本 (#145) ([0840d7e](https://github.com/HuLaSpark/HuLa/commit/0840d7e)), closes [#145](https://github.com/HuLaSpark/HuLa/issues/145)
* fix(build): :bug: 修复ubuntu CI打包问题 (#144) ([c4f46f8](https://github.com/HuLaSpark/HuLa/commit/c4f46f8)), closes [#144](https://github.com/HuLaSpark/HuLa/issues/144)
* fix(common): :bug: 修复系统托盘状态切换问题 (#153) ([00e2a89](https://github.com/HuLaSpark/HuLa/commit/00e2a89)), closes [#153](https://github.com/HuLaSpark/HuLa/issues/153)
* fix(common): :bug: 修复set_badge_count方法没有处理报错问题 (#140) ([4d4bd9c](https://github.com/HuLaSpark/HuLa/commit/4d4bd9c)), closes [#140](https://github.com/HuLaSpark/HuLa/issues/140)
* fix(component): :bug: 修复tray设置窗口大小问题 (#149) ([7aaabb2](https://github.com/HuLaSpark/HuLa/commit/7aaabb2)), closes [#149](https://github.com/HuLaSpark/HuLa/issues/149)
* fix(docker): :bug: 修改docker-compose配置 (#162) ([e1b1984](https://github.com/HuLaSpark/HuLa/commit/e1b1984)), closes [#162](https://github.com/HuLaSpark/HuLa/issues/162)
* fix(mobile): :bug: 修复ios移动端页面问题 (#185) ([af7d388](https://github.com/HuLaSpark/HuLa/commit/af7d388)), closes [#185](https://github.com/HuLaSpark/HuLa/issues/185)
* fix(renovate): :bug: 修复renovate bot配置 (#164) ([0dd59a5](https://github.com/HuLaSpark/HuLa/commit/0dd59a5)), closes [#164](https://github.com/HuLaSpark/HuLa/issues/164)
* fix(service): :bug: 优化浏览器指纹 (#175) ([a2b3c32](https://github.com/HuLaSpark/HuLa/commit/a2b3c32)), closes [#175](https://github.com/HuLaSpark/HuLa/issues/175)
* fix(service): :bug: 增加浏览器指纹作为唯一值解决netty关联channel的问题 (#171) ([a5b5f89](https://github.com/HuLaSpark/HuLa/commit/a5b5f89)), closes [#171](https://github.com/HuLaSpark/HuLa/issues/171)
* fix(view): :bug: 修复系统托盘无法变化成多列表操作 (#150) ([cb08e62](https://github.com/HuLaSpark/HuLa/commit/cb08e62)), closes [#150](https://github.com/HuLaSpark/HuLa/issues/150)
* fix(view): :bug: 修复setSize方法导致无法修改窗口大小问题 ([412db5c](https://github.com/HuLaSpark/HuLa/commit/412db5c)), closes [#139](https://github.com/HuLaSpark/HuLa/issues/139)
* perf(mobile): :zap: 优化ios整体页面 (#186) ([2feb359](https://github.com/HuLaSpark/HuLa/commit/2feb359)), closes [#186](https://github.com/HuLaSpark/HuLa/issues/186)
* perf(view): :zap: 优化聊天框用户信息操作选项 (#173) ([b024757](https://github.com/HuLaSpark/HuLa/commit/b024757)), closes [#173](https://github.com/HuLaSpark/HuLa/issues/173)
* perf(view): :zap: 优化win的托盘闪烁和消息提示 (#142) ([4e49700](https://github.com/HuLaSpark/HuLa/commit/4e49700)), closes [#142](https://github.com/HuLaSpark/HuLa/issues/142)
* perf(worker): :zap: 使用worker优化计时器不准确问题 (#190) ([000fcc2](https://github.com/HuLaSpark/HuLa/commit/000fcc2)), closes [#190](https://github.com/HuLaSpark/HuLa/issues/190)
* feat(android): :sparkles: 新增android兼容 (#170) ([684b95c](https://github.com/HuLaSpark/HuLa/commit/684b95c)), closes [#170](https://github.com/HuLaSpark/HuLa/issues/170)
* feat(mobile): :sparkles: 新增移动端兼容 (#169) ([3607c9d](https://github.com/HuLaSpark/HuLa/commit/3607c9d)), closes [#169](https://github.com/HuLaSpark/HuLa/issues/169) [#61](https://github.com/HuLaSpark/HuLa/issues/61)
* feat(mobile): :sparkles: 增加ios下拉刷新功能 (#189) ([837d2b3](https://github.com/HuLaSpark/HuLa/commit/837d2b3)), closes [#189](https://github.com/HuLaSpark/HuLa/issues/189)
* feat(scripts): :sparkles: 新增环境检测脚本(用于检测用户当前系统环境) (#166) ([3983bf7](https://github.com/HuLaSpark/HuLa/commit/3983bf7)), closes [#166](https://github.com/HuLaSpark/HuLa/issues/166)
* feat(service): :sparkles: http错误提示 (#184) ([cd03444](https://github.com/HuLaSpark/HuLa/commit/cd03444)), closes [#184](https://github.com/HuLaSpark/HuLa/issues/184)
* feat(service): :sparkles: http请求重试 (#178) ([2d0f3e0](https://github.com/HuLaSpark/HuLa/commit/2d0f3e0)), closes [#178](https://github.com/HuLaSpark/HuLa/issues/178)
* feat(system): :sparkles: 新增linxu系统ubuntu兼容 (#148) ([373d87c](https://github.com/HuLaSpark/HuLa/commit/373d87c)), closes [#148](https://github.com/HuLaSpark/HuLa/issues/148)
* feat(view): :sparkles: 增加透明高斯模糊开关 (#177) ([cefe53d](https://github.com/HuLaSpark/HuLa/commit/cefe53d)), closes [#177](https://github.com/HuLaSpark/HuLa/issues/177)
* !45 fix(view): :bug:修复群聊问题 ([b0432d6](https://github.com/HuLaSpark/HuLa/commit/b0432d6)), closes [#152](https://github.com/HuLaSpark/HuLa/issues/152)
* Http请求重试并抛出错误 (#181) ([16c4dea](https://github.com/HuLaSpark/HuLa/commit/16c4dea)), closes [#181](https://github.com/HuLaSpark/HuLa/issues/181)
* Test actions (#147) ([9755340](https://github.com/HuLaSpark/HuLa/commit/9755340)), closes [#147](https://github.com/HuLaSpark/HuLa/issues/147)
* build: 升级依赖 (#161) ([498f490](https://github.com/HuLaSpark/HuLa/commit/498f490)), closes [#161](https://github.com/HuLaSpark/HuLa/issues/161) [#156](https://github.com/HuLaSpark/HuLa/issues/156) [#155](https://github.com/HuLaSpark/HuLa/issues/155) [#157](https://github.com/HuLaSpark/HuLa/issues/157) [#158](https://github.com/HuLaSpark/HuLa/issues/158) [#159](https://github.com/HuLaSpark/HuLa/issues/159)
* chore: 发布 v2.6.0 ([f411af6](https://github.com/HuLaSpark/HuLa/commit/f411af6))
* ci: :ferris_wheel: 优化CI配置 (#141) ([6b47049](https://github.com/HuLaSpark/HuLa/commit/6b47049)), closes [#141](https://github.com/HuLaSpark/HuLa/issues/141)

## 2.6.0 (2025-01-05)

* feat(system): :sparkles: 新增linxu系统ubuntu兼容 (#148) ([43d1561](https://github.com/HuLaSpark/HuLa/commit/43d1561)), closes [#148](https://github.com/HuLaSpark/HuLa/issues/148)
* Test actions (#147) ([d0a0e5f](https://github.com/HuLaSpark/HuLa/commit/d0a0e5f)), closes [#147](https://github.com/HuLaSpark/HuLa/issues/147)
* fix(build): :bug: 去除alsa-sys的安装 ([64f0c39](https://github.com/HuLaSpark/HuLa/commit/64f0c39))
* fix(build): :bug: 修复ubuntu alsa-sys包版本 (#145) ([d6adb2d](https://github.com/HuLaSpark/HuLa/commit/d6adb2d)), closes [#145](https://github.com/HuLaSpark/HuLa/issues/145)
* fix(build): :bug: 修复ubuntu CI打包问题 (#144) ([5d66161](https://github.com/HuLaSpark/HuLa/commit/5d66161)), closes [#144](https://github.com/HuLaSpark/HuLa/issues/144)
* fix(common): :bug: 修复set_badge_count方法没有处理报错问题 (#140) ([4d4bd9c](https://github.com/HuLaSpark/HuLa/commit/4d4bd9c)), closes [#140](https://github.com/HuLaSpark/HuLa/issues/140)
* fix(view): :bug: 修复setSize方法导致无法修改窗口大小问题 (#143) ([b412c2e](https://github.com/HuLaSpark/HuLa/commit/b412c2e)), closes [#143](https://github.com/HuLaSpark/HuLa/issues/143) [#139](https://github.com/HuLaSpark/HuLa/issues/139)
* perf(view): :zap: 优化win的托盘闪烁和消息提示 (#142) ([4e49700](https://github.com/HuLaSpark/HuLa/commit/4e49700)), closes [#142](https://github.com/HuLaSpark/HuLa/issues/142)
* ci: :ferris_wheel: 优化CI配置 (#141) ([6b47049](https://github.com/HuLaSpark/HuLa/commit/6b47049)), closes [#141](https://github.com/HuLaSpark/HuLa/issues/141)

## [2.5.11](https://github.com/HuLaSpark/HuLa/compare/v2.5.10...v2.5.11) (2025-01-03)


### ✨ Features | 新功能

* **component:** :sparkles: 新增AI选项卡，封装提及框功能 ([#133](https://github.com/HuLaSpark/HuLa/issues/133)) ([9fdb695](https://github.com/HuLaSpark/HuLa/commit/9fdb6953ab2c9d46c75b715aac40d211cb605fa7))
* **notification:** :sparkles: 新增notification系统通知 ([#127](https://github.com/HuLaSpark/HuLa/issues/127)) ([77373e3](https://github.com/HuLaSpark/HuLa/commit/77373e3782f8f5679940605656259efbb21db558))
* **service:** :sparkles: 新增翻译服务api ([#130](https://github.com/HuLaSpark/HuLa/issues/130)) ([fadbf2b](https://github.com/HuLaSpark/HuLa/commit/fadbf2b24a7f5688d02de47ac36254902018e56e))


### 🐛 Bug Fixes | Bug 修复

* **common:** :bug: 修复一些流程和已知的问题 ([#134](https://github.com/HuLaSpark/HuLa/issues/134)) ([ca0dc1f](https://github.com/HuLaSpark/HuLa/commit/ca0dc1fc778c3c2b9b4175b11ea02fc3cace1cd5))
* **common:** :bug: 修复一些已知问题 ([#137](https://github.com/HuLaSpark/HuLa/issues/137)) ([16cd17a](https://github.com/HuLaSpark/HuLa/commit/16cd17aa54fe32399fdeb6a11470fac6daede754))
* **event:** :bug: 修复tauri listen未销毁问题 ([#124](https://github.com/HuLaSpark/HuLa/issues/124)) ([7b762e2](https://github.com/HuLaSpark/HuLa/commit/7b762e26a086ca69b0c71093f9382fc865b259aa))
* **pnpm:** :bug: 更新版本依赖 ([#138](https://github.com/HuLaSpark/HuLa/issues/138)) ([15a645e](https://github.com/HuLaSpark/HuLa/commit/15a645ec78214886e2502226bc7fa176ba91d912))
* **version:** :bug: 修复升级tauri版本导致的高度问题 ([#125](https://github.com/HuLaSpark/HuLa/issues/125)) ([adf47e7](https://github.com/HuLaSpark/HuLa/commit/adf47e7acc38c7159ddc0aaa4bb38784ff5f1594))


### ⚡️ Performance Improvements | 性能优化

* **component:** :zap: 可在设置中切换翻译提供商 ([#132](https://github.com/HuLaSpark/HuLa/issues/132)) ([99a8859](https://github.com/HuLaSpark/HuLa/commit/99a8859476bef5593641076a6fdadd2b48153be2))
* **component:** :zap: 优化撤回消息重新编辑判定 ([#128](https://github.com/HuLaSpark/HuLa/issues/128)) ([451ded8](https://github.com/HuLaSpark/HuLa/commit/451ded82c58cdfd4d8941533db50df61f448b292))
* **component:** :zap: 优化翻译的显示 ([#131](https://github.com/HuLaSpark/HuLa/issues/131)) ([c18ee4b](https://github.com/HuLaSpark/HuLa/commit/c18ee4b46715b072cfa7ff82b790c68c63a5eb62))
* **component:** :zap: 优化虚拟列表加载更多功能 ([#129](https://github.com/HuLaSpark/HuLa/issues/129)) ([a1641e9](https://github.com/HuLaSpark/HuLa/commit/a1641e96ccde507a28f56c8083a8e37bd379da6c))

## [2.5.10](https://github.com/HuLaSpark/HuLa/compare/v2.5.9...v2.5.10) (2024-12-25)


### 🐛 Bug Fixes | Bug 修复

* **common:** :bug: 修复提示的效果问题 ([#121](https://github.com/HuLaSpark/HuLa/issues/121)) ([0b7c873](https://github.com/HuLaSpark/HuLa/commit/0b7c873556be3d14752293d762f87a4d417843dd)), closes [#34](https://github.com/HuLaSpark/HuLa/issues/34)
* **component:** :bug: 修复输入框和虚拟列表的一些问题 ([#117](https://github.com/HuLaSpark/HuLa/issues/117)) ([7f4040f](https://github.com/HuLaSpark/HuLa/commit/7f4040fd4e5597227cbd3a2c0e3beb84f7e288bd))
* **component:** :bug: 修复整体流程bug问题 ([#118](https://github.com/HuLaSpark/HuLa/issues/118)) ([11fdfe6](https://github.com/HuLaSpark/HuLa/commit/11fdfe65a0fe46b4792cf579a47bbb9b75f465de))
* **rust:** :bug: 修复windows启动报错问题 ([#119](https://github.com/HuLaSpark/HuLa/issues/119)) ([311bd72](https://github.com/HuLaSpark/HuLa/commit/311bd72b6af9627221d4c12bf5d1089380d5b4f5)), closes [#IBD413](https://github.com/HuLaSpark/HuLa/issues/IBD413)
* **rust:** :bug: 修复windows下启动问题 ([#122](https://github.com/HuLaSpark/HuLa/issues/122)) ([9f43c9e](https://github.com/HuLaSpark/HuLa/commit/9f43c9e77d647cfdc30aa04ad51ac6b0ce608a49))
* **windows:** :bug: 修复windows下打包出错问题 ([#123](https://github.com/HuLaSpark/HuLa/issues/123)) ([e346da3](https://github.com/HuLaSpark/HuLa/commit/e346da33cf26143bc5d98f1bee61933ceebfff58))


### ⚡️ Performance Improvements | 性能优化

* **component:** :zap: 优化使用for-of ([#120](https://github.com/HuLaSpark/HuLa/issues/120)) ([003171b](https://github.com/HuLaSpark/HuLa/commit/003171bc1eb688e0a37f94735ca1e4d71446cf94))
* **component:** :zap: 优化虚拟列表的滚动和性能 ([#112](https://github.com/HuLaSpark/HuLa/issues/112)) ([e8b60ee](https://github.com/HuLaSpark/HuLa/commit/e8b60ee83bb9f7f4048899df31113b83f0f01c62))

## [2.5.9](https://github.com/HuLaSpark/HuLa/compare/v2.5.8...v2.5.9) (2024-12-18)


### ✨ Features | 新功能

* **component:** :sparkles: 新增默认头像 ([#104](https://github.com/HuLaSpark/HuLa/issues/104)) ([5a4ff70](https://github.com/HuLaSpark/HuLa/commit/5a4ff7065b2f5c2339f8f6208bf3fe3d73c59400))


### 🐛 Bug Fixes | Bug 修复

* **CI:** :bug: 修复release配置 ([#110](https://github.com/HuLaSpark/HuLa/issues/110)) ([6969a09](https://github.com/HuLaSpark/HuLa/commit/6969a0999ec0a0114e21e9db8ea8f56a82c73e09))
* **component:** :bug: 修复mac下输入框输入拼音时的问题 ([#108](https://github.com/HuLaSpark/HuLa/issues/108)) ([6fd6636](https://github.com/HuLaSpark/HuLa/commit/6fd6636cef63c05cdd2ed04858d533ad98e0c34f))
* **component:** :bug: 修复naiveui的虚拟列表问题 ([#109](https://github.com/HuLaSpark/HuLa/issues/109)) ([1ec6020](https://github.com/HuLaSpark/HuLa/commit/1ec602016869119e51348c40436aeda120a0dccd))
* **config:** :bug: 修改renovate bot的配置 ([23511f7](https://github.com/HuLaSpark/HuLa/commit/23511f78cd5b22449bbc53cb5c567255250ca863))
* **view:** :bug: 修复群里在线人数问题和登录历史记录问题 ([#105](https://github.com/HuLaSpark/HuLa/issues/105)) ([4dae48e](https://github.com/HuLaSpark/HuLa/commit/4dae48e1ad380bc5ca68b664fe89664ac68235fd))
* **view:** :bug: 修复异常关闭再重新登录会不显示会话的bug ([096df49](https://github.com/HuLaSpark/HuLa/commit/096df49dcd9408eecadb9344d5d7433468e7bc5c))


### ⚡️ Performance Improvements | 性能优化

* **hook:** :zap: 优化windows窗口圆角问题 ([024c1a3](https://github.com/HuLaSpark/HuLa/commit/024c1a36d8ab435151d6485921b198070b15076e))
* **view:** :zap: 优化一下样式和登录页面的提示 ([#107](https://github.com/HuLaSpark/HuLa/issues/107)) ([8bb4aa7](https://github.com/HuLaSpark/HuLa/commit/8bb4aa77d93fb731d3ff85fe273d20e7b4ba991d)), closes [#106](https://github.com/HuLaSpark/HuLa/issues/106)

## [2.5.8](https://github.com/HuLaSpark/HuLa/compare/v2.5.7...v2.5.8) (2024-12-12)


### ✨ Features | 新功能

* **component:** :sparkles: 新增米游社表情包功能 ([1b38500](https://github.com/HuLaSpark/HuLa/commit/1b385005be135d8afc83ec1d5fb80d1ab25bf5f5))


### 🐛 Bug Fixes | Bug 修复

* **chat-edittor:** 在 Webkit  中 re-focus 后焦点被重置 ([e381a09](https://github.com/HuLaSpark/HuLa/commit/e381a09fb138be627b01df6f096a0ad9383eef99))
* **common:** :bug: 修改Cargo.lock ([e3ead1c](https://github.com/HuLaSpark/HuLa/commit/e3ead1c7fdf30b7a2eb857973dfcc66bb01dc44b))
* **component:** :bug: 修复canvas模糊问题，以及图片和emoji的一些插入的位置和优化 ([5dee0ae](https://github.com/HuLaSpark/HuLa/commit/5dee0ae4d4d09178a1664d5f2ec01354a69b8001))
* **config:** :bug: 修改cargo的镜像源和文件后缀 ([d882e2e](https://github.com/HuLaSpark/HuLa/commit/d882e2e301b8ae27819dd8469452d40a704ea4a6))
* **package:** :bug: 修复发版和commit的命令 ([6307326](https://github.com/HuLaSpark/HuLa/commit/6307326b016bfc654b0e6f70bc254d59d0fcde67))

## [2.5.7](https://github.com/HuLaSpark/HuLa/compare/v2.5.6...v2.5.7) (2024-12-10)


### 🐛 Bug Fixes | Bug 修复

* **config:** :bug: 修复因为notify窗口没有配置问题导致mac下打不开 ([d940838](https://github.com/HuLaSpark/HuLa/commit/d940838f380c8e626926dae1dceea6a4076ea83f)), closes [#55](https://github.com/HuLaSpark/HuLa/issues/55)

## [2.5.6](https://github.com/HuLaSpark/HuLa/compare/v2.5.5...v2.5.6) (2024-12-09)


### ✨ Features | 新功能

* **component:** :sparkles: 新增创建群聊弹窗 ([10fb45f](https://github.com/HuLaSpark/HuLa/commit/10fb45f8d9cc48058ad54c8c24ce50ab434a45a8))
* **hook:** :sparkles: 添加消息保存到本地数据库功能 ([8b67a1b](https://github.com/HuLaSpark/HuLa/commit/8b67a1b0b67822d70459b26beaf85b4fb9e2cab2))
* **hooks:** :sparkles: 新增 useMitter 钩子以替代直接使用 Mitt 事件总线 ([44db95d](https://github.com/HuLaSpark/HuLa/commit/44db95d3fecdad11155e9583f85d5b51d1407173))
* **plugin:** :sparkles: 限制只能一台设备打开一个客户端 ([ab9a515](https://github.com/HuLaSpark/HuLa/commit/ab9a5153fecb6da048540247bbae63080399540b))
* **view:** :sparkles: 新增新消息状态栏图标闪烁 ([09264b7](https://github.com/HuLaSpark/HuLa/commit/09264b7918c11044fe2830a8c5607cceb162d106))


### 🐛 Bug Fixes | Bug 修复

* **component:** :bug: 修复聊天框右键菜单问题和添加好友等一些已知问题 ([69b4cbd](https://github.com/HuLaSpark/HuLa/commit/69b4cbd63f7bb8cd286d4c673babf08bd1fb2008))
* **layout:** :bug: 处理退出账号bug|处理登录token有时未保存bug|其他优化 ([470efde](https://github.com/HuLaSpark/HuLa/commit/470efded2edff37a93e0a002a34ca7aec6c90172))
* **layout:** :bug: 处理异常关闭程序发送下线通知 ([2cf5e97](https://github.com/HuLaSpark/HuLa/commit/2cf5e97d1e05c1641c7919b2f4e521dd176860cd))
* **layout:** :bug: 处理mitt合并冲突 ([f0766e1](https://github.com/HuLaSpark/HuLa/commit/f0766e1907a9411683de94b54072638d30d06478))
* **layout:** :bug: 修复登录不同账号会导致其他账号退出登录的问题 ([2b21f83](https://github.com/HuLaSpark/HuLa/commit/2b21f83bab32ed19504b9dad9aa32f33c73cec5b))
* **layout:** :bug: 修复自动登录bug|修复登录token未保存bug|其他优化 ([945502f](https://github.com/HuLaSpark/HuLa/commit/945502fa38fd8a7fb7d15bd1a7e8f018dddeac67))
* **service:** :bug: 处理pinia报错 ([c9d65dc](https://github.com/HuLaSpark/HuLa/commit/c9d65dc82a4777edf5f636a7b26bd976364d8d64))
* **service:** :bug: 修复异常退出登录bug，优化ws ([c671db8](https://github.com/HuLaSpark/HuLa/commit/c671db8d98dbce6fcdf248232a4a2eca020d770f))
* **store:** :bug: 修复store中保存的用户信息冲突导致登录的用户信息错乱问题 ([6119e42](https://github.com/HuLaSpark/HuLa/commit/6119e420b0b355cb6dde7f3f4d0d6e07f7202358))
* **view:** :bug: 固定右下角消息提示位置 ([5bc78d2](https://github.com/HuLaSpark/HuLa/commit/5bc78d2c8b4aa6e1f69d2f6d9e01db6b23ee7e9d))
* **view:** :bug: 修复右下角消息提示位置不对bug ([db19672](https://github.com/HuLaSpark/HuLa/commit/db19672295ac8b1abc0489cf76b41dbf9d6b3ebe))
* **view:** :bug: 修复自动登录bug ([8b1da81](https://github.com/HuLaSpark/HuLa/commit/8b1da812e1845190a708ea146cb075ef907dd12d))


### ⚡️ Performance Improvements | 性能优化

* **component:** :zap: 优化撤回信息后的功能 ([7cbb443](https://github.com/HuLaSpark/HuLa/commit/7cbb443e84f04e6b19f45a0fa779639d75a4939e))
* **component:** :zap: 优化消息气泡发送状态提示 ([90b7c91](https://github.com/HuLaSpark/HuLa/commit/90b7c91264e88052d3cc1086b81900cf08d0e213))
* **component:** :zap: 优化新增群组功能 ([e33de24](https://github.com/HuLaSpark/HuLa/commit/e33de24dec294bccb68e10821f05b09d09c1f358))
* **component:** :zap: 优化一些代码和逻辑 ([4b500a1](https://github.com/HuLaSpark/HuLa/commit/4b500a1c9ef60dda95f513755ea362a865194e55))
* **component:** :zap: 优化右键@和发送消息功能 ([91e8703](https://github.com/HuLaSpark/HuLa/commit/91e8703af0c66a61eddec245fe1132d26194a303))
* **component:** :zap: 优化注册流程和样式 ([3d59a7d](https://github.com/HuLaSpark/HuLa/commit/3d59a7d6d0e0558f04e96dc536e1e8cfb0955520))
* **hook:** :zap: 优化useMitt的写法 ([004a696](https://github.com/HuLaSpark/HuLa/commit/004a6960100f2139ef7e3021db0da6081c60954a))
* **view:** :zap: 优化代理功能 ([0cf8dc9](https://github.com/HuLaSpark/HuLa/commit/0cf8dc9bb9fafa66a419497bcf814f8fcc1cb791))
* **view:** :zap: 优化useMitt的取消时机 ([f7f6bc0](https://github.com/HuLaSpark/HuLa/commit/f7f6bc0ada6a6531586c74b08995056cb92d30ba))

## [2.5.5](https://github.com/HuLaSpark/HuLa/compare/v2.5.4...v2.5.5) (2024-11-20)


### 🐛 Bug Fixes | Bug 修复

* **service:** :bug: 修复更新功能版本出错问题以及修复输入框和聊天框对于特殊字符和兼容性 ([9c1d23d](https://github.com/HuLaSpark/HuLa/commit/9c1d23d2060dbad13d4197517feec6d3a410e742))
* **style:** :bug: 修复聊天消息框回复宽度限制问题 ([d0aca70](https://github.com/HuLaSpark/HuLa/commit/d0aca707a7a549aa0696a1074da62e58d7449056))

## [2.5.4](https://github.com/HuLaSpark/HuLa/compare/v2.5.3...v2.5.4) (2024-11-19)

### 🐛 Bug Fixes | Bug 修复

- **component:** :bug: 修复群聊侧边栏搜索时无法右键查看用户信息 ([f5b5bb0](https://github.com/HuLaSpark/HuLa/commit/f5b5bb09c8711227e4ccb9e3bc4e65bdc52415b9))
- **component:** :bug: 修复群聊当前登录用户右键菜单功能逻辑错误 ([00c35ff](https://github.com/HuLaSpark/HuLa/commit/00c35ff6feda18623c608b8aa29529c30a48e528))
- **hook:** :bug: 修复发送消息频繁的bug ([bbb74ee](https://github.com/HuLaSpark/HuLa/commit/bbb74ee78a425375a44ce6940dbed0b8265b618c))
- **service:** :bug: 修复http模块没有设置请求头导致请求报错问题 ([1538964](https://github.com/HuLaSpark/HuLa/commit/153896480e8a86cd50962d3678fae786ea444ebd))
- **store:** :bug: 上下线通知 ([2f2a2a2](https://github.com/HuLaSpark/HuLa/commit/2f2a2a2068143e723db3ec31cfce3f2397acf8d4))
- **store:** :bug: 修复一些接口的store封装 ([4626527](https://github.com/HuLaSpark/HuLa/commit/46265275e52fd30090a3d07a98f1023e9960b18d))
- **view:** :bug: 修复一些功能漏洞问题 ([#38](https://github.com/HuLaSpark/HuLa/issues/38)) ([f626a96](https://github.com/HuLaSpark/HuLa/commit/f626a96c1abfb00e07d53fceec12ea3cdd1faca0))
- **view:** :bug: 修复打开独立窗口后主窗口消息窗口无法打开问题 ([#36](https://github.com/HuLaSpark/HuLa/issues/36)) ([06435c8](https://github.com/HuLaSpark/HuLa/commit/06435c8d58250d4b9501431dc82c51643bc6e054))
- **view:** :bug: 修复登录和请求的一些缺陷 ([54ee3ff](https://github.com/HuLaSpark/HuLa/commit/54ee3ff1688ec1dd248b5e7120e3613ce8758ac9))

## [2.5.3](https://github.com/HuLaSpark/HuLa/compare/v2.5.2...v2.5.3) (2024-11-06)

### 🐛 Bug Fixes | Bug 修复

- **component:** :bug: 修复输入框换行不兼容webkit的问题 ([345d830](https://github.com/HuLaSpark/HuLa/commit/345d83068711df087dd0ba403446c739151a11dd))
- **layout:** :bug: 修复聊天框改变宽度的时候可以选中文本的问题 ([56d79cc](https://github.com/HuLaSpark/HuLa/commit/56d79ccc8ba015a313eabcd938757f35d1d840a4))
- **layout:** :bug: 修复选择了图片不显示在输入框中的bug ([c7cdac6](https://github.com/HuLaSpark/HuLa/commit/c7cdac69ce6fa185489dcb480991e3a268fec99d))
- **service:** :bug: 修复请求接口bug ([f3723d4](https://github.com/HuLaSpark/HuLa/commit/f3723d4e5a2342314ce6e85931a49f1ddfecab0b))

### ⚡️ Performance Improvements | 性能优化

- **component:** :zap: 优化右键菜单功能 ([7b53029](https://github.com/HuLaSpark/HuLa/commit/7b530297ac37122ead00a15864e16a73a5547d04))

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
