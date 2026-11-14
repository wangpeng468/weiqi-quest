/* Small, completely offline sound effects. No network, voice files or system permissions.
 * Quiet taps, gentle feedback and brief chimes; independent of the spoken hints.
 * ES5 source so older Android WebViews can run it without additional APIs.
 */
(function (root) {
    'use strict';
    var KEY = 'weiqi-memory-v2-sound-effects';
    var control = document.getElementById('soundToggle');
    var icon = document.getElementById('soundIcon');
    var label = document.getElementById('soundLabel');
    var enabled = true, ctx = null, master = null, noise = null, lastType = '', lastTime = 0;
    var nativeBridge = root.GoAndroid;
    var nativeSound = !!(nativeBridge && typeof nativeBridge.playSound === 'function');
    try {
        enabled = localStorage.getItem(KEY) !== 'off';
    }
    catch (e) { }
    function update() {
        if (!control)
            return;
        control.setAttribute('aria-pressed', enabled ? 'true' : 'false');
        control.setAttribute('aria-label', enabled ? '关闭音效' : '开启音效');
        control.title = enabled ? '点击关闭音效' : '点击开启音效';
        icon.textContent = enabled ? '🎵' : '🔕';
        label.textContent = enabled ? '音效开' : '音效关';
    }
    function context() {
        if (ctx)
            return ctx;
        var AudioConstructor = root.AudioContext || root.webkitAudioContext;
        if (!AudioConstructor)
            return null;
        try {
            ctx = new AudioConstructor();
            master = ctx.createGain();
            master.gain.value = enabled ? 0.32 : 0;
            master.connect(ctx.destination);
            noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .075), ctx.sampleRate);
            var samples = noise.getChannelData(0), last = 0;
            for (var i = 0; i < samples.length; i++) {
                // Brief, filtered wood/stone-like click, rather than a synthetic loud beep.
                last = last * .63 + (Math.random() * 2 - 1) * .37;
                samples[i] = last * (1 - i / samples.length);
            }
            return ctx;
        }
        catch (e) {
            ctx = null;
            master = null;
            noise = null;
            return null;
        }
    }
    function tone(t, f, d, v, kind) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = kind || 'sine';
        o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(Math.max(.0001, v), t + .014);
        g.gain.exponentialRampToValueAtTime(.0001, t + d);
        o.connect(g);
        g.connect(master);
        o.start(t);
        o.stop(t + d + .01);
    }
    function tap(t, loudness, pitch) {
        var source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), g = ctx.createGain();
        source.buffer = noise;
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(pitch || 1400, t);
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(loudness || .18, t + .004);
        g.gain.exponentialRampToValueAtTime(.0001, t + .065);
        source.connect(filter);
        filter.connect(g);
        g.connect(master);
        source.start(t);
        source.stop(t + .074);
        tone(t, 260, .07, .025, 'sine');
    }
    function play(type) {
        if (!enabled || document.hidden)
            return false;
        var now = Date.now();
        if (type === lastType && now - lastTime < 65)
            return false;
        if (nativeSound) {
            try {
                if (nativeBridge.playSound(type)) {
                    lastType = type;
                    lastTime = now;
                    return true;
                }
            }
            catch (e) { /* Use Web Audio if this WebView bridge is unavailable. */ }
        }
        var a = context();
        if (!a)
            return false;
        lastType = type;
        lastTime = now;
        try {
            if (a.state === 'suspended' && a.resume) {
                var promise = a.resume();
                if (promise && promise.catch)
                    promise.catch(function () { });
            }
            var t = a.currentTime + .003;
            switch (type) {
                case 'stone':
                    tap(t, .15, 1150);
                    break;
                case 'correct':
                    tap(t, .14, 1400);
                    tone(t + .012, 660, .085, .044);
                    break;
                case 'capture':
                    tap(t, .18, 1600);
                    tap(t + .09, .12, 1250);
                    break;
                case 'pass':
                    tone(t, 480, .09, .04);
                    tone(t + .07, 370, .1, .028);
                    break;
                case 'undo':
                    tone(t, 420, .085, .035);
                    tone(t + .058, 520, .085, .026);
                    break;
                case 'error':
                    tone(t, 320, .13, .042);
                    tone(t + .07, 260, .14, .025);
                    break;
                case 'hint':
                    tone(t, 690, .12, .04);
                    break;
                case 'mark':
                    tap(t, .1, 900);
                    break;
                case 'finish':
                    tone(t, 523.25, .16, .065);
                    tone(t + .12, 659.25, .18, .065);
                    tone(t + .24, 783.99, .25, .08);
                    break;
                case 'toggle':
                    tone(t, 670, .12, .04);
                    break;
                default: return false;
            }
            return true;
        }
        catch (e) {
            return false;
        }
    }
    function setEnabled(next) {
        enabled = !!next;
        try {
            localStorage.setItem(KEY, enabled ? 'on' : 'off');
        }
        catch (e) { }
        if (nativeSound && typeof nativeBridge.setSoundEnabled === 'function') {
            try {
                nativeBridge.setSoundEnabled(enabled);
            }
            catch (e) { }
        }
        if (master && ctx)
            master.gain.setValueAtTime(enabled ? 0.32 : 0, ctx.currentTime);
        update();
        if (enabled)
            play('toggle');
    }
    if (control)
        control.addEventListener('click', function () { setEnabled(!enabled); });
    document.addEventListener('visibilitychange', function () {
        if (document.hidden && ctx && ctx.suspend) {
            var p = ctx.suspend();
            if (p && p.catch)
                p.catch(function () { });
        }
    });
    update();
    if (nativeSound && typeof nativeBridge.setSoundEnabled === 'function') {
        try {
            nativeBridge.setSoundEnabled(enabled);
        }
        catch (e) { }
    }
    root.SoundFX = {
        play: play, setEnabled: setEnabled,
        get enabled() { return enabled; },
        get supported() { return nativeSound || !!(root.AudioContext || root.webkitAudioContext); },
        get engine() { return nativeSound ? 'android' : (root.AudioContext || root.webkitAudioContext) ? 'web' : 'unavailable'; },
        diagnostics: function () { try {
            return nativeSound && nativeBridge.soundDiagnostics ? nativeBridge.soundDiagnostics() : 'Web Audio fallback';
        }
        catch (e) {
            return 'Sound diagnostic unavailable';
        } }
    };
})(window);
