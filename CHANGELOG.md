

## 2.5.8 (2024-12-12)


### ⚠ BREAKING CHANGES

* **util:** http请求异常bug
* **style:** 修复mac端图标和windows端图标的大小不一致问题｜重新单独配置不同系统的不同tauri.conf.json文件
* **component:** 使用本地连接icon
* **system:** 新增mac端弹出框的关闭按钮

### ✨ Features | 新功能

* :sparkles: 发布v1.6.0版本 ([71a1dd9](https://github.com/HuLaSpark/HuLa/commit/71a1dd93833d4c9534945f28fe636115ef59e862))
* chatbot删除全部会话功能和右键菜单重命名 ([3426c5f](https://github.com/HuLaSpark/HuLa/commit/3426c5f24fafe66c3543ee8f4172d2dae05740e4))
* **common:** :sparkles: 在设置中新增指引视频 ([e8a8acf](https://github.com/HuLaSpark/HuLa/commit/e8a8acf99007383df3f898947da9798cf6b8c376))
* **common:** :sparkles: 新增修改字体功能 ([6bd6f64](https://github.com/HuLaSpark/HuLa/commit/6bd6f641f1c012dd53bd7dcb5cf4a314bf7d527b))
* **component:** :sparkles: 新增GPT欢迎页面，完善设置页面 ([9b771e0](https://github.com/HuLaSpark/HuLa/commit/9b771e02ec31af1238f9662e839df6197f501376))
* **component:** :sparkles: 新增GPT组件 ([7260840](https://github.com/HuLaSpark/HuLa/commit/7260840f4b50bcbb4dad8645a84ade8280de4036))
* **component:** :sparkles: 新增GPT页面设置功能 ([4c85b4a](https://github.com/HuLaSpark/HuLa/commit/4c85b4afccdafe83aa0fcbd53e94ef5fc63a7a70))
* **component:** :sparkles: 新增创建群聊弹窗 ([10fb45f](https://github.com/HuLaSpark/HuLa/commit/10fb45f8d9cc48058ad54c8c24ce50ab434a45a8))
* **component:** :sparkles: 新增插件功能(Bate) ([392b7c9](https://github.com/HuLaSpark/HuLa/commit/392b7c99bd38fd2f298e7732499dc7510e4d286a))
* **component:** :sparkles: 新增是否启用界面阴影功能、收缩页面按钮功能 ([085a773](https://github.com/HuLaSpark/HuLa/commit/085a773967fd0a26525a2f87dc1d8fddb8d71f1a))
* **component:** :sparkles: 新增苹方作为默认字体 ([aa1e07b](https://github.com/HuLaSpark/HuLa/commit/aa1e07b521f2f991d25a115d489c2b7a810c3313)), closes [#15](https://github.com/HuLaSpark/HuLa/issues/15)
* **components:** :sparkles: 完善右键功能的显示资料 ([cf4820b](https://github.com/HuLaSpark/HuLa/commit/cf4820bffbdee50fc1e7b44c72b51cd2c4d80091))
* **components:** :sparkles: 实现群聊回复表情功能 ([1fb3530](https://github.com/HuLaSpark/HuLa/commit/1fb3530cbdceef702430b272b99d3e99277c52d0))
* **hook:** :sparkles: 添加消息保存到本地数据库功能 ([8b67a1b](https://github.com/HuLaSpark/HuLa/commit/8b67a1b0b67822d70459b26beaf85b4fb9e2cab2))
* **hooks:** :sparkles: 新增 useMitter 钩子以替代直接使用 Mitt 事件总线 ([44db95d](https://github.com/HuLaSpark/HuLa/commit/44db95d3fecdad11155e9583f85d5b51d1407173))
* **ide:** :sparkles: 新增.idea文件提供idea的项目图标 ([84b6039](https://github.com/HuLaSpark/HuLa/commit/84b6039a81370d9d71c8394e6dbb4145b1fb7f1e))
* **layout:** :sparkles: 自动更新增加进度条 ([4ee3e2b](https://github.com/HuLaSpark/HuLa/commit/4ee3e2b8a36b34cdc996a8b538bddea61bbf1af2))
* **layout:** :sparkles: 菜单优化|插件优化|新增菜单显示模式切换 ([78f09c5](https://github.com/HuLaSpark/HuLa/commit/78f09c5bb9449f5546823f71265c247c137a9e55))
* **plugin:** :sparkles: 限制只能一台设备打开一个客户端 ([ab9a515](https://github.com/HuLaSpark/HuLa/commit/ab9a5153fecb6da048540247bbae63080399540b))
* **setting:** :sparkles: 新增开机启动功能 ([91ad538](https://github.com/HuLaSpark/HuLa/commit/91ad538f72909e16f232310a58a5b7610dfd08f0))
* **style:** :sparkles: 完善超级变变变样式更改 ([4b25751](https://github.com/HuLaSpark/HuLa/commit/4b25751e6e6aa0706090c3e8cd3c6bffa4d61468))
* **style:** :sparkles: 新增超级变变变功能(Beta) ([16b0879](https://github.com/HuLaSpark/HuLa/commit/16b08797eceff2779a561dfb1d09bb31aa481473))
* **style:** :sparkles: 新增项目版本信息打印 ([e17cb7c](https://github.com/HuLaSpark/HuLa/commit/e17cb7c24a233417ab34a1de3b04cbdc32ebc2e0))
* **view:** :sparkles: 新增GPT首页推荐功能样式 ([e927a95](https://github.com/HuLaSpark/HuLa/commit/e927a95fa4f95da7299459941b00d2f633217bca))
* **view:** :sparkles: 新增搜索页面功能 ([866ba89](https://github.com/HuLaSpark/HuLa/commit/866ba89b93d1a2587afb16fac745779093b9af19))
* **view:** :sparkles: 新增新消息状态栏图标闪烁 ([09264b7](https://github.com/HuLaSpark/HuLa/commit/09264b7918c11044fe2830a8c5607cceb162d106))
* **view:** :sparkles: 新增锁屏功能 ([1407343](https://github.com/HuLaSpark/HuLa/commit/14073438d5a9dc82117a84f97b5bd8f239fdfcd4))


### 🐛 Bug Fixes | Bug 修复

* **api:** 修改websocket请求地址, 修改请求方式采用fetch处理 ([e55f863](https://github.com/HuLaSpark/HuLa/commit/e55f86385fb8e25e826ae57341e0d818f5fe34b2))
* **build:** :bug: 修复release配置导致打包的问题 ([4cd9a93](https://github.com/HuLaSpark/HuLa/commit/4cd9a9355d3c5cbd9101b709a839017c92538bfd))
* **build:** :bug: 修复因为类型导致打包出错 ([db26e6b](https://github.com/HuLaSpark/HuLa/commit/db26e6bdf65003c1263574464a194236aa341129))
* **build:** :bug: 升级wry版本修复mac安装报错问题 ([fefa2f9](https://github.com/HuLaSpark/HuLa/commit/fefa2f970305839064764cd1d82a0d8e557f3148))
* **build:** :bug: 添加不同编译版本，以修复不同架构安装出错问题 ([19fb138](https://github.com/HuLaSpark/HuLa/commit/19fb138d51afd2884c1abd7fc62ae47762c2678b))
* **common:** :bug: 修复插件下载模块进度问题 ([85bc525](https://github.com/HuLaSpark/HuLa/commit/85bc525c1191d65eee0aef0592bf6a2e47746244))
* **component:** :bug: 修复ait弹出框问题 ([b40d233](https://github.com/HuLaSpark/HuLa/commit/b40d233e999143f734b9a10715f872fade33f0c4))
* **component:** :bug: 修复windows上的样式问题 ([bb6a9d4](https://github.com/HuLaSpark/HuLa/commit/bb6a9d440db4777989d9a922a5135350e2dbf894))
* **component:** :bug: 修复系统托盘功能和一些样式问题 ([18277ef](https://github.com/HuLaSpark/HuLa/commit/18277ef0f1ce286b77b91dbc8c6ea8a628eba7d3))
* **component:** :bug: 修复群聊侧边栏搜索时无法右键查看用户信息 ([f5b5bb0](https://github.com/HuLaSpark/HuLa/commit/f5b5bb09c8711227e4ccb9e3bc4e65bdc52415b9))
* **component:** :bug: 修复群聊当前登录用户右键菜单功能逻辑错误 ([00c35ff](https://github.com/HuLaSpark/HuLa/commit/00c35ff6feda18623c608b8aa29529c30a48e528))
* **component:** :bug: 修复聊天框内右键菜单问题 ([e59630b](https://github.com/HuLaSpark/HuLa/commit/e59630b70ed0d245174c97136d502bb63cac03ec))
* **component:** :bug: 修复聊天框右键菜单问题和添加好友等一些已知问题 ([69b4cbd](https://github.com/HuLaSpark/HuLa/commit/69b4cbd63f7bb8cd286d4c673babf08bd1fb2008))
* **component:** :bug: 修复输入框换行不兼容webkit的问题 ([345d830](https://github.com/HuLaSpark/HuLa/commit/345d83068711df087dd0ba403446c739151a11dd))
* **components:** :bug: 修复回复功能缺陷 ([af50422](https://github.com/HuLaSpark/HuLa/commit/af5042261bc598a68b94db780a332ab38d5a577c))
* **config:** :bug: 修复因为notify窗口没有配置问题导致mac下打不开 ([d940838](https://github.com/HuLaSpark/HuLa/commit/d940838f380c8e626926dae1dceea6a4076ea83f)), closes [#55](https://github.com/HuLaSpark/HuLa/issues/55)
* **global:** :bug: 修复艾特弹窗在mac下高度问题导致不显示 ([8a18e84](https://github.com/HuLaSpark/HuLa/commit/8a18e84ce781a7a987575ed9f27d2a8eff334bb6))
* **hook:** :bug: 修复发送消息频繁的bug ([bbb74ee](https://github.com/HuLaSpark/HuLa/commit/bbb74ee78a425375a44ce6940dbed0b8265b618c))
* **hook:** :bug: 修复回复功能不显示问题 ([9d0fee7](https://github.com/HuLaSpark/HuLa/commit/9d0fee7e5eb0919846d526b1f5a331d3a47f68d8))
* **layout:** :bug: 代码修复 ([96ad89c](https://github.com/HuLaSpark/HuLa/commit/96ad89c05d2b9d104b4a80f064892d63381441a2))
* **layout:** :bug: 修复ts类型错误导致打包出差问题 ([0d7f7e0](https://github.com/HuLaSpark/HuLa/commit/0d7f7e024d9404fe5fe6829504594a902c27c501))
* **layout:** :bug: 修复侧边栏顶部空白块颜色和无法缩小主页面问题 ([1999f30](https://github.com/HuLaSpark/HuLa/commit/1999f30b0e363d63bf1f1a8c0fda7bdc80c9b8b7))
* **layout:** :bug: 修复更新弹窗显示更新的内容 ([bd7f6fb](https://github.com/HuLaSpark/HuLa/commit/bd7f6fbe7f27e69275e54c776d761a1751289bf0))
* **layout:** :bug: 修复更新进度条显示异常bug ([45e2bfc](https://github.com/HuLaSpark/HuLa/commit/45e2bfce669c76cbb72be641febf59509b3e6204))
* **layout:** :bug: 修复登录不同账号会导致其他账号退出登录的问题 ([2b21f83](https://github.com/HuLaSpark/HuLa/commit/2b21f83bab32ed19504b9dad9aa32f33c73cec5b))
* **layout:** :bug: 修复窗体高度整体变大bug ([396a103](https://github.com/HuLaSpark/HuLa/commit/396a103a24255568f426b1c08e4d7e7beb60264b))
* **layout:** :bug: 修复聊天框改变宽度的时候可以选中文本的问题 ([56d79cc](https://github.com/HuLaSpark/HuLa/commit/56d79ccc8ba015a313eabcd938757f35d1d840a4))
* **layout:** :bug: 修复自动登录bug|修复登录token未保存bug|其他优化 ([945502f](https://github.com/HuLaSpark/HuLa/commit/945502fa38fd8a7fb7d15bd1a7e8f018dddeac67))
* **layout:** :bug: 修复选择了图片不显示在输入框中的bug ([c7cdac6](https://github.com/HuLaSpark/HuLa/commit/c7cdac69ce6fa185489dcb480991e3a268fec99d))
* **layout:** :bug: 处理mitt合并冲突 ([f0766e1](https://github.com/HuLaSpark/HuLa/commit/f0766e1907a9411683de94b54072638d30d06478))
* **layout:** :bug: 处理异常关闭程序发送下线通知 ([2cf5e97](https://github.com/HuLaSpark/HuLa/commit/2cf5e97d1e05c1641c7919b2f4e521dd176860cd))
* **layout:** :bug: 处理退出账号bug|处理登录token有时未保存bug|其他优化 ([470efde](https://github.com/HuLaSpark/HuLa/commit/470efded2edff37a93e0a002a34ca7aec6c90172))
* **layout:** :bug: 插件菜单增加图标和点击事件 ([bcbb61a](https://github.com/HuLaSpark/HuLa/commit/bcbb61a652a121e2cf251d6b4dfefa1c7bf00dec))
* **rust:** :bug: 修复mac系统背景玻璃拟态导致的问题 (#IA5AO8) ([89a7605](https://github.com/HuLaSpark/HuLa/commit/89a7605055d3ab7de83491e1745773458237d7d3)), closes [#IA5AO8](https://github.com/HuLaSpark/HuLa/issues/IA5AO8)
* **service:** :bug: 修复http模块没有设置请求头导致请求报错问题 ([1538964](https://github.com/HuLaSpark/HuLa/commit/153896480e8a86cd50962d3678fae786ea444ebd))
* **service:** :bug: 修复异常退出登录bug，优化ws ([c671db8](https://github.com/HuLaSpark/HuLa/commit/c671db8d98dbce6fcdf248232a4a2eca020d770f))
* **service:** :bug: 修复打包后访问不了正式服务器的bug ([c8d42ab](https://github.com/HuLaSpark/HuLa/commit/c8d42ab31e1e6b41b3a30f1664d1be0c28d4ed36))
* **service:** :bug: 修复更新功能版本出错问题以及修复输入框和聊天框对于特殊字符和兼容性 ([9c1d23d](https://github.com/HuLaSpark/HuLa/commit/9c1d23d2060dbad13d4197517feec6d3a410e742))
* **service:** :bug: 修复请求体包裹多层data的问题 ([d97d24f](https://github.com/HuLaSpark/HuLa/commit/d97d24f1c1d554e5477b221c725e45100655c0e0))
* **service:** :bug: 修复请求接口bug ([f3723d4](https://github.com/HuLaSpark/HuLa/commit/f3723d4e5a2342314ce6e85931a49f1ddfecab0b))
* **service:** :bug: 处理pinia报错 ([c9d65dc](https://github.com/HuLaSpark/HuLa/commit/c9d65dc82a4777edf5f636a7b26bd976364d8d64))
* **store:** :bug: 上下线通知 ([2f2a2a2](https://github.com/HuLaSpark/HuLa/commit/2f2a2a2068143e723db3ec31cfce3f2397acf8d4))
* **store:** :bug: 修复store中保存的用户信息冲突导致登录的用户信息错乱问题 ([6119e42](https://github.com/HuLaSpark/HuLa/commit/6119e420b0b355cb6dde7f3f4d0d6e07f7202358))
* **store:** :bug: 修复一些接口的store封装 ([4626527](https://github.com/HuLaSpark/HuLa/commit/46265275e52fd30090a3d07a98f1023e9960b18d))
* **style:** :bug: 修复聊天消息框回复宽度限制问题 ([d0aca70](https://github.com/HuLaSpark/HuLa/commit/d0aca707a7a549aa0696a1074da62e58d7449056))
* **style:** :bug: 统一修复svg点击时有轮廓问题 ([ce68fa1](https://github.com/HuLaSpark/HuLa/commit/ce68fa134368b34802d5b101a1f98a2493f7120b))
* **system:** :bug: 修复mac端兼容问题 ([0daef59](https://github.com/HuLaSpark/HuLa/commit/0daef59a9f41326a8e82885c3b84857ec3761e92))
* **system:** :bug: 修复mac端右键菜单透明度问题 ([39d795f](https://github.com/HuLaSpark/HuLa/commit/39d795ff655afd699340d3021a0b471c3060b11c))
* **system:** :bug: 修复win下窗口高度不一致问题 ([30bb3de](https://github.com/HuLaSpark/HuLa/commit/30bb3de5d10ffea949c32b505f6501b3f7d0f573))
* **util:** :bug: http请求异常bug ([6e82a09](https://github.com/HuLaSpark/HuLa/commit/6e82a099a2a51ea08548c4d5da496393a94b7b05))
* **view:** :bug: 修复一些功能漏洞问题 ([#38](https://github.com/HuLaSpark/HuLa/issues/38)) ([f626a96](https://github.com/HuLaSpark/HuLa/commit/f626a96c1abfb00e07d53fceec12ea3cdd1faca0))
* **view:** :bug: 修复一些页面拖动区域问题 ([1183b7e](https://github.com/HuLaSpark/HuLa/commit/1183b7e3baabcbb9cfabe23327583221ae083ae8)), closes [#25](https://github.com/HuLaSpark/HuLa/issues/25)
* **view:** :bug: 修复侧边栏图标和字体宽度不一致问题 ([901218b](https://github.com/HuLaSpark/HuLa/commit/901218b043aa87ef4f5c972eb01aeb37ee4c56a5))
* **view:** :bug: 修复侧边栏文字模式下更多图标的样式 ([9d23424](https://github.com/HuLaSpark/HuLa/commit/9d234245877979cc031763a380dc264ea39bc74a)), closes [#IAVNW7](https://github.com/HuLaSpark/HuLa/issues/IAVNW7)
* **view:** :bug: 修复右下角消息提示位置不对bug ([db19672](https://github.com/HuLaSpark/HuLa/commit/db19672295ac8b1abc0489cf76b41dbf9d6b3ebe))
* **view:** :bug: 修复打开独立窗口后主窗口消息窗口无法打开问题 ([#36](https://github.com/HuLaSpark/HuLa/issues/36)) ([06435c8](https://github.com/HuLaSpark/HuLa/commit/06435c8d58250d4b9501431dc82c51643bc6e054))
* **view:** :bug: 修复消息输入框部分bug ([24b8a51](https://github.com/HuLaSpark/HuLa/commit/24b8a517d85f5895ae66db64ac7d6d8ae547cad4))
* **view:** :bug: 修复点击右侧布局页面时候不跳转回消息页 ([be0edf9](https://github.com/HuLaSpark/HuLa/commit/be0edf974778b58fe5af9ec030d9927999a6d7bb))
* **view:** :bug: 修复登录和请求的一些缺陷 ([54ee3ff](https://github.com/HuLaSpark/HuLa/commit/54ee3ff1688ec1dd248b5e7120e3613ce8758ac9))
* **view:** :bug: 修复自动登录bug ([8b1da81](https://github.com/HuLaSpark/HuLa/commit/8b1da812e1845190a708ea146cb075ef907dd12d))
* **view:** :bug: 固定右下角消息提示位置 ([5bc78d2](https://github.com/HuLaSpark/HuLa/commit/5bc78d2c8b4aa6e1f69d2f6d9e01db6b23ee7e9d))
* **view:** :bug: 状态栏菜单bug修复 ([845b83e](https://github.com/HuLaSpark/HuLa/commit/845b83ebcd7b993468b335073b0b9c7a23b6eddd))


### ⚡️ Performance Improvements | 性能优化

* :zap: 优化mac标签栏 ([a7c587d](https://github.com/HuLaSpark/HuLa/commit/a7c587d74b771e32e3b61eaef2ba5c902c0e4f6f))
* :zap: 优化锁屏页面功能 ([85b6cad](https://github.com/HuLaSpark/HuLa/commit/85b6cad03fdcd538adbdae9fc2e63e0ef72b465a))
* :zap: 发布v2.2.0版本 ([2a47187](https://github.com/HuLaSpark/HuLa/commit/2a47187f8726b6e38ffbf76bda034e6daeaebbd8))
* **component:** :zap: 优化一些代码和逻辑 ([4b500a1](https://github.com/HuLaSpark/HuLa/commit/4b500a1c9ef60dda95f513755ea362a865194e55))
* **component:** :zap: 优化右键@和发送消息功能 ([91e8703](https://github.com/HuLaSpark/HuLa/commit/91e8703af0c66a61eddec245fe1132d26194a303))
* **component:** :zap: 优化右键菜单功能 ([7b53029](https://github.com/HuLaSpark/HuLa/commit/7b530297ac37122ead00a15864e16a73a5547d04))
* **component:** :zap: 优化撤回信息后的功能 ([7cbb443](https://github.com/HuLaSpark/HuLa/commit/7cbb443e84f04e6b19f45a0fa779639d75a4939e))
* **component:** :zap: 优化新增群组功能 ([e33de24](https://github.com/HuLaSpark/HuLa/commit/e33de24dec294bccb68e10821f05b09d09c1f358))
* **component:** :zap: 优化注册流程和样式 ([3d59a7d](https://github.com/HuLaSpark/HuLa/commit/3d59a7d6d0e0558f04e96dc536e1e8cfb0955520))
* **component:** :zap: 优化消息气泡发送状态提示 ([90b7c91](https://github.com/HuLaSpark/HuLa/commit/90b7c91264e88052d3cc1086b81900cf08d0e213))
* **component:** :zap: 升级插件版本内容及其样式 ([8d65ca1](https://github.com/HuLaSpark/HuLa/commit/8d65ca198fa8a01252e0dc7f07f4bd6c796dbfe1))
* **components:** :zap: 优化群聊回复表情功能 ([0c4615d](https://github.com/HuLaSpark/HuLa/commit/0c4615d4135fb3f740cb88f8f38502c9fc90bc5d))
* **components:** :zap: 优化表情回应 ([94d2cb1](https://github.com/HuLaSpark/HuLa/commit/94d2cb1fec8db8901ffc85cdf8680919c58abf11))
* **hook:** :zap: 优化useMitt的写法 ([004a696](https://github.com/HuLaSpark/HuLa/commit/004a6960100f2139ef7e3021db0da6081c60954a))
* **services:** :zap: 优化请求接口以及消息提示 ([0355f97](https://github.com/HuLaSpark/HuLa/commit/0355f976b854d96e613160d2bf6cc7e5605ea0ac))
* **style:** :zap: 优化聊天框内主题适配 ([60055af](https://github.com/HuLaSpark/HuLa/commit/60055afd1a58e12700c2e68995aa7068168b6318))
* **style:** :zap: 优化顶部栏和其他内容的一些样式 ([90929a4](https://github.com/HuLaSpark/HuLa/commit/90929a44312af5b93344c4169c0fc77b5d03fe9b))
* **system:** :zap: tauri-v2.0rc版本升级到正式版本 ([a34b2ce](https://github.com/HuLaSpark/HuLa/commit/a34b2cea9910da1d3e1ecbaf5c8fa98ad7a88438))
* **system:** :zap: 升级tauri-v2版本 ([57dcad1](https://github.com/HuLaSpark/HuLa/commit/57dcad1e9306421c161d555181a9deda48f5685e))
* **system:** :zap: 对接后端服务 ([ea4b82b](https://github.com/HuLaSpark/HuLa/commit/ea4b82be25a058a198716cebcf8becfcf252819c))
* **view:** :zap: 优化useMitt的取消时机 ([f7f6bc0](https://github.com/HuLaSpark/HuLa/commit/f7f6bc0ada6a6531586c74b08995056cb92d30ba))
* **view:** :zap: 优化代理功能 ([0cf8dc9](https://github.com/HuLaSpark/HuLa/commit/0cf8dc9bb9fafa66a419497bcf814f8fcc1cb791))
* **views:** :zap: 优化页面收缩功能 ([31f7e17](https://github.com/HuLaSpark/HuLa/commit/31f7e1732cbe571e3f53564c57a339812b2c1a5b))

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
