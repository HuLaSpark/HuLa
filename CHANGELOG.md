

## [2.6.13](https://github.com/HuLaSpark/HuLa/compare/v2.6.12...v2.6.13) (2025-07-04)


### ✨ Features | 新功能

* **component:** :sparkles: 增加文件类型(除语音、视频)等文件类型的样式兼容 ([99711a7](https://github.com/HuLaSpark/HuLa/commit/99711a73f3296eaefe1281251f76303465cd72d5))
* **component:** :sparkles:增加上传视频、文件、音频等功能 ([#292](https://github.com/HuLaSpark/HuLa/issues/292)) ([203af0d](https://github.com/HuLaSpark/HuLa/commit/203af0d06030a6b19c5a2a4705098073f0e9000d))
* **view:** :sparkles: 保持窗口位置和大小 ([#287](https://github.com/HuLaSpark/HuLa/issues/287)) ([dfc29fa](https://github.com/HuLaSpark/HuLa/commit/dfc29fa3ed19313f4bc8539a0c788d8c6df3eaab))


### 🐛 Bug Fixes | Bug 修复

* **common:** :bug: 修复未提示用户错误弹框问题 ([916ab6c](https://github.com/HuLaSpark/HuLa/commit/916ab6c56aeab81b99a14fd2fc6200ffd2226a6a))
* **component:** :bug: 修复mac启动依赖问题 ([81d3bc9](https://github.com/HuLaSpark/HuLa/commit/81d3bc9f018ea9ba29baae5867e36cc3d2b35eea))
* **component:** :bug: 用户修改当前群聊昵称显示问题 ([e4c43ae](https://github.com/HuLaSpark/HuLa/commit/e4c43aee74d534f2f9d3ee45a97aeb2d3ecfffa6))
* **hook:** :bug: 修复pinia初始化报错问题 ([c9cdcc0](https://github.com/HuLaSpark/HuLa/commit/c9cdcc0cc585d260b416c680bc5ccd20dee74526))
* macos开发模式样式不生效 ([#299](https://github.com/HuLaSpark/HuLa/issues/299)) ([0a1f4ec](https://github.com/HuLaSpark/HuLa/commit/0a1f4ecd180ad55fdc5be58c1e6798065f37f48e))
* **service:** :bug: 修复网络设置后缀为空时，调用接口失败的bug ([cb1fb70](https://github.com/HuLaSpark/HuLa/commit/cb1fb701818f1411da76f0dea3b3e8aef1d049de))
* **view:** :bug: 修复文件类型气泡的样式和上传分片功能 ([57ac5c9](https://github.com/HuLaSpark/HuLa/commit/57ac5c98b7be12113367b54406d72f794a1a96e4))
* **view:** :bug: 只保持主窗口窗口大小 ([8164e91](https://github.com/HuLaSpark/HuLa/commit/8164e916704dce7f197387f623688a865fe67011))


### ⚡️ Performance Improvements | 性能优化

* **component:** :zap: 优化webSocket的重连性能和网络检测方法 ([54f32ee](https://github.com/HuLaSpark/HuLa/commit/54f32eec5f4260501c75fa23459ecbcc82e17cb4))
* **service:** :zap: 优化webSocket重连机制 ([18ffde1](https://github.com/HuLaSpark/HuLa/commit/18ffde1d49bd661ffc283d68e959b669c4bbb54d))
* **store:** :zap: 优化刷新会话列表后，时间和最新消息简介没有更新的问题 ([d2ab29b](https://github.com/HuLaSpark/HuLa/commit/d2ab29bfd585218447641368a55069286e5e2714))

## [2.6.12](https://github.com/HuLaSpark/HuLa/compare/v2.6.11...v2.6.12) (2025-05-25)


### ✨ Features | 新功能

* **component:** :sparkles: 增加右键emoji可以另存为 ([0dfdfc1](https://github.com/HuLaSpark/HuLa/commit/0dfdfc1269256baa59316b7936db94468b733b69))
* **hook:** :sparkles: 增强文本选择复制 ([791b9cc](https://github.com/HuLaSpark/HuLa/commit/791b9cc69485d9c8245396d72cca834ac9a61aa0)), closes [#279](https://github.com/HuLaSpark/HuLa/issues/279)


### 🐛 Bug Fixes | Bug 修复

* 修复ws链接断开没有重试问题 ([#276](https://github.com/HuLaSpark/HuLa/issues/276)) ([e068a25](https://github.com/HuLaSpark/HuLa/commit/e068a253e5215aacb606f852087e5e9e67010404))
* **agreement:** :bug: 安装界面乱码 ([#277](https://github.com/HuLaSpark/HuLa/issues/277)) ([13c528a](https://github.com/HuLaSpark/HuLa/commit/13c528a35e11ee5fa7325beb1fcef8d28f2550e3)), closes [#275](https://github.com/HuLaSpark/HuLa/issues/275)
* **hook:** :bug: 修复除emoji类型和图片类型都可以另存为的bug ([d2b6ab2](https://github.com/HuLaSpark/HuLa/commit/d2b6ab25d6fd7ea5a4e9df1d287fe3d3cc9a1b58))
* **hook:** :bug: 修复mac系统右键会选中文本的问题 ([7e762e8](https://github.com/HuLaSpark/HuLa/commit/7e762e8524df0d17f85ca71eedb95d01dea7c8d3))
* **hook:** :bug: 暂时移除/唤起ai快捷键识别 ([4a1a05c](https://github.com/HuLaSpark/HuLa/commit/4a1a05cf51b4bab670b2da5faac43bf33f902998))
* **input:** :bug: 修复mac下输入框检查拼写和字母大小写问题 ([f8602e5](https://github.com/HuLaSpark/HuLa/commit/f8602e56ebbf4ae90f5f5dc7e7cebee317bf4ab4))
* **mac:** :bug: 修复mac下点击关闭按钮无法关闭home窗口问题 ([2a63046](https://github.com/HuLaSpark/HuLa/commit/2a63046bbd2d7c4cd484d456c708ab47bdc8e792))
* **view:** :bug: 修复托盘菜单内容不展示问题和托盘图标闪烁后不展示问题 ([c927be4](https://github.com/HuLaSpark/HuLa/commit/c927be4c3fd00cdde9f93c15793ea56ce5b11d14))
* **view:** :bug: 修改邮箱输入框长度限制 ([61618db](https://github.com/HuLaSpark/HuLa/commit/61618db93cbe9512eceb66fbc50006a90f7d44f1)), closes [#278](https://github.com/HuLaSpark/HuLa/issues/278)
* **worker:** :bug: 修复ws在重连后清空token导致无法对应获取消息问题 ([030fed7](https://github.com/HuLaSpark/HuLa/commit/030fed7d60a6eb03dccb49e6f108b2b5d67161e4))


### ⚡️ Performance Improvements | 性能优化

* **global:** :zap: 增加ws健康检查兜底刷新最新消息内容、网络断线恢复重连 ([f734dca](https://github.com/HuLaSpark/HuLa/commit/f734dca910b17e3dd8a4d8e5e58cae3e7caaa333))

## [2.6.11](https://github.com/HuLaSpark/HuLa/compare/v2.6.10...v2.6.11) (2025-05-18)


### ⚠ BREAKING CHANGES

* **component:** webSocket的计时器调整为worker计时器

### ✨ Features | 新功能

* **view:** :sparkles: 新增重置密码功能 ([b45cfd2](https://github.com/HuLaSpark/HuLa/commit/b45cfd22120c9fe46fead1fcb9daf5cc7b25f423))
* **view:** :sparkles: 增加修订版本更新检测，修复每次版本变动都更新的bug ([#271](https://github.com/HuLaSpark/HuLa/issues/271)) ([833d09e](https://github.com/HuLaSpark/HuLa/commit/833d09efe4e218d483c37a87cb1bdd39443f46c7))


### 🐛 Bug Fixes | Bug 修复

* **component:** :bug: 点击头像弹出个人信息面板 ([#273](https://github.com/HuLaSpark/HuLa/issues/273)) ([eaa4288](https://github.com/HuLaSpark/HuLa/commit/eaa42885c33a03d84cc2999c6a77a1eb4d5baf0a))
* **component:** :bug: 修复回复消息表情不展示问题 ([f33f41d](https://github.com/HuLaSpark/HuLa/commit/f33f41d41f0f60fb5ab9e0cff6305b0cef548eea))
* **component:** :bug: 修复图片截图功能文件大小问题 ([f816314](https://github.com/HuLaSpark/HuLa/commit/f816314115a02e10241f299536db9e54854a510f))
* **component:** :bug: 修复因公告宽度导致聊天框布局混乱问题 ([2753e89](https://github.com/HuLaSpark/HuLa/commit/2753e89dd52f7a4a66eca3ffe5e8189bdc266170))
* **component:** :bug: 修复mac下更新提示窗口可以调整大小、拖动、标题栏显示问题 ([c761486](https://github.com/HuLaSpark/HuLa/commit/c76148687cd86b2f56d34525bc3d56b859d74a13))
* **component:** :bug: 优化windows上群聊的展示时机和样式 ([92dba12](https://github.com/HuLaSpark/HuLa/commit/92dba1218ffc113e9ea492c1ead20732c40bce32))
* **ios:** :bug: 修复ios init导致无法启动问题 ([3ef1666](https://github.com/HuLaSpark/HuLa/commit/3ef1666ef7eadae9990fbeed357b5c1ccc085c12))
* **notify:** :bug: 修复免打扰时还会触发托盘图标闪烁(windows) ([02ef835](https://github.com/HuLaSpark/HuLa/commit/02ef83585549851836b11dc1e58e7f47e5a06754))
* **view:** :bug: 修复系统托盘闪烁和提示菜单内容不显示问题 ([4954b1c](https://github.com/HuLaSpark/HuLa/commit/4954b1cc241ed0275619d7c3b7db2b7ead7e680e))
* **view:** :bug: 修复系统托盘信息提示菜单内容展示问题和点击跳转问题 ([2c8b15c](https://github.com/HuLaSpark/HuLa/commit/2c8b15cd3a971de02c50c682b2f3b8902ba52479))
* **view:** :bug: 修复win下忘记密码页面背景颜色问题 ([bd825e0](https://github.com/HuLaSpark/HuLa/commit/bd825e0c32534be3cce4788de8b53d9c686c7464))


### ⚡️ Performance Improvements | 性能优化

* **component:** :zap: 优化群聊成员和公告展示、以及完成搜索会话功能 ([a8bf8e0](https://github.com/HuLaSpark/HuLa/commit/a8bf8e00aba0ea0df35cc165ae0fc71aa333e511))
* **component:** :zap: 优化消息回复表情功能 ([2081e99](https://github.com/HuLaSpark/HuLa/commit/2081e99d4ad45b8f13ebf57ae7f6b5cceb6f1dbc))
* **component:** :zap: 优化emoji的样式和展示 ([f0aa001](https://github.com/HuLaSpark/HuLa/commit/f0aa0014a9d6a5ff32a537f4900a61ce340db6de))
* **service:** :zap: 优化websocket可以在窗口隐藏后继续监听 ([884a53e](https://github.com/HuLaSpark/HuLa/commit/884a53e4484a1a0d0efbcb17f5761ddd80409461))
* **view:** :zap: 优化在登录框下未提示更新、右下角窗口可拖动问题 ([777951b](https://github.com/HuLaSpark/HuLa/commit/777951bb8cff2383611a81e9aaaa4fc2c2e7f6a6))

## [2.6.10](https://github.com/HuLaSpark/HuLa/compare/v2.6.9...v2.6.10) (2025-05-05)


### ✨ Features | 新功能

* **component:** :sparkles: 增加公告类型消息 ([f0b0656](https://github.com/HuLaSpark/HuLa/commit/f0b0656ddc874a597a49de2e4f8666913730e759))
* **view:** :sparkles: 新增发布群公告功能 ([#259](https://github.com/HuLaSpark/HuLa/issues/259)) ([87fc30d](https://github.com/HuLaSpark/HuLa/commit/87fc30d170996022379b45d9b94110edbe1c5c74))


### 🐛 Bug Fixes | Bug 修复

* **chat:** 隔离聊天窗口内部数据 ([#258](https://github.com/HuLaSpark/HuLa/issues/258)) ([635f729](https://github.com/HuLaSpark/HuLa/commit/635f72996b8e03e1c00bc20fe9ad870ae8d303f4))
* **component:** :bug: 修复表情包圆角样式 ([e5e1725](https://github.com/HuLaSpark/HuLa/commit/e5e1725d42b41c2bc518e5f4c91cbdbb5f2a3421))
* **component:** :bug: 修复公告排序问题、公告加载更多重复数据问题 ([8d21d22](https://github.com/HuLaSpark/HuLa/commit/8d21d2228a6f743faa1aa4bf635d9fe8d41efd1f))
* **component:** :bug: 修复链接卡片无法点击后默认浏览器打开的问题 ([296a944](https://github.com/HuLaSpark/HuLa/commit/296a944c9f0312548e668ae1a6b831d821b502d2))
* **component:** :bug: 修复全选意外选中全部内容的问题 ([6616a93](https://github.com/HuLaSpark/HuLa/commit/6616a932c57a7189d1540575332471d03684f49b))
* **component:** :bug: 修改群聊中群消息设置逻辑 ([62460fb](https://github.com/HuLaSpark/HuLa/commit/62460fbfe04802764d5a4d60430d587ecbee528d))
* **component:** :bug: 修改url文本解析样式 ([0d5455c](https://github.com/HuLaSpark/HuLa/commit/0d5455c9c590406878c572b667dbf8d21ae7a5b1))
* **readme:** :bug: 修改readme中的描述 ([91feb14](https://github.com/HuLaSpark/HuLa/commit/91feb14ff4fa77c6bb11aeddd90863cd197fec78))


### ⚡️ Performance Improvements | 性能优化

* **component:** :zap: 优化消息点赞和不满功能 ([4d17127](https://github.com/HuLaSpark/HuLa/commit/4d171273e9ba4f6e584206720eeae636d72626e6))

## [2.6.9](https://github.com/HuLaSpark/HuLa/compare/v2.6.8...v2.6.9) (2025-04-20)


### ✨ Features | 新功能

* 回复可以回复表情包、图片 ([#251](https://github.com/HuLaSpark/HuLa/issues/251)) ([4180906](https://github.com/HuLaSpark/HuLa/commit/418090604a08a189ae94d487f762406a3bc853ab))
* **hooks:** 优化消息类型判断逻辑 ([#249](https://github.com/HuLaSpark/HuLa/issues/249)) ([82c3fd5](https://github.com/HuLaSpark/HuLa/commit/82c3fd529c96153a198f1425d02751173761de0b))
* **view:** :sparkles: 新增中版本强制更新功能 ([#252](https://github.com/HuLaSpark/HuLa/issues/252)) ([edbd3de](https://github.com/HuLaSpark/HuLa/commit/edbd3defccdfe0d1b6163e82193316f3044217db)), closes [#183](https://github.com/HuLaSpark/HuLa/issues/183) [#183](https://github.com/HuLaSpark/HuLa/issues/183) [#183](https://github.com/HuLaSpark/HuLa/issues/183)
* **view:** :sparkles: 新增子窗口创建方式和邀请加群功能 ([b2a15ca](https://github.com/HuLaSpark/HuLa/commit/b2a15ca5e219b32115702d06f937a396ddaf57c5))
* **worker:** :sparkles: 代理实现 ([#232](https://github.com/HuLaSpark/HuLa/issues/232)) ([d4bf21d](https://github.com/HuLaSpark/HuLa/commit/d4bf21d464cc1faea22abcb5369daef6360cd1e0)), closes [#197](https://github.com/HuLaSpark/HuLa/issues/197)


### 🐛 Bug Fixes | Bug 修复

* 修复回复框错位 BUG ([#256](https://github.com/HuLaSpark/HuLa/issues/256)) ([e46ee95](https://github.com/HuLaSpark/HuLa/commit/e46ee95bb872812101fb0938a6ffdf161a28308f)), closes [#253](https://github.com/HuLaSpark/HuLa/issues/253)
* **common:** :bug: 修复回复表情包或者emoji的时候位置偏移 ([f9a2b18](https://github.com/HuLaSpark/HuLa/commit/f9a2b184735a718ea1063f0914837d0bef36367c))
* **common:** :bug: 修复FloatBlockList组件悬浮层bug ([2b9a7ed](https://github.com/HuLaSpark/HuLa/commit/2b9a7edaef876aeea2a9c4605e136c413675a4f2))
* **config:** :bug: 修复renovate配置问题 ([6b02f3f](https://github.com/HuLaSpark/HuLa/commit/6b02f3fc61f73bf65e594e9aa23aa610996be429))
* **hook:** :bug: 修复回复时出现空格符和回复替换等问题 ([b8c3c4e](https://github.com/HuLaSpark/HuLa/commit/b8c3c4eec26212a584f3e368c7b4782b2c5e8f07))
* **hook:** :bug: 修改mac下子窗口创建逻辑 ([7f8795c](https://github.com/HuLaSpark/HuLa/commit/7f8795c36a158359aaf82e491c927ddf5c80c8ee))
* **hooks:** :bug: 修复一些xss的问题 ([bcce4a0](https://github.com/HuLaSpark/HuLa/commit/bcce4a01d4a0955d82dcbb82ec570435fa69a343))
* **layout:** :bug: 回退增加系统通知功能 ([c7fbdd7](https://github.com/HuLaSpark/HuLa/commit/c7fbdd7a0290355a186732f2419ceddc20741e01))
* **message:** 将消息内容解析为文本而不当做 HTML 处理 [#237](https://github.com/HuLaSpark/HuLa/issues/237) ([#246](https://github.com/HuLaSpark/HuLa/issues/246)) ([3441b8a](https://github.com/HuLaSpark/HuLa/commit/3441b8a28286c9e69f27338a6974ebd26eeb69bf))
* **Plugins:** :bug: 修复插件卸载后，重新打开插件列表，状态依旧是安装状态问题 ([#247](https://github.com/HuLaSpark/HuLa/issues/247)) ([3cee949](https://github.com/HuLaSpark/HuLa/commit/3cee9498d79a0f2b00fd5ecbac87f3d260d4b449))
* **Plugins:** :bug: 修复插件卸载后，重新打开插件列表，状态依旧是安装状态问题（list布局） ([#248](https://github.com/HuLaSpark/HuLa/issues/248)) ([9e4f31e](https://github.com/HuLaSpark/HuLa/commit/9e4f31ea526230a0ce0e1f8b48302c3dc5792eb8))
* **view:** :bug: 修复会话中转义字符的问题 ([b793f71](https://github.com/HuLaSpark/HuLa/commit/b793f71f26507a4e9b6402dd8a3dd3cfac75c5f8))


### ⚡️ Performance Improvements | 性能优化

* **component:** :zap: 优化链接的展示和解析 ([74bf370](https://github.com/HuLaSpark/HuLa/commit/74bf3702c73b751c0e3165c357064136896d548f))
* **component:** :zap: 优化屏蔽后的逻辑 ([2a5b9de](https://github.com/HuLaSpark/HuLa/commit/2a5b9de68b64ceacd535074aaf6284060d869918))
* **component:** :zap: 优化群备注和群昵称(beta) ([fab231a](https://github.com/HuLaSpark/HuLa/commit/fab231a9166acac97d50426109e2e37364a2d794))
* **rust:** :zap: 修改mac系统托盘的右键菜单 ([6dbfa49](https://github.com/HuLaSpark/HuLa/commit/6dbfa496b4c18581e5915890033c6ebdf65a6976))

## [2.6.8](https://github.com/HuLaSpark/HuLa/compare/v2.6.7...v2.6.8) (2025-03-26)


### ✨ Features | 新功能

* **component:** :sparkles: 增加兼容七牛云上传功能 ([eca26a9](https://github.com/HuLaSpark/HuLa/commit/eca26a977d315da23dec8c178b96b7db3b8a804f))
* **component:** :sparkles: 增加邮箱登录、PIN输入框 ([4be6db7](https://github.com/HuLaSpark/HuLa/commit/4be6db7d31e77efd93cef9c4108ae0a8cc7ef2e0))


### 🐛 Bug Fixes | Bug 修复

* **chat:** 修复回复消息导致光标偏移 [#223](https://github.com/HuLaSpark/HuLa/issues/223) ([#224](https://github.com/HuLaSpark/HuLa/issues/224)) ([2cbf727](https://github.com/HuLaSpark/HuLa/commit/2cbf7273fb107de1bf363958758aa0a61e1206b4))
* **component:** 🐛 使用setShow手动触发Popover显示 ([#230](https://github.com/HuLaSpark/HuLa/issues/230)) ([28fdc79](https://github.com/HuLaSpark/HuLa/commit/28fdc79e1891ca0f81cafe44d65c806bf2bda4f8)), closes [#210](https://github.com/HuLaSpark/HuLa/issues/210) [#210](https://github.com/HuLaSpark/HuLa/issues/210) [#210](https://github.com/HuLaSpark/HuLa/issues/210)
* **hooks:** replace focus call with focusOn function in useMsgInput ([#227](https://github.com/HuLaSpark/HuLa/issues/227)) ([9deefc0](https://github.com/HuLaSpark/HuLa/commit/9deefc0fa21df42def3aac8012d622e46a270ef4)), closes [#151](https://github.com/HuLaSpark/HuLa/issues/151)
* Implement placeholder by CSS ([#226](https://github.com/HuLaSpark/HuLa/issues/226)) ([9e867c6](https://github.com/HuLaSpark/HuLa/commit/9e867c672c482e3ca38b03033d80cd79df1c457d))

## [2.6.7](https://github.com/HuLaSpark/HuLa/compare/v2.6.6...v2.6.7) (2025-03-18)


### ✨ Features | 新功能

* **component:** :sparkles: 增加表情包功能 ([f0e9f27](https://github.com/HuLaSpark/HuLa/commit/f0e9f27c5fbf28759c5f6520ba49af5649714bb1))
* **component:** :sparkles: 增加动画表情处理 ([bc65a3b](https://github.com/HuLaSpark/HuLa/commit/bc65a3bd5a97255dbaade6fc4f5e63f29647fdcf))
* **component:** :sparkles: 增加会话列表右键菜单功能(免打扰) ([6731c89](https://github.com/HuLaSpark/HuLa/commit/6731c89c32ed32c38d1913876d3e9df3d168f969))
* **component:** :sparkles: 增加localStorage缓存消息列表(暂时) ([e714431](https://github.com/HuLaSpark/HuLa/commit/e7144313a4858bd5c918e9d9a4d377b0ce8cadbc))
* **vite:** add vite-plugin-vue-devtools for enhanced debugging ([#219](https://github.com/HuLaSpark/HuLa/issues/219)) ([a8b548c](https://github.com/HuLaSpark/HuLa/commit/a8b548cb0bca1eedcd5d16e4589eded8761d2455))


### 🐛 Bug Fixes | Bug 修复

* **chat-editor:** record cursor position correctly ([#221](https://github.com/HuLaSpark/HuLa/issues/221)) ([6ad6c58](https://github.com/HuLaSpark/HuLa/commit/6ad6c586912eeeb04a6ea49d9bbf0b5962fdfcc6))
* **component:** :bug: 完善消息免打扰功能和样式 ([0eed677](https://github.com/HuLaSpark/HuLa/commit/0eed67780521a28cb51a4272498add8f008f784f))
* **component:** :bug: 修复缓存存储问题、会话切换后聊天框内容混合问题 ([51b7d62](https://github.com/HuLaSpark/HuLa/commit/51b7d621fad80cee15aedf201068103c4e88a23d))
* **component:** :bug: 修复回复的内容宽度问题 ([0dcddfc](https://github.com/HuLaSpark/HuLa/commit/0dcddfc810b731e194c2a37f16d56473bbf0607a))
* **component:** :bug: 修复新消息回复无法跳转问题 ([65264b3](https://github.com/HuLaSpark/HuLa/commit/65264b3dacb8820a9938f107408ec31306a0738e))
* **component:** :bug: 修复用户上线推送的数据类型错误问题 ([474a388](https://github.com/HuLaSpark/HuLa/commit/474a3886f45476e2640a86f3fb8c991fc96399ee))
* **component:** :bug: 修复右键二级菜单图标错误bug ([0b97ccb](https://github.com/HuLaSpark/HuLa/commit/0b97ccb76785e5f8a13466ad93a8b32beb213572))
* **component:** :bug: 修复win下聊天框滚动条隐藏坍塌问题和会话快速切换的异步竞态问题 ([a39c054](https://github.com/HuLaSpark/HuLa/commit/a39c054b6264fb2cc0addfb2d1970b880ba53fd4))
* **layout:** :bug: 修复F5刷新会使窗口变大的bug ([#214](https://github.com/HuLaSpark/HuLa/issues/214)) ([51baa1a](https://github.com/HuLaSpark/HuLa/commit/51baa1a907a1339d354fbe3f131cdf87a9d9a49a))
* **store:** :bug: 修复群聊列表获取不到问题(后续把stores中定义的reactive换为ref) ([40e9786](https://github.com/HuLaSpark/HuLa/commit/40e97862153a084542bb263f2d5bd33f3dc39472))
* **util:** :bug: 修复消息上报在未登录的时候触发问题 ([34e6633](https://github.com/HuLaSpark/HuLa/commit/34e663373b1885fab34724b6ef2091a9bb9a9bc0))
* **view:** :bug: 修复重新启动应用后的登录逻辑 ([1560cb4](https://github.com/HuLaSpark/HuLa/commit/1560cb4a0bc8729f4b008ba8c96ee6918a8b6dfe))


### ⚡️ Performance Improvements | 性能优化

* **component:** :zap: 优化好友申请列表 ([52f9047](https://github.com/HuLaSpark/HuLa/commit/52f9047299282c1d5b2f67efbd6f2fc865fc476e))
* **component:** :zap: 优化好友申请列表和群详情 ([15d16e5](https://github.com/HuLaSpark/HuLa/commit/15d16e567f2082c0ee87939a9816e1c7c84ae362))
* **component:** :zap: 优化好友页面和聊天页面切换需要重新加载问题 ([20f52e4](https://github.com/HuLaSpark/HuLa/commit/20f52e471bd8684036b1ecfa8ecf6064ea75cc18))
* **component:** :zap: 优化群聊操作(我的群昵称、群备注、群名称) ([dcf4664](https://github.com/HuLaSpark/HuLa/commit/dcf4664a185b6ab83b324a9e40e191b99c6e09a9))
* **component:** :zap: 优化群聊详情显示 ([6960555](https://github.com/HuLaSpark/HuLa/commit/696055585c9d734d069b0d9d797aad7b62cd88ee))
* **component:** :zap: 优化头像上传功能（群头像） ([7e865c7](https://github.com/HuLaSpark/HuLa/commit/7e865c7cb0e6f1c6d4fb87c1a95a8aa2471304fa))
* **component:** :zap: 优化消息列表 ([1bc38ba](https://github.com/HuLaSpark/HuLa/commit/1bc38ba4c1dea8d0ca830166b9bbbc3e6f41c845))
* **component:** :zap: 优化虚拟列表 ([19d699b](https://github.com/HuLaSpark/HuLa/commit/19d699b19f7e324ca01c852400add6a98ed3ef5f))
* **component:** :zap: 优化虚拟列表滚动掉帧问题 ([3bea8d9](https://github.com/HuLaSpark/HuLa/commit/3bea8d9f02ae179528b8673eb3f9cc6894a58381))
* **component:** :zap: 优化虚拟列表加载更多闪屏的问题和消息气泡动画问题 ([530ce3e](https://github.com/HuLaSpark/HuLa/commit/530ce3e63d74d97a2fbc10ad862a7fe166365bb0))
* **component:** :zap: 优化右键二级菜单弹出的问题 ([90d55bb](https://github.com/HuLaSpark/HuLa/commit/90d55bb4baefa287fd458ed8f089786a9fb5d372))
* **component:** :zap: 优化右键二级菜单点击事件不触发问题、拆分屏蔽消息和免打扰功能 ([29bec4f](https://github.com/HuLaSpark/HuLa/commit/29bec4f373d2e8ce1dbcc5a88d02844b70a0b9e1))
* **view:** :zap: 优化群主管理员标签样式 ([64eefbe](https://github.com/HuLaSpark/HuLa/commit/64eefbe7bdaef03b4598776c64f01ecdbe90626d))
* **view:** :zap: 优化申请群聊功能 ([c492c0d](https://github.com/HuLaSpark/HuLa/commit/c492c0d18e9b0288ae45827b71bd29f4632bb636))
* **view:** :zap: 优化项目中类型的编写和定义方式 ([a832dc1](https://github.com/HuLaSpark/HuLa/commit/a832dc1220468de33f724c78256047a84ff62811))

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
