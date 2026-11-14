# 围棋背谱闯关 · Weiqi Quest

适合一年级小朋友的 **Android 横屏平板、完全离线** 围棋背谱与对战练习应用。

## 已有功能（v2.8.0）

- **548 关内置离线训练**：96 关启蒙练习、420 道 Go Game Guru 分级题，以及 32 关名局片段。
- 看谱后隐藏答案、触屏复摆、错误提示、连续下一关、自由选关、反复训练。
- 9/13/19 路人机对战，三档入门陪练难度；悔棋、认输、停一手、判胜负。
- 双方连续停一手后按面积计分**估算胜负**；复杂死活仍需家长复核。
- 本地保留闯关进度及最近 100 局对战输赢；可导出／导入 JSON 备份。
- **普通话 B 音色**按钮语音和关卡标题朗读，支持关闭。固定横屏，棋盘尽可能铺满左侧。
- 棋谱与预录音频**全部内置**，安装后不需要连接 GitHub，也不需要网络权限。

> 本项目为儿童启蒙练习工具。人机难度不是正式段位；参考手顺也不是唯一正确下法；终局的自动估算不能替代专业裁判。

## 源码目录

- `src/org/weiqi/memory/MainActivity.java`：Android 原生 WebView 容器，内置文件读写桥接。
- `web-src/`：可修改的前端 JavaScript 源码。
- `assets/`：可直接在 WebView 中运行的 HTML/CSS/JS、许可证与来源文档。
- `resources/offline-assets.part*`：离线 **420 个 SGF 棋谱和全部预录中文 MP3** 的压缩数据分卷。
- `resources/manifest.json`：资源分卷大小及 SHA-256 校验信息。
- `scripts/unpack_resources.py`：校验后从分卷恢复资源到 `assets/sgf/` 与 `assets/audio/`。
- `package_apk.py`、`build_native.sh`：APK 打包和 Java 编译脚本。
- `test_*.py`、`test_*.cjs`：围棋规则、自动估算、兼容性与升级测试。

## 从源码还原并构建 APK

在已安装 **Python 3、Node.js、JDK 和 Android SDK** 的开发电脑上：

```bash
python3 scripts/unpack_resources.py  # 恢复全部离线棋谱和音频；无需联网
npm install
npm run web
python3 -m pip install -r requirements.txt
```

然后为安卓原生部分提供 SDK 编译工具路径：

```bash
export ANDROID_JAR=/path/to/android-sdk/platforms/android-34/android.jar
export D8_JAR=/path/to/android-sdk/build-tools/34.0.0/lib/d8.jar
bash build_native.sh
```

`build_native.sh` 会编译 Java、生成 DEX，之后调用 `package_apk.py` 完成 APK 打包。

**签名与覆盖升级**：公开源码中绝不提供签名私钥。`package_apk.py` 默认需要 `private-signing/` 中已有的原始签名材料，缺少时会拒绝生成同一更新包；如在自己的设备上使用新签名，仅适用于全新安装（不能覆盖原安装以保留记录）。如需换签名，请先导出旧版 JSON 进度。

`npm install` 需要在开发电脑上获取前端开发依赖；**最终应用运行无需联网**。同理，语音模型不随仓库分发，只有离线生成的 MP3 文件。源码重建不必再次生成声音。

## GitHub Actions 自动签名打包

已经配置 [Build signed offline Android APK](.github/workflows/build-apk.yml)：推送 `main` 或手动触发即可构建并上传 APK。**必须先找回平板现有应用的原始签名私钥，并配置 GitHub Actions Secrets；否则工作流会安全失败，绝不会自动生成不兼容的新签名。** 配置、证书核对与下载方法详见 [GitHub APK 签名与构建指南](docs/GITHUB_APK_SIGNING.md)。

## 许可与使用限制

- 本项目独立编写的代码采用 [MIT 许可证](LICENSE)。
- Go Game Guru 的题目与改编内容依据 **CC BY-NC-SA 4.0**，仅允许非商业分发，并要求署名及相同方式共享，详见 [`assets/GGG-LICENSE.txt`](assets/GGG-LICENSE.txt)。
- 名局及其他来源见 [`assets/SOURCES.md`](assets/SOURCES.md)，离线语音来源及授权事项见 [`assets/MATCHA-VOICE-NOTICE.txt`](assets/MATCHA-VOICE-NOTICE.txt)。
- 不代表题库作者或语音模型作者认可本应用。**不要把 MIT 代码许可误认为对题库、音频或模型的商业授权。**

## 隐私与限制

无用户账号或在线同步，进度保存在设备本机。卸载应用或清除数据可能删除进度，请定期导出 JSON 备份。

**此仓库不包含 APK 私钥、密码或个人学习记录。**构建和规则逻辑已经在模拟环境检查，但尚未通过所有 Android 平板机型的真机兼容测试。

详见 [`v2.8使用与构建说明.txt`](v2.8使用与构建说明.txt)。
