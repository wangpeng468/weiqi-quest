# 保留原签名的 GitHub Actions 自动 APK 构建

本项目的包名是 `org.weiqi.memory`，并不是 Gradle 工程。工作流 `.github/workflows/build-apk.yml` 会调用原来的 `build_native.sh` 和 `package_apk.py`，并在每次推送到 `main` 或手动触发时执行。

## 最重要：先找回原签名

**已经安装在平板上的 APK 不能靠换一个签名密钥覆盖升级。** 原密钥不会随已安装 APK 一起保存，也无法从 APK 反推出私钥。务必从**最初构建电脑的私有备份**找回下面这一对文件：

- `private-signing/weiqi-private.pem` —— 原 RSA 私钥，**绝不上传到公开仓库、Issue、聊天或 Artifact**
- `private-signing/weiqi-certificate.der` —— 与私钥配对的 X.509 证书（公有资料）

这套代码使用 PEM+DER，不是 JKS；不需要另外生成 JKS。如果你只有 JKS，需要先确认它确实属于**已经安装的那个 APK**，再做适配，不能随意替换。

**请先在应用“记录”中导出 JSON 学习进度备份**，保存在平板之外。不要先卸载已经安装的应用。

## 在电脑上核对已安装 APK 的证书

已安装 Android SDK Build Tools 和 adb 后，连接平板并开启 USB 调试：

```bash
adb shell pm path org.weiqi.memory
# 把输出中 base.apk 的完整路径填到下面，例如 /data/app/.../base.apk
adb pull '/data/app/.../base.apk' installed-weiqi.apk
apksigner verify --print-certs installed-weiqi.apk
```

记录其中 **Signer #1 certificate SHA-256 digest**（64 位十六进制数）。该信息不是私钥，可以用于比较。找不到 `apksigner` 时，可以使用 Android SDK 的 `build-tools/34.0.0/apksigner`。

在保存原 PEM/DER 的电脑上核对：

```bash
openssl x509 -inform DER -in private-signing/weiqi-certificate.der -noout -fingerprint -sha256
```

确保 SHA-256 与已安装 APK 完全一致。证书相同还不够，工作流会进一步校验私钥和证书是否配对。

## 配置 GitHub Actions Secrets

进入 `https://github.com/wangpeng468/weiqi-quest/settings/secrets/actions`，新建以下 **Repository secrets**：

| Secret | 作用 |
| --- | --- |
| `SIGNING_PRIVATE_KEY_B64` | 原 `weiqi-private.pem` 文件完整字节的 Base64 |
| `SIGNING_CERTIFICATE_B64` | 原 `weiqi-certificate.der` 文件完整字节的 Base64 |
| `EXPECTED_CERT_SHA256` | 从**已安装 APK**核对得到的证书 SHA-256 指纹 |

Linux/macOS 生成 Base64 内容（不要在公共终端/公开日志打印私钥）：

```bash
base64 -w 0 private-signing/weiqi-private.pem > private-key.b64
base64 -w 0 private-signing/weiqi-certificate.der > signing-cert.b64
```

macOS `base64` 没有 `-w` 选项时，用 `base64 < file | tr -d '\\n'`。复制生成文件里的内容到对应 GitHub Secret，之后**删除这两个临时 Base64 文件**，并妥善离线备份原密钥。Base64 只是编码，不是加密。

**不要设置 `ALLOW_NEW_SIGNING_KEY=1`**。工作流从不自动生成新密钥；三个 Secret 任一缺失或证书指纹不匹配都会失败，不会产出声称可覆盖升级的 APK。

## 获取构建产物

进入仓库 **Actions → Build signed offline Android APK**：

1. 保存三个 Secrets 后，点击 **Run workflow**（也可以推送代码到 main 自动启动）。
2. 成功后在对应运行页的 **Artifacts** 下载 `weiqi-quest-signed-apk`。
3. 解压后得到 `dist` 下的 APK 和 `build-info.json`。在平板上安装时使用同包名和同签名覆盖安装，**不要卸载旧版**。

工作流检查签名 v2、SHA-256、包名、ZIP 完整性以及 420 个 SGF/570 个音频文件是否随包内置。首次配置前的失败属于预期现象。

### 已知限制

- GitHub Actions 构建成功不等于已经在平板上实测成功；请先备份进度，再手动进行覆盖安装测试。
- APK 版本号目前在 `package_apk.py` 中固定为 `2.8.0` / `20800`。以后升级版本时需要同步修改这些值，不能用更低版本号覆盖新版。
- 仓库中的 `validate_release.py` 依赖开发者原机器绝对路径下的旧 APK，所以 CI 使用独立的自检，不运行这份依赖私有历史文件的脚本。
- 不允许通过 GitHub Actions 缓存或 Artifact 保存密钥；只上传最终已签名 APK 和公开元数据。
