# 手动安装安卓环境

## 一、配置环境变量

**所需环境变量整体预览：**

1. 需要安装的HOME环境变量包括 `JAVA_HOME`、`NDK_HOME`、`ANDROID_HOME`
2. 环境变量 `path`中需要包含以下路径：
   `C:\env\android\`（详情看第2点）
   `C:\env\android\cmdline-tools\latest\bin`
   `C:\env\android\ndk\28.2.13676358`
   `C:\env\android\emulator`
   `C:\env\android\platforms\android-35`
   `C:\env\android\platform-tools`

### 1、配置JAVA_HOME（jdk版本需要17.0以上，本文档所使用jdk版本为17.0.13）

- 此项不再多说了~

### 2、安装安卓工具套件

- 1、进入[下载界面](https://developer.android.google.cn/studio?hl=zh-cn)，然后拉到最底下，根据自己系统选择对应文件下载，如Windows就选 `commandlinetools-win-13114758_latest.zip`
- 2、在系统中创建一个目录，用于保存安卓环境，例如在此文件夹：`C:\env\android\`，就把压缩包解压到其中，如：`C:\env\android\cmdline-tools\`
- 3、在 `C:\env\android\cmdline-tools\`文件夹中创建latest文件夹，然后**再把之前 `cmdline-tools\`里的全部内容都放到latest文件夹里**，目录如：`C:\env\android\cmdline-tools\latest`
- 4、打开系统变量，在 `path`编辑窗口里，新增一个环境变量 `C:\env\android\cmdline-tools\latest\bin`
- 5、关闭所有CMD工具包括IDE已经启动的，再重新打开以刷新环境变量
- 6、打开CMD输入 `sdkmanager --version`，若出现版本号即安装完成，如下所示：

```powershell
C:\Users\[用户]>sdkmanager --version
19.0
```

### 3、使用sdkmanager安装基本安卓工具

#### （1）所需工具预览

所需基本工具包含 `build-tools、emulator、ndk、platform-tools、platforms;android`这5种，如下所示：

```powershell
C:\Users\[用户]>sdkmanager --list_installed
[=======================================] 100% Fetch remote repository...
Installed packages:
  Path                                        | Version       | Description                                | Location
  -------                                     | -------       | -------                                    | -------
  build-tools;34.0.0                          | 34.0.0        | Android SDK Build-Tools 34                 | build-tools\34.0.0
  emulator                                    | 35.6.11       | Android Emulator                           | emulator
  ndk;28.2.13676358                           | 28.2.13676358 | NDK (Side by side) 28.2.13676358           | ndk\28.2.13676358
  platform-tools                              | 36.0.0        | Android SDK Platform-Tools                 | platform-tools
  platforms;android-34                        | 3             | Android SDK Platform 34                    | platforms\android-34
  platforms;android-35                        | 2             | Android SDK Platform 35                    | platforms\android-35
  system-images;android-35;google_apis;x86_64 | 9             | Google APIs Intel x86_64 Atom System Image | system-images\android-35\google_apis\x86_64
```

- **注意**：其中 `system-images;android-35;google_apis;x86_64`为安卓系统镜像，可根据选择安装，不一定要该版本

#### （2）基本使用命令：

1. `sdkmanager --list_installed`查看已安装的工具
2. `sdkmanager --list --channel=0`查看lts版本的全部列表

#### （3）安装安卓SDK包

1. 用 `sdkmanager --list --channel=0`命令查看 `platforms;android`开头的安卓SDK，并选择所需版本，例如：需要安卓SDK API Level 35版本的就是 `platforms;android-35`
2. Hula所使用安卓SDK版本为 `platforms;android-35`，输入指令 `sdkmanager "platforms;android-35"`，执行结果可能如下：

```powershell
C:\Users\[用户]>sdkmanager "platforms;android-35"
[=======================================] 100% Computing updates...
```

3. 执行 `sdkmanager --list_installed`查看安装是否成功，结果如前面（1）所示

#### （4）安装剩余工具

- 安装剩下的工具 `build-tools、emulator、ndk、platform-tools`，安装方法同（3）一样，安装完成后使用 `sdkmanager --list_installed`命令检查
- Hula平台所需工具集版本如下，可直接用 `sdkmanager xxx`安装：
  `emulator`
  `platform-tools`
  `ndk;28.2.13676358`
  `build-tools;34.0.0`

#### （5）最后检查

本文以 `C:\env\android\`为安卓环境路径，可在该路径下查找到安装的工具集文件夹，效果如下：

```powershell
C:\env\android>dir
 驱动器 C 中的卷没有标签。
 卷的序列号是 DC84-EF8E

 C:\env\android 的目录

2025/07/11  19:36    <DIR>          .
2025/07/11  16:19    <DIR>          ..
2025/07/14  15:46                16 .knownPackages
2025/07/11  19:36    <DIR>          .temp
2025/07/11  19:36    <DIR>          build-tools
2025/07/11  11:30    <DIR>          cmdline-tools
2025/07/11  16:52    <DIR>          emulator
2025/07/11  14:41    <DIR>          ndk
2025/07/11  15:01    <DIR>          platform-tools
2025/07/11  19:36    <DIR>          platforms
2025/07/11  16:52    <DIR>          system-images
               1 个文件             16 字节
              11 个目录 505,583,792,128 可用字节
```

### 4、新增NDK_HOME

1. 在环境变量下新增变量 `NDK_HOME`，变量值为 `C:\env\android\ndk\28.2.13676358`
2. 在 `path`中添加路径 `C:\env\android\ndk\28.2.13676358`
3. 验证配置是否完成（退出cmd重新打开），命令：

```powershell
C:\env\android>ndk-build --version
GNU Make 4.3
....
```

### 5、在 `path`中新增其它的环境变量

`C:\env\android\`（若按上面步骤操作，该环境已经存在，详情看第2点）
`C:\env\android\cmdline-tools\latest\bin`（若按上面步骤操作，该环境已经存在，详情看第2点）
`C:\env\android\ndk\28.2.13676358`（若按上面步骤操作，该环境已经存在，详情看第4点）
`C:\env\android\emulator`（新增）
`C:\env\android\platforms\android-35`（新增）
`C:\env\android\platform-tools`（新增）

- 验证新增的环境是否有效命令如下：

```powershell
C:\env\android>emulator --version
INFO         | Android emulator version 35.6.11.0 (build_id 13610412) (CL:N/A)
INFO         | Graphics backend: gfxstream
ERROR        | No AVD specified. Use '@foo' or '-avd foo' to launch a virtual device named 'foo'
```

```powershell
C:\env\android>avdmanager list device
Available devices definitions:
id: 0 or "automotive_1024p_landscape"
    Name: Automotive (1024p landscape)
    OEM : Google
    Tag : android-automotive-playstore
......
```

```powershell
C:\env\android>adb --version
Android Debug Bridge version 1.0.41
Version 36.0.0-13206524
Installed as C:\env\android\platform-tools\adb.exe
Running on Windows 10.0.22631
```

### 6、安装模拟器镜像

1. 控制台输入命令 `sdkmanager "system-images;android-35;google_apis;x86_64"`安装镜像（可选别的镜像版本）
2. 安装完成后，通过 `sdkmanager --list_installed`检查安装结果
3. 使用命令创建手机模拟器：

```powershell
C:\env\android>avdmanager create avd -n Pixel_35 -k "system-images;android-35;google_apis;x86_64" --device "pixel"
[=======================================] 100% Fetch remote repository...
Auto-selecting single ABI x86_64
```

- -n Pixel_35 是虚拟设备名称，可以自定义
- -k 指定定的镜像包
- --device 指定设备模板，如 pixel、Nexus 5 等，可通过 `avdmanager list device`查看

4. 启动模拟器

```powershell
C:\env\android>emulator -avd Pixel_35
INFO         | Android emulator version 35.6.11.0 (build_id 13610412) (CL:N/A)
INFO         | Graphics backend: gfxstream
INFO         | Found systemPath C:\env\android\system-images\android-35\google_apis\x86_64\
INFO         | Increasing RAM size to 2048MB
INFO         | IPv4 server found: 192.168.1.1
......
```

## 二、初始化Hula项目安卓版

### 1、初始化

执行命令 `pnpm tauri android init`即可初始化安卓版本

### 2、修改gradle-8.14-bin.zip的下载地址（换源）

在 `src-tauri/gen/android/gradle/wrapper/gradle-wrapper.properties`文件中，把 `distributionUrl`改成 `https\://mirrors.cloud.tencent.com/gradle/gradle-8.14.3-bin.zip`

## 三、Gradle依赖安装

### 自动安装

若想自动安装，减少多余依赖，可直接联网安装，若 `kotlin-compiler-embeddable-1.9.23.jar`和 `kotlin-compiler-embeddable-1.9.25.jar`包下载过慢，可看以下操作：

- 1、去[阿里云Maven仓库](https://maven.aliyun.com/mvn/search)手动下载以下依赖;
  `kotlin-compiler-embeddable-1.9.23.jar`
  `kotlin-compiler-embeddable-1.9.23.pom`
  `kotlin-compiler-embeddable-1.9.25.jar`
  `kotlin-compiler-embeddable-1.9.25.pom`
- 2、下载后检查路径下的文件夹是否存在（若文件夹不存在可手动创建）：`C:\Users\[用户]\.gradle\caches\modules-2\files-2.1\org.jetbrains.kotlin\kotlin-compiler-embeddable\`，完成后看以下操作：
  （1）在 `kotlin-compiler-embeddable\`下创建 `1.9.23`和 `1.9.25`文件夹，如：`kotlin-compiler-embeddable\1.9.23\`和 `kotlin-compiler-embeddable\1.9.25\`
  （2）查找或者计算以上四个文件的 `SHA1哈希值`，并且创建以该哈希值命名的文件夹，存放在对应版本的目录中，如：`kotlin-compiler-embeddable-1.9.23.pom`文件哈希值为 `40ba1092df8a70a092b12b1b6bbda1146424dfe5`，就存放在 `kotlin-compiler-embeddable\1.9.23\40ba1092df8a70a092b12b1b6bbda1146424dfe5\kotlin-compiler-embeddable-1.9.23.pom`

### 手动安装

若想手动安装，可直接下载压缩包[第一部分](https://wwjk.lanzoue.com/iEgSp315i5xg)和[第二部分](https://wwjk.lanzoue.com/id3F5315i9he)，下载完成后在路径中创建 `org.jetbrains.kotlin`文件夹（已有不用创建）：`C:\Users\[用户]\.gradle\caches\modules-2\files-2.1\`，例如：`C:\Users\[用户]\.gradle\caches\modules-2\files-2.1\org.jetbrains.kotlin\`，然后把两部分的压缩包内容都放到文件夹中

## 四、启动Hula移动端

### 1、启动Hula移动端

执行 `pnpm tauri android dev`，可选择模拟器和设备，效果如下：

```powershell
C:\project\rust\HuLa\src-tauri>pnpm tauri android dev
Detected Android emulators:
  [0] MyEmulator
  [1] Pixel_35
  Enter an index for a emulator above.
Emulator: 0
        Info Starting emulator MyEmulator
        Info Waiting for emulator to start...
        Info Waiting for emulator to start...
        Info Waiting for emulator to start...
......
```

- 注意：

1. 若有多个模拟器需选择，若无任何模拟器则会警告没有模拟器
2. 在启动时有可能需要安装rust的 `aarch64-linux-android`、`x86_64-linux-android`等。可通过 `rustup target add xxx`命令安装

### 2、有线调试

使用命令 `adb devices`查看真机设备，如：

```powershell
# 1.查看在线的真机（需要打开USB调试）
C:\Users\[用户]>adb devices
List of devices attached

# 2.查找到设备，但是需要认证
C:\Users\[用户]>adb devices
List of devices attached
10AD2E0JMA001C3 unauthorized

# 3.手机确认USB调试成功，可看到device标志
C:\Users\[用户]>adb devices
List of devices attached
10AD2E0JMA001C3 device

# 4. 启动Hula移动端，自动识别真机设备
C:\project\rust\HuLa>pnpm tauri android dev
 (V2304A) with target "aarch64-linux-android"11S
        Info Using 192.168.1.33 to access the development server.
        Info Replacing devUrl host with 192.168.1.33. If your frontend is not listening on that address, try configuring your development server to use the `TAURI_DEV_HOST` environment variable or 0.0.0.0 as host.
     Running BeforeDevCommand (`pnpm dev`)
......
```

### 3、无线调试

```powershell
# 1. 启动USB调试
C:\project\rust\HuLa\src\mobile>adb devices
List of devices attached
10AD7E0JMA001C2 device

# 2. 启动adb端口监听
C:\project\rust\HuLa\src\mobile>adb tcpip 9222 # 这里自定义为9222端口
restarting in TCP mode port: 9222 # 该结果可能会不一样

# 3. 连接无线设备
C:\project\rust\HuLa\src\mobile>adb connect 192.168.1.43:9222 # ip地址是手机的ip，在无线调试那里可以看到
failed to authenticate to 192.168.1.43:9222

# 4. 现在能看到有两个连接，一个是有线一个是无线
C:\project\rust\HuLa\src\mobile>adb devices
List of devices attached
10AD7E0JMA001C2 device
192.168.1.43:9222       device

# 5. 这时把数据线拔掉，但是usb调试千万不能关，然后再次查看
C:\project\rust\HuLa\src\mobile>adb devices
List of devices attached
192.168.1.43:9222       device # 表示无线调试已经完成

# <注意> 完成无线调试后，不能关闭usb调试和无线调试，否则会这样
C:\project\rust\HuLa\src\mobile>adb devices
List of devices attached
192.168.1.43:9222       offline

# 6. 启动Hula移动端，自动识别真机设备
C:\project\rust\HuLa\src\mobile>pnpm tauri android dev

> hula@2.6.13 adev C:\project\rust\HuLa
> tauri android dev

 (V2304A) with target "aarch64-linux-android"11S
        Info Using 192.168.1.33 to access the development server.
        Info Replacing devUrl host with 192.168.1.33. If your frontend is not listening on that address, try configuring your development server to use the `TAURI_DEV_HOST` environment variable or 0.0.0.0 as host.
     Running BeforeDevCommand (`pnpm tauri android dev`)

# <注意> 通过命令启动真机程序，程序优先选择真机运行，如果存在两个调试，则需要选择具体是哪个
C:\project\rust\HuLa\src\mobile>pnpm tauri android dev

> hula@2.6.13 adev C:\project\rust\HuLa
> tauri android dev

Detected Android devices:
 (V2304A)O 11S
 (V2304A)O 11S
  Enter an index for a device above.
Device: 1                            #（在这里需要手动选择，从0开始）
 (V2304A) with target "aarch64-linux-android"11S
        Info Using 192.168.1.33 to access the development server.
        Info Replacing devUrl host with 192.168.1.33. If your frontend is not listening on that address, try configuring your development server to use the `TAURI_DEV_HOST` environment variable or 0.0.0.0 as host.
     Running BeforeDevCommand (`pnpm tauri android dev`)
```

- 小建议：如果运行的是本地后端服务器，推荐用手机开热点，然后电脑连接手机热点来调试。这样无线连接速度会快很多。如图：
  ![image.png](https://foruda.gitee.com/images/1753416004115899372/8de817a9_9738380.png)

<h2>（重要！）结束调试后务必断开连接：</h2>

```powershell
C:\project\rust\HuLa\src\mobile>adb disconnect 192.168.1.43:9222
disconnected 192.168.1.43:9222
```

## 五、安卓UI调试（无线/有线真机和模拟器通用）

1、在谷歌浏览器（或谷歌内核浏览器）中输入网址 `chrome://inspect/#devices`
2、在浏览器中Remote Target可查看到当前已经连接到的真机，点击 `inspect`即可调试安卓UI
![真机调试.png](https://foruda.gitee.com/images/1752748948682584858/b46ef353_9738380.png)

## 六、关于安卓打包问题

Tauri 的 Android 壳包含 **Rust 原生代码**，Gradle 在 `src-tauri/gen/android/app/build.gradle.kts` 默认会同时打出
**arm64-v8a**、**armeabi-v7a**、**x86**、**x86_64** 四个 **ABI** 的变体（debug 里甚至显式保留各架构的符号）。为了给每个 ABI 提供
对应的 `.so`，`tauri android build` 会调用 `cargo ndk` 交叉编译，分别把产物放进 `src-tauri/target/aarch64-linux-android` 等目录。
`.cargo/config.toml` 也预先配置了四套 **NDK linker**，说明项目本身就是面向多 ABI 的。最终生成的 **universal APK/AAB** 会把所有 ABI 的原生
库一起打包，保证在不同 CPU（32/64 位 ARM、Android 模拟器用的 x86/x86_64）上都能安装运行。

**能否不生成呢？**

1. 如果你确信应用只会跑在某一种架构（例如大部分真机都支持的 **arm64-v8a**），可以在构建前限制 ABI 列表，比如在 PowerShell 中：

```powershell
$env:TAURI_ANDROID_ARCHS='arm64-v8a'; pnpm tauri android build
```

   这样 Tauri 只会编译并输出 `aarch64-linux-android` 目录。

2. 也可以在自定义的 Gradle 配置里设置 `android.splits.abi { include("arm64-v8a") }` 或 `ndk { abiFilters += "arm64-v8a" }`，但要放在不会
   被 `gen/android` 覆盖的位置（例如自建 `android/app/build.gradle.kts` 补丁脚本），否则下次 `tauri android init` 可能把改动冲掉。

3. **缩减 ABI 意味着 APK 只能在被包含的 CPU 架构上运行**。如果只保留 **arm64-v8a**，旧的 32 位设备、某些 x86 模拟器就无法安装；若仍选择
   **"universalRelease"** 变体，Gradle 也不会再额外帮你补齐缺失的 `.so`。

**默认同时构建四个目录是为了最大化覆盖面和兼容性**；只有在明确知道目标设备范围并愿意放弃其他架构支持时，才建议通过
`TAURI_ANDROID_ARCHS` 或 **ABI 过滤**来缩小输出。
