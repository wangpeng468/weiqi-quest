# 围棋背谱闯关 · Weiqi Quest

面向围棋初学儿童的 **Android 横屏平板离线练习应用**。项目目前提供 v2.8.0 的源码、离线题库和 B 音色资源。

## 功能

- **548 个离线关卡**：96 个启蒙方向练习、420 道 Go Game Guru 分级题、32 个经典名局片段
- 看谱后遮住答案，孩子触屏逐手复摆，自动提示正误、选关及重练
- 9/13/19 路离线人机对战，三档启蒙陪练难度、悔棋、认输、停一手
- 双方连续停手后给出 **面积计分估算**；复杂死活保留家长复核，不宣称专业裁判准确度
- 闯关成绩、未结束对局、最近 100 局对战胜负保存在本机；支持 JSON 导出与恢复
- 适合不认字的孩子：点击标题或按钮有中文语音；右上角可关闭
- 固定横屏，左侧完整棋盘，操作集中右侧；**运行时无需联网，不需要 GitHub**

> 说明：训练题中存在需要按参考手顺复摆的关卡；“非参考落点”不等于围棋意义上唯一错误。对战难度是简单陪练算法，不是段位 AI。

## 仓库结构

- `src/org/weiqi/memory/`：Android 原生 WebView 容器与数据备份桥接
- `web-src/`：可编辑的前端 JS 源码
- `assets/`：网页界面、打包后的 JS/CSS、SGF 题库、许可证与来源
- `resources/audio-pack.part*`：离线普通话 B 配音的二进制资源分卷（不含语音模型）
- `scripts/unpack_audio.py`：验证哈希后将音频完整还原到 `assets/audio/`
- `test_*.py`、`test_*.cjs`：围棋规则、结算、界面与升级验证脚本
- `package_apk.py`、`build_native.sh`：自定义 APK 打包与原生编译脚本

## 从源码构建

在仓库根目录执行：

```bash
python3 scripts/unpack_audio.py
npm install
node transpile.cjs
python3 -m pip install -r requirements.txt
```

编译 Android 原生层需预先安装 JDK、Android SDK 平台 `android.jar` 和 R8/D8：

```bash
export ANDROID_JAR=/path/to/android-sdk/platforms/android-34/android.jar
export D8_JAR=/path/to/android-sdk/build-tools/.../lib/d8.jar
bash build_native.sh
```

`build_native.sh` 会编译 Java、生成 DEX 并调用 `package_apk.py`。

**重要**：出于安全原因，公开仓库不含 APK 签名私钥。若要生成可覆盖安装原版的 APK，必须在本地使用你自己安全保存的**同一把原始签名私钥**，放到 `private-signing/`（绝不可提交）。如需创建独立新签名，`ALLOW_NEW_SIGNING_KEY=1` 仅用于新的签名身份，**无法覆盖安装旧版本**；建议先导出 JSON 进度备份。APK 未经真实安卓设备上的完整兼容性认证。

## 数据来源、授权与非商业使用

- 应用独立编写的源代码：**MIT**（参见 `LICENSE`）。
- Go Game Guru 420 题及其改编：**CC BY-NC-SA 4.0**（参见 `assets/GGG-LICENSE.txt`）。来源 [gogameguru/go-problems](https://github.com/gogameguru/go-problems)。这些内容 **不得用于商业分发**，且改编需满足相同许可条款。
- 其他公开名局和语音来源与说明：参见 [`assets/SOURCES.md`](assets/SOURCES.md) 和 [`assets/MATCHA-VOICE-NOTICE.txt`](assets/MATCHA-VOICE-NOTICE.txt)。
- 内置中文配音基于 **Matcha 中文语音模型**事先合成；只分发生成的提示音频，**不包含模型权重**。进一步商用前应独立核对模型和数据授权。

## 数据与隐私

应用默认离线，不申请网络权限；儿童练习进度只在平板上保存。公开仓库中**没有任何个人练习记录、签名证书私钥、密码或账号令牌**。请勿提交 `private-signing/` 或私人 JSON 备份。

本仓库主要是 v2.8.0 **源码快照**，而不是可商用分发的现成 SDK。完整测试覆盖范围与限制参见 `v2.8使用与构建说明.txt`。
