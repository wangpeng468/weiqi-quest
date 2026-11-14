# 棋谱与语音来源 / Sources

本应用是独立制作的免费、非商业学习工具，不代表原作者认可或背书。

## Go Game Guru：420 题已全部内置
作者：An Younggil、David Ormerod / Go Game Guru。
原始仓库：https://github.com/gogameguru/go-problems
许可证：CC BY-NC-SA 4.0；完整许可证附于 GGG-LICENSE.txt。
条款及免责声明：https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode

下载来源：akitaonrails/frank_go v0.3.21 的官方 GitHub Actions 发布构建产物，
run 39066257429，artifact 12113218437（dist-Linux）；提取其中 data/tsumego/ggg。
源码来源清单：https://github.com/akitaonrails/frank_go/blob/main/data/SOURCES.md
提取 easy / intermediate / hard 三组，各 140 个 SGF 文件，总计 420 个。

训练数据取每题的初始摆子与第一参考主线；其他分支和原评语不参与判分。
完整 SGF 随 APK 存在 assets/sgf/，页面使用预解析主线以便快速打开。
中级第 50 题的原文件末尾多一个右括号，已移除这一多余括号；
初始摆子、节点、落子、分支和评语没有改动。该文件也通过源仓库文本核对。
所有改编 GGG 数据继续采用 CC BY-NC-SA 4.0，仅限非商业用途。

## 启蒙与名局
96 关启蒙来自原版的 24 个原创基础图及四个方向练习；旋转不算新棋谱。
原创启蒙数据按 CC0 1.0 提供。
32 关名局来自 4 盘公开对局的前 80 手，每 10 手一段，不包含原解说。
记录来源：https://github.com/akitaonrails/frank_go/tree/main/data/games/famous
所用记录：1835-blood-vomiting-game.sgf、1846-ear-reddening-game.sgf、
1933-game-of-the-century.sgf、2017-alphago-ke-jie-game-1.sgf。
来源仓库注明基础收藏来自 Andries Brouwer / CWI。

## 按钮语音（v2.6.0：用户选定 B 音色，全量替换）
用户在第二批试听中选定 B：matcha-icefall-zh-en，单一音色 sid=0，速度参数 0.96。
本版沿用试听所用模型包和语速，不混用 Kokoro 或 eSpeak 音源。
模型说明与推理示例：https://k2-fsa.github.io/sherpa/onnx/tts/all/Chinese-English/matcha-icefall-zh-en.html
模型作者及原始来源：https://modelscope.cn/models/dengcunqin/matcha_tts_zh_en_20251010
推理项目：https://github.com/k2-fsa/sherpa-onnx
制作端模型资源取自已经下载的官方 sherpa-onnx 构建产物：
https://github.com/k2-fsa/sherpa-onnx/actions/runs/42777558603
artifact 13753391913：flutter-tts-matcha-icefall-zh-en-linux-x64。
声学模型 model-steps-3.onnx，声码器 vocos-16khz-univ.onnx。

503 个朗读键对应 495 条独立整句配音；别名按钮可共用同一句声音。
短句完整生成，不逐字拼接，不变调冒充音色，不克隆任何人的声音。
原始 16kHz 浮点音频先做响度处理，避免将超过满量程的峰值直接裁切；
再转换为 24kHz 单声道 128kbps MP3，响度目标 -18 LUFS。
采用与获选样音一致的速度 0.96，不在播放端改变速度或音高。

APK 仅包含本应用原创文案所生成的音频，不包含模型权重、推理库、训练数据或字体。
这是 AI 合成声音，不是真人录音，不表示经过普通话等级认证。
原来的棋谱及第三方数据仍受其各自许可证约束。
此版本面向个人家庭非商业学习，不将“可下载模型”等同于任意商业授权。

主程序通过 data: 音频在本地播放，不调用在线或系统 TTS；无网络权限。
语音开关位置、关闭即停止行为、设置存储键保持不变。
导入的自定义棋谱名称统一播放“打开棋谱”，不临时合成任意新标题。
系统文件选择器、安装确认等原生系统对话框不由应用语音开关朗读。
详细语句、模型与生成参数见 voice-manifest.json；数值检查不替代逐句听审。

## 代码及测试
独立编写的页面、围棋引擎、语音控制器与原生封装代码采用 MIT 许可证。
第三方数据仍受其各自许可证约束。此包不申请任何 Android 权限。
包内使用 WebView 自带网页引擎；不是包含独立 Chromium 的 APK。
