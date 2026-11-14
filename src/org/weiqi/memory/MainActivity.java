package org.weiqi.memory;

import android.app.Activity;
import android.content.*;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageInfo;
import android.content.res.AssetFileDescriptor;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.*;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

/** Offline-only shell. No INTERNET permission. Only signed APK assets enter WebView. */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String HOME = "https://" + HOST + "/assets/index.html";
    private static final int OPEN_FILE = 41, SAVE_FILE = 42;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private FrameLayout root;
    private LinearLayout recovery;
    private TextView status;
    private WebView web;
    private ValueCallback<Uri[]> chooser;
    private String pendingExport;
    private String lastError = "";
    private volatile boolean ready, destroyed;
    private boolean softRendering, manualRecovery;
    private volatile int generation;
    private final AtomicInteger voiceSequence = new AtomicInteger();
    private MediaPlayer voicePlayer;
    private volatile boolean voicePlaying;
    private volatile int voiceDuration;

    private SharedPreferences records() { return getSharedPreferences("weiqi_records", MODE_PRIVATE); }
    private int dp(int n) { return (int)(n * getResources().getDisplayMetrics().density + 0.5f); }

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        setVolumeControlStream(android.media.AudioManager.STREAM_MUSIC);
        root = new FrameLayout(this);
        root.setBackgroundColor(0xfff5f6f0);
        setContentView(root);
        buildRecovery(); // Visible independently of HTML / JavaScript / WebView.
        openApp(records().getBoolean("software_rendering", false));
        if (Build.VERSION.SDK_INT >= 33) { try { Api33.registerBack(this); } catch (Throwable ignored) {} }
    }

    private void buildRecovery() {
        recovery = new LinearLayout(this);
        recovery.setOrientation(LinearLayout.VERTICAL);
        recovery.setGravity(Gravity.CENTER);
        recovery.setBackgroundColor(0xfff5f6f0);
        recovery.setPadding(dp(24), dp(12), dp(24), dp(12));
        status = new TextView(this);
        status.setTextColor(0xff203c34);
        status.setTextSize(17);
        status.setMaxLines(9);
        status.setEllipsize(android.text.TextUtils.TruncateAt.END);
        status.setGravity(Gravity.CENTER);
        status.setText("正在打开围棋棋盘…\n棋谱、B 音色均在安装包内，无需联网。\nv2.7.0");
        recovery.addView(status, new LinearLayout.LayoutParams(-1, -2));
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER);
        addButton(row, "重新打开", new View.OnClickListener() {
            @Override public void onClick(View v) { openApp(false); }
        });
        addButton(row, "兼容显示", new View.OnClickListener() {
            @Override public void onClick(View v) { openApp(true); }
        });
        addButton(row, "导出记录", new View.OnClickListener() {
            @Override public void onClick(View v) { rescueRecords(); }
        });
        addButton(row, "导出诊断", new View.OnClickListener() {
            @Override public void onClick(View v) { beginExport("围棋启动诊断.json", diagnostics(), "application/json"); }
        });
        recovery.addView(row, new LinearLayout.LayoutParams(-1, -2));
        TextView tip = new TextView(this);
        tip.setText("以上操作都不会卸载应用或清除练习记录。\n诊断信息仅保存到你选择的位置，不会上传。");
        tip.setTextColor(0xff64766e); tip.setTextSize(13); tip.setGravity(Gravity.CENTER);
        recovery.addView(tip);
        root.addView(recovery, new FrameLayout.LayoutParams(-1, -1));
    }

    private void openApp(boolean software) {
        if (destroyed) return;
        ready = false; manualRecovery = false; lastError = ""; softRendering = software;
        records().edit().putBoolean("software_rendering", software).apply(); final int ticket = ++generation;
        stopVoice();
        if (web != null) {
            root.removeView(web);
            try { web.stopLoading(); web.removeJavascriptInterface("GoAndroid"); web.destroy(); } catch (Throwable ignored) {}
            web = null;
        }
        recovery.setVisibility(View.VISIBLE);
        status.setText("正在打开围棋棋盘…\n无需联网，不会清除练习记录。\nv2.7.0 · " + (software ? "兼容显示" : "标准显示"));
        try {
            web = new WebView(this);
            WebSettings s = web.getSettings();
            s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true);
            s.setAllowFileAccess(false); s.setAllowContentAccess(true);
            s.setAllowFileAccessFromFileURLs(false); s.setAllowUniversalAccessFromFileURLs(false);
            s.setJavaScriptCanOpenWindowsAutomatically(false); s.setSupportMultipleWindows(false);
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            s.setBlockNetworkLoads(true); s.setMediaPlaybackRequiresUserGesture(false);
            s.setDefaultTextEncodingName("UTF-8"); s.setTextZoom(100);
            web.setBackgroundColor(0xfff5f6f0);
            if (software) web.setLayerType(View.LAYER_TYPE_SOFTWARE, null);
            web.addJavascriptInterface(new Bridge(ticket), "GoAndroid");
            web.setWebViewClient(new LocalClient(ticket));
            web.setWebChromeClient(new Chrome(ticket));
            root.addView(web, 0, new FrameLayout.LayoutParams(-1, -1));
            web.loadUrl(HOME); // Streams a small HTML file, not a 20 MB HTML/audio string.
        } catch (Throwable e) { fail("原生加载失败：" + describe(e), ticket); }
        handler.postDelayed(new Runnable() {
            @Override public void run() {
                if (!destroyed && ticket == generation && !ready && lastError.isEmpty())
                    fail("启动超时：页面未报告已准备就绪。请截取本页，或导出诊断信息。", ticket);
            }
        }, 15000);
        enterFullscreen();
    }

    private void enterFullscreen() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN |
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }
    private void addButton(LinearLayout row, String text, View.OnClickListener listener) {
        Button b = new Button(this); b.setText(text); b.setTextSize(14); b.setAllCaps(false);
        b.setOnClickListener(listener); b.setMinHeight(dp(44));
        row.addView(b, new LinearLayout.LayoutParams(0, -2, 1));
    }
    private static String describe(Throwable e) {
        return e.getClass().getSimpleName() + ": " + String.valueOf(e.getMessage());
    }
    private String deviceSummary() {
        String wv = "未知";
        try { PackageInfo p = WebView.getCurrentWebViewPackage(); if (p != null) wv = p.packageName + " " + p.versionName; } catch (Throwable ignored) {}
        return Build.MANUFACTURER + " " + Build.MODEL + " · Android " + Build.VERSION.RELEASE + " / API " + Build.VERSION.SDK_INT + "\nWebView：" + wv;
    }
    private void fail(final String message, final int ticket) {
        runOnUiThread(new Runnable() { @Override public void run() {
            if (destroyed || ticket != generation) return;
            lastError = message.length() > 1800 ? message.substring(0, 1800) : message;
            records().edit().putString("last_startup_error", lastError).apply();
            if (!ready) {
                recovery.setVisibility(View.VISIBLE); recovery.bringToFront();
                status.setText("棋盘尚未打开 · v2.7.0\n" + lastError + "\n\n" + deviceSummary());
            }
        }});
    }
    private String diagnostics() {
        try {
            JSONObject d = new JSONObject(); d.put("app", "weiqi-memory-trainer"); d.put("version", "2.6.1");
            d.put("device", deviceSummary()); d.put("ready", ready); d.put("softwareRendering", softRendering);
            d.put("lastError", lastError); d.put("previousError", records().getString("last_startup_error", ""));
            d.put("hasSavedProgress", !records().getString("progress", "").isEmpty());
            d.put("builtInLevels", 548); d.put("networkPermission", false); return d.toString(2);
        } catch (Exception e) { return "{\"error\":\"diagnostics unavailable\"}"; }
    }
    private void rescueRecords() {
        try {
            String raw = records().getString("progress", "");
            if (raw.isEmpty()) { message("暂未读到原生记录备份。原有网页缓存未被清除，请先尝试重新打开。"); return; }
            JSONObject data = new JSONObject(); data.put("app", "weiqi-memory-trainer"); data.put("version", 2);
            data.put("progress", new JSONObject(raw)); data.put("docs", new JSONArray(records().getString("documents", "[]")));
            data.put("recoveryNote", "从原生安全备份导出；旧版本未同步的导入棋谱可能仍只在网页缓存内。");
            beginExport("围棋练习记录_恢复备份.json", data.toString(), "application/json");
        } catch (Exception e) { message("导出失败：" + describe(e)); }
    }
    private void message(String text) { Toast.makeText(this, text, Toast.LENGTH_LONG).show(); }

    private static boolean allowed(Uri uri) {
        return uri != null && "https".equals(uri.getScheme()) && HOST.equals(uri.getHost()) &&
            (uri.getPort() == -1 || uri.getPort() == 443) && uri.getUserInfo() == null && uri.getPath() != null && uri.getPath().startsWith("/assets/");
    }
    private WebResourceResponse asset(String url) {
        try {
            Uri u = Uri.parse(url);
            if (!allowed(u)) return blocked(403, "Forbidden");
            String name = u.getPath().substring("/assets/".length());
            if (name.length() == 0 || name.contains("..") || name.contains("\\") || name.indexOf('\0') >= 0) return blocked(403, "Forbidden");
            String mime = name.endsWith(".html") ? "text/html" : name.endsWith(".js") ? "application/javascript" :
                name.endsWith(".css") ? "text/css" : name.endsWith(".json") ? "application/json" :
                name.endsWith(".mp3") ? "audio/mpeg" : name.endsWith(".png") ? "image/png" : "text/plain";
            InputStream in = getAssets().open(name);
            Map<String, String> headers = new HashMap<String, String>();
            headers.put("Cache-Control", "no-store"); headers.put("X-Content-Type-Options", "nosniff");
            return new WebResourceResponse(mime, mime.startsWith("audio/") ? null : "UTF-8", 200, "OK", headers, in);
        } catch (Exception e) { return blocked(404, "Not Found"); }
    }
    private static WebResourceResponse blocked(int code, String reason) {
        return new WebResourceResponse("text/plain", "UTF-8", code, reason, Collections.<String,String>emptyMap(),
            new ByteArrayInputStream(reason.getBytes(StandardCharsets.UTF_8)));
    }
    private final class LocalClient extends WebViewClient {
        private final int ticket;
        LocalClient(int t) { ticket = t; }
        @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) { return asset(r.getUrl().toString()); }
        @Override public WebResourceResponse shouldInterceptRequest(WebView v, String url) { return asset(url); }
        @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { return !allowed(r.getUrl()); }
        @Override public boolean shouldOverrideUrlLoading(WebView v, String url) { return !allowed(Uri.parse(url)); }
        @Override public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
            if (r.isForMainFrame()) fail("页面加载错误 " + e.getErrorCode() + "：" + e.getDescription(), ticket);
        }
        @Override public void onReceivedHttpError(WebView v, WebResourceRequest r, WebResourceResponse e) {
            if (!ready) fail("本地资源读取失败 " + e.getStatusCode() + "：" + r.getUrl().getLastPathSegment(), ticket);
        }
        @Override public boolean onRenderProcessGone(WebView v, RenderProcessGoneDetail d) {
            if (ticket == generation) { ready = false; root.removeView(v); v.destroy(); web = null; fail("网页显示进程已退出。请点击重新打开或兼容显示；练习记录未清除。", ticket); }
            return true;
        }
    }
    private final class Chrome extends WebChromeClient {
        private final int ticket;
        Chrome(int t) { ticket = t; }
        @Override public boolean onConsoleMessage(ConsoleMessage m) {
            if (m.messageLevel() == ConsoleMessage.MessageLevel.ERROR && !ready)
                fail("脚本错误：" + m.message() + "（第 " + m.lineNumber() + " 行）", ticket);
            return true;
        }
        @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (chooser != null) chooser.onReceiveValue(null);
            chooser = callback;
            try {
                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT); i.addCategory(Intent.CATEGORY_OPENABLE); i.setType("*/*");
                i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                startActivityForResult(i, OPEN_FILE);
            } catch (Exception e) { chooser = null; callback.onReceiveValue(null); message("无法打开系统文件选择器。"); }
            return true;
        }
    }
    public final class Bridge {
        private final int webTicket;
        Bridge(int t) { webTicket = t; }
        @JavascriptInterface public String loadProgress() { return records().getString("progress", ""); }
        @JavascriptInterface public boolean saveProgress(String raw) {
            if (raw == null || raw.length() > 30000000) return false;
            try { JSONObject p = new JSONObject(raw); if (p.optInt("version") != 2) return false;
                return records().edit().putString("progress", raw).commit();
            } catch (Exception e) { return false; }
        }
        @JavascriptInterface public String loadDocuments() { return records().getString("documents", "[]"); }
        @JavascriptInterface public boolean saveDocuments(String raw) {
            if (raw == null || raw.length() > 30000000) return false;
            try { new JSONArray(raw); return records().edit().putString("documents", raw).commit(); } catch (Exception e) { return false; }
        }
        @JavascriptInterface public void ready() {
            final int ticket = webTicket;
            handler.post(new Runnable() { @Override public void run() {
                if (!destroyed && ticket == generation) { ready = true; if (!manualRecovery) recovery.setVisibility(View.GONE); }
            }});
        }
        @JavascriptInterface public void reportError(String error) { if (error != null) fail(error, webTicket); }
        @JavascriptInterface public String diagnostics() { return MainActivity.this.diagnostics(); }
        @JavascriptInterface public boolean exportFile(final String name, final String text, final String mime) {
            if (name == null || text == null || mime == null || text.length() > 30000000) return false;
            handler.post(new Runnable() { @Override public void run() { beginExport(name, text, mime); }}); return true;
        }
        @JavascriptInterface public boolean playVoice(final String filename) {
            if (filename == null || !filename.matches("[0-9a-f]{64}\\.mp3")) return false;
            final int ticket = voiceSequence.incrementAndGet();
            handler.post(new Runnable() { @Override public void run() { playLocalVoice(filename, ticket); }}); return true;
        }
        @JavascriptInterface public void stopVoice() {
            voiceSequence.incrementAndGet();
            handler.post(new Runnable() { @Override public void run() { releasePlayer(); }});
        }
        @JavascriptInterface public boolean isVoicePlaying() { return voicePlaying; }
        @JavascriptInterface public int voiceDurationMs() { return voiceDuration; }
    }
    private void playLocalVoice(String filename, final int ticket) {
        if (destroyed || ticket != voiceSequence.get()) return;
        releasePlayer();
        try {
            final MediaPlayer p = new MediaPlayer(); voicePlayer = p;
            p.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
            AssetFileDescriptor fd = getAssets().openFd("audio/" + filename);
            try { p.setDataSource(fd.getFileDescriptor(), fd.getStartOffset(), fd.getLength()); } finally { fd.close(); }
            p.setOnPreparedListener(new MediaPlayer.OnPreparedListener() { @Override public void onPrepared(MediaPlayer mp) {
                if (ticket == voiceSequence.get() && p == voicePlayer && !destroyed) { voiceDuration = p.getDuration(); p.start(); voicePlaying = true; }
            }});
            p.setOnCompletionListener(new MediaPlayer.OnCompletionListener() { @Override public void onCompletion(MediaPlayer mp) {
                if (p == voicePlayer) releasePlayer();
            }});
            p.setOnErrorListener(new MediaPlayer.OnErrorListener() { @Override public boolean onError(MediaPlayer mp, int what, int extra) {
                lastError = "音频播放错误 " + what + "/" + extra; if (p == voicePlayer) releasePlayer(); return true;
            }});
            p.prepareAsync();
        } catch (Exception e) { lastError = "本地音频读取失败：" + describe(e); releasePlayer(); }
    }
    private void releasePlayer() {
        voicePlaying = false;
        if (voicePlayer != null) { try { voicePlayer.release(); } catch (Exception ignored) {} voicePlayer = null; }
    }
    private void stopVoice() { voiceSequence.incrementAndGet(); releasePlayer(); }
    private void beginExport(String name, String data, String mime) {
        if (pendingExport != null) { message("请先完成当前保存窗口。"); return; }
        pendingExport = data;
        try {
            Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT); i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType(mime); i.putExtra(Intent.EXTRA_TITLE, name); startActivityForResult(i, SAVE_FILE);
        } catch (Exception e) { pendingExport = null; message("无法打开系统保存窗口：" + describe(e)); }
    }
    @Override protected void onActivityResult(int code, int result, Intent data) {
        super.onActivityResult(code, result, data);
        if (code == OPEN_FILE && chooser != null) {
            ValueCallback<Uri[]> callback = chooser; chooser = null;
            Uri[] values = null;
            if (result == RESULT_OK && data != null) {
                ClipData clips = data.getClipData();
                if (clips != null) { values = new Uri[Math.min(100, clips.getItemCount())]; for (int i = 0; i < values.length; i++) values[i] = clips.getItemAt(i).getUri(); }
                else if (data.getData() != null) values = new Uri[]{data.getData()};
            }
            callback.onReceiveValue(values);
        }
        if (code == SAVE_FILE) {
            final String text = pendingExport; pendingExport = null;
            if (result != RESULT_OK || data == null || data.getData() == null || text == null) { exportResult(false); return; }
            final Uri uri = data.getData();
            new Thread(new Runnable() { @Override public void run() {
                boolean saved = false;
                try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                    if (out == null) throw new IOException("无法打开输出文件");
                    out.write(text.getBytes(StandardCharsets.UTF_8)); out.flush(); saved = true;
                } catch (Exception e) { lastError = describe(e); }
                final boolean ok = saved; handler.post(new Runnable() { @Override public void run() {
                    exportResult(ok); message(ok ? "已保存。" : "未能保存文件，请重试。");
                }});
            }}, "local-export").start();
        }
    }
    private void exportResult(boolean ok) { if (web != null) web.evaluateJavascript("window.GoNativeSaveResult && window.GoNativeSaveResult(" + ok + ")", null); }
    /** Native back recovery still works if WebView has painted a blank surface. */
    @Override public void onBackPressed() { showRecovery(); }
    private void showRecovery() {
        manualRecovery = true; stopVoice();
        if (web != null) web.evaluateJavascript("window.GoNativePause && window.GoNativePause()", null);
        recovery.setVisibility(View.VISIBLE); recovery.bringToFront();
        status.setText("启动与显示诊断 · v2.7.0\n可选择兼容显示；练习记录不会清除。\n" +
            (lastError.isEmpty() ? "页面准备状态：" + (ready ? "已加载" : "未完成") : lastError) + "\n\n" + deviceSummary());
    }
    /** Isolated so Android 8–12 never resolve API 33 callback classes. */
    private static final class Api33 {
        static void registerBack(final MainActivity activity) {
            activity.getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                new android.window.OnBackInvokedCallback() {
                    @Override public void onBackInvoked() { activity.showRecovery(); }
                });
        }
    }
    @Override public void onWindowFocusChanged(boolean focus) { super.onWindowFocusChanged(focus); if (focus) enterFullscreen(); }
    @Override protected void onResume() { super.onResume(); enterFullscreen(); if (web != null) web.onResume(); }
    @Override protected void onPause() {
        if (web != null) { web.evaluateJavascript("window.GoNativePause && window.GoNativePause()", null); web.onPause(); }
        stopVoice(); super.onPause();
    }
    @Override protected void onDestroy() {
        destroyed = true; generation++; handler.removeCallbacksAndMessages(null); stopVoice();
        if (chooser != null) { chooser.onReceiveValue(null); chooser = null; }
        if (web != null) { root.removeView(web); web.destroy(); web = null; }
        super.onDestroy();
    }
}
