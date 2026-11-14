本目录记录 v2.6.0 配音制作过程。重建 APK 无需重新生成配音：495 条整句配音已嵌入 assets/index.html。
重新制作音频需另行取得 SOURCES.md 所列模型及对应推理库，并调整脚本中的构建目录。
模型和推理库没有随此开发备份分发。
patch_libm_version.py 只处理本次 Linux 制作环境的 sqrtf/log10f 符号版本兼容，不修改模型，也不进入 APK。
选择参数：model=matcha-icefall-zh-en，speaker=0，speed=0.96；详见 voice-manifest.json。
