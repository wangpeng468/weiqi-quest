var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
/* 围棋背谱闯关 2.0 — MIT; all application work runs locally. */
(function () {
    'use strict';
    // Do not serialize the entire page at startup. Audio is loaded only on demand.
    var $ = function (id) { return document.getElementById(id); }, esc = function (s) { return String(s !== null && s !== void 0 ? s : '').replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]); }); };
    var Native = window.GoAndroid || null;
    var KEY = 'weiqi-memory-v2-progress', CACHE_PREFIX = 'weiqi-memory-v2-sgf-';
    var PAGE_SIZE = 12;
    var docs = new Map(), volatileDocs = new Set(), embeddedIds = new Set();
    var db = null, storageOK = true, toastTimer = null, loadSerial = 0, autoTimer = null, bulkRunning = false, bulkStop = false;
    var levels = [], current = null, mode = 'preview', at = 0, errors = 0, bad = new Set(), hints = new Set(), startedAt = 0, hintVisible = false, wrongPoint = -1, zoom = true, page = 0;
    var boardGeometry = null, feedbackMessage = '', feedbackKind = '', activeTab = 'practice', layoutFrame = 0, confirmAction = null, lastWrongVoiceAt = 0;
    function toast(msg) { $('toast').textContent = msg; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(function () { return $('toast').hidden = true; }, 4500); }
    function safeDoc(d) { return d && typeof d.id === 'string' && /^(ggg-(easy|intermediate|hard)-\d{1,3}|import-[a-z0-9]+)$/.test(d.id) && typeof d.sgf === 'string' && d.sgf.length <= 3000000; }
    function numeric(x, max) {
        if (max === void 0) { max = 1000000; }
        return Number.isFinite(+x) ? Math.max(0, Math.min(max, +x)) : 0;
    }
    function cleanRecord(r) {
        var e_1, _a;
        if (!r || typeof r !== 'object')
            return null;
        var out = {};
        try {
            for (var _b = __values(['plays', 'passes', 'bestStars', 'bestAccuracy', 'lastAccuracy', 'lastErrors', 'lastHints', 'totalMs']), _c = _b.next(); !_c.done; _c = _b.next()) {
                var k = _c.value;
                out[k] = numeric(r[k], k.includes('Accuracy') ? 100 : k === 'bestStars' ? 3 : 1000000000);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        out.lastPlayed = typeof r.lastPlayed === 'string' && Number.isFinite(Date.parse(r.lastPlayed)) ? r.lastPlayed : '';
        return out;
    }
    function cleanRecords(rs) {
        var e_2, _a;
        var o = Object.create(null);
        if (!rs || typeof rs !== 'object')
            return o;
        try {
            for (var _b = __values(Object.entries(rs).slice(0, 50000)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), id = _d[0], r = _d[1];
                if (/^[a-zA-Z0-9_-]{1,160}$/.test(id)) {
                    var c = cleanRecord(r);
                    if (c)
                        o[id] = c;
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return o;
    }
    var state = { version: 2, records: Object.create(null), lastId: null, session: null, battle: null, battleHistory: [], battleVoids: [], recordView: 'lessons' };
    var startupRaw = '';
    try {
        localStorage.setItem(KEY + '-test', '1');
        localStorage.removeItem(KEY + '-test');
        startupRaw = localStorage.getItem(KEY) || '';
    }
    catch (e) {
        storageOK = false;
    }
    try {
        if (Native) {
            var raw = Native.loadProgress();
            if (raw)
                startupRaw = raw;
        }
    }
    catch (e) { }
    try {
        var s = JSON.parse(startupRaw || 'null');
        if (s && s.version === 2)
            state = { version: 2, records: cleanRecords(s.records), lastId: typeof s.lastId === 'string' ? s.lastId : null, session: s.session && typeof s.session === 'object' ? s.session : null, battle: s.battle || null, battleHistory: Array.isArray(s.battleHistory) ? s.battleHistory.slice(0, 200) : [], battleVoids: Array.isArray(s.battleVoids) ? s.battleVoids.slice(0, 1000) : [], recordView: ['battle', 'local'].indexOf(s.recordView) >= 0 ? s.recordView : 'lessons' };
    }
    catch (e) {
        storageOK = false;
        throw Error('本地记录解析失败；原记录仍保留，请使用启动页导出记录。');
    }
    function warnStorage() { if (!storageOK) {
        $('storageWarning').hidden = false;
        $('storageWarning').textContent = '当前无法保存记录。请先导出 JSON 备份，并检查平板剩余存储空间。';
        $('saveState').textContent = '记录暂未持久保存';
    } }
    function saveState() { var raw = JSON.stringify(state); var ok = false; try {
        localStorage.setItem(KEY, raw);
        ok = true;
    }
    catch (e) { } try {
        if (Native && Native.saveProgress(raw))
            ok = true;
    }
    catch (e) { } storageOK = ok; if (ok) {
        $('saveState').textContent = '✓ 记录已存本机';
        $('storageWarning').hidden = true;
    }
    else
        warnStorage(); }
    function sessionSave() { if (current) {
        state.lastId = current.level.id;
        state.session = { id: current.level.id, mode: mode, at: at, errors: errors, bad: __spreadArray([], __read(bad), false), hints: __spreadArray([], __read(hints), false), startedAt: startedAt };
    } saveState(); }
    function saveNativeDocs() { try {
        if (Native && Native.saveDocuments)
            Native.saveDocuments(JSON.stringify(__spreadArray([], __read(docs.values()), false)));
    }
    catch (e) { } }
    function openCache() {
        return __awaiter(this, void 0, void 0, function () {
            var saved, saved_1, saved_1_1, d, list, list_1, list_1_1, d, e_3, i, k, d, data, _a, _b, d;
            var e_4, _c, e_5, _d, e_6, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        try {
                            if (Native && Native.loadDocuments) {
                                saved = JSON.parse(Native.loadDocuments() || '[]');
                                try {
                                    for (saved_1 = __values(saved), saved_1_1 = saved_1.next(); !saved_1_1.done; saved_1_1 = saved_1.next()) {
                                        d = saved_1_1.value;
                                        if (safeDoc(d))
                                            docs.set(d.id, d);
                                    }
                                }
                                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                                finally {
                                    try {
                                        if (saved_1_1 && !saved_1_1.done && (_c = saved_1.return)) _c.call(saved_1);
                                    }
                                    finally { if (e_4) throw e_4.error; }
                                }
                            }
                        }
                        catch (e) { }
                        _f.label = 1;
                    case 1:
                        _f.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, new Promise(function (resolve, reject) { if (!window.indexedDB)
                                return reject(Error('no IndexedDB')); var rq = indexedDB.open('weiqi-memory-v2', 1), timer = setTimeout(function () { return reject(Error('缓存打开超时')); }, 2500); rq.onupgradeneeded = function () { if (!rq.result.objectStoreNames.contains('docs'))
                                rq.result.createObjectStore('docs', { keyPath: 'id' }); }; rq.onsuccess = function () { clearTimeout(timer); resolve(rq.result); }; rq.onerror = function () { clearTimeout(timer); reject(rq.error); }; rq.onblocked = function () { clearTimeout(timer); reject(Error('缓存被其他页面占用')); }; })];
                    case 2:
                        db = _f.sent();
                        return [4 /*yield*/, new Promise(function (resolve, reject) { var timer = setTimeout(function () { return reject(Error('读取缓存超时')); }, 2000); var r = db.transaction('docs', 'readonly').objectStore('docs').getAll(); r.onsuccess = function () { clearTimeout(timer); resolve(r.result); }; r.onerror = function () { clearTimeout(timer); reject(r.error); }; })];
                    case 3:
                        list = _f.sent();
                        try {
                            for (list_1 = __values(list), list_1_1 = list_1.next(); !list_1_1.done; list_1_1 = list_1.next()) {
                                d = list_1_1.value;
                                if (safeDoc(d))
                                    docs.set(d.id, d);
                            }
                        }
                        catch (e_5_1) { e_5 = { error: e_5_1 }; }
                        finally {
                            try {
                                if (list_1_1 && !list_1_1.done && (_d = list_1.return)) _d.call(list_1);
                            }
                            finally { if (e_5) throw e_5.error; }
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        e_3 = _f.sent();
                        db = null;
                        return [3 /*break*/, 5];
                    case 5:
                        try {
                            for (i = 0; i < localStorage.length; i++) {
                                k = localStorage.key(i);
                                if (k === null || k === void 0 ? void 0 : k.startsWith(CACHE_PREFIX)) {
                                    try {
                                        d = JSON.parse(localStorage.getItem(k));
                                        if (safeDoc(d) && !docs.has(d.id))
                                            docs.set(d.id, d);
                                    }
                                    catch (e) { }
                                }
                            }
                        }
                        catch (e) { }
                        try {
                            data = JSON.parse($('extraData').textContent || '[]');
                            try {
                                for (_a = __values(Array.isArray(data) ? data : []), _b = _a.next(); !_b.done; _b = _a.next()) {
                                    d = _b.value;
                                    if (safeDoc(d)) {
                                        docs.set(d.id, d);
                                        embeddedIds.add(d.id);
                                    }
                                }
                            }
                            catch (e_6_1) { e_6 = { error: e_6_1 }; }
                            finally {
                                try {
                                    if (_b && !_b.done && (_e = _a.return)) _e.call(_a);
                                }
                                finally { if (e_6) throw e_6.error; }
                            }
                        }
                        catch (e) {
                            toast('离线扩展数据读取失败，内置内容仍可使用。');
                        }
                        return [2 /*return*/];
                }
            });
        });
    }
    function cacheSave(d) {
        return __awaiter(this, void 0, void 0, function () {
            var stored, e_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        docs.set(d.id, d);
                        stored = false;
                        if (!db) return [3 /*break*/, 4];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, new Promise(function (resolve, reject) { var t = db.transaction('docs', 'readwrite'); t.objectStore('docs').put(d); t.oncomplete = resolve; t.onerror = function () { return reject(t.error); }; t.onabort = function () { return reject(t.error); }; })];
                    case 2:
                        _a.sent();
                        stored = true;
                        return [3 /*break*/, 4];
                    case 3:
                        e_7 = _a.sent();
                        return [3 /*break*/, 4];
                    case 4:
                        if (!stored)
                            try {
                                localStorage.setItem(CACHE_PREFIX + d.id, JSON.stringify(d));
                                stored = true;
                            }
                            catch (e) { }
                        if (!stored && !embeddedIds.has(d.id))
                            volatileDocs.add(d.id);
                        else
                            volatileDocs.delete(d.id);
                        saveNativeDocs();
                        return [2 /*return*/, stored];
                }
            });
        });
    }
    function available(l) { return !!l.game || docs.has(l.id); }
    function rebuildCatalog() { levels = makeCatalog(__spreadArray([], __read(docs.values()), false)); }
    function rec(id) { return state.records[id] || { plays: 0, passes: 0, bestStars: 0, bestAccuracy: 0, lastAccuracy: 0, lastErrors: 0, lastHints: 0, lastPlayed: '', totalMs: 0 }; }
    function groupList() { return current ? levels.filter(function (l) { return l.group === current.level.group; }) : []; }
    function nextLevel() { var a = groupList(), i = a.findIndex(function (l) { return l.id === (current === null || current === void 0 ? void 0 : current.level.id); }); return i >= 0 ? a[i + 1] : null; }
    function setFeedback(msg, kind) {
        if (msg === void 0) { msg = ''; }
        if (kind === void 0) { kind = ''; }
        feedbackMessage = msg;
        feedbackKind = kind;
        $('feedback').textContent = msg;
        $('feedback').className = 'feedback' + (kind ? ' ' + kind : '');
    }
    function stopAuto() { if (autoTimer) {
        clearInterval(autoTimer);
        autoTimer = null;
    } $('autoPlay').textContent = '▶ 自动'; }
    function showTab(tab) { stopAuto(); if (window.GoBattle)
        GoBattle.leave(); activeTab = tab; document.body.dataset.page = tab; var header = $('appHeader'); if (tab === 'practice' || tab === 'battle') {
        $(tab).querySelector('.lesson-card').prepend(header);
    }
    else {
        document.body.insertBefore(header, $('storageWarning'));
    } document.querySelectorAll('.page').forEach(function (p) { return p.hidden = p.id !== tab; }); document.querySelectorAll('[data-tab]').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === tab); b.setAttribute('aria-current', b.dataset.tab === tab ? 'page' : 'false'); }); if (tab === 'battle' && window.GoBattle)
        GoBattle.enter(); if (tab === 'levels')
        renderLevels(); if (tab === 'progress')
        renderProgress(); if (tab === 'library')
        renderLibrary(); scheduleLayout(); }
    function fitLayout() {
        var _a;
        document.documentElement.style.setProperty('--app-height', Math.floor(((_a = window.visualViewport) === null || _a === void 0 ? void 0 : _a.height) || window.innerHeight) + 'px');
        if (activeTab === 'practice' || activeTab === 'battle') {
            var container = $(activeTab), grid = container.querySelector('.practice-grid'), style = getComputedStyle(grid), gap = parseFloat(style.columnGap) || 10;
            // Reserve a usable touch-control rail, then give the board the largest possible square.
            // Spare width on wide tablets belongs to controls, not to empty space around the board.
            var minimum = window.innerWidth < 960 ? 292 : 320;
            var sidebar = Math.max(minimum, grid.clientWidth - grid.clientHeight - gap);
            grid.style.setProperty('--sidebar-width', Math.floor(sidebar) + 'px');
            var stage = container.querySelector('.board-stage'), size = Math.max(1, Math.floor(Math.min(stage.clientWidth, stage.clientHeight)));
            var wrap = $(activeTab === 'battle' ? 'battleBoardWrap' : 'boardWrap');
            wrap.style.width = size + 'px';
            wrap.style.height = size + 'px';
            document.documentElement.style.setProperty('--sidebar-width', Math.floor(sidebar) + 'px');
        }
        if (activeTab === 'levels') {
            var grid = $('levelGrid'), w = grid.clientWidth, h = grid.clientHeight;
            var cols = Math.max(3, Math.min(6, Math.floor((w + 10) / 205))), rows = Math.max(1, Math.min(4, Math.floor((h + 10) / 120)));
            grid.style.gridTemplateColumns = 'repeat(' + cols + ',minmax(0,1fr))';
            grid.style.gridTemplateRows = 'repeat(' + rows + ',minmax(0,1fr))';
            var size = cols * rows;
            if (size !== PAGE_SIZE) {
                var first = page * PAGE_SIZE;
                PAGE_SIZE = size;
                page = Math.floor(first / PAGE_SIZE);
                renderLevels();
            }
        }
    }
    function scheduleLayout() { if (layoutFrame)
        cancelAnimationFrame(layoutFrame); layoutFrame = requestAnimationFrame(function () { layoutFrame = 0; fitLayout(); }); }
    function askAction(action, text, label) {
        confirmAction = action;
        $('confirmText').textContent = text;
        $('confirmGo').textContent = label;
        $('confirmGo').setAttribute('data-say', label);
        $('confirmDialog').hidden = false;
        stopAuto();
        $('confirmStay').focus({ preventScroll: true });
    }
    function closeConfirm() { confirmAction = null; $('confirmDialog').hidden = true; }
    function safeLoadLevel(id) {
        if (current && mode === 'training' && at > 0 && id !== current.level.id) {
            askAction(function () { return loadLevel(id); }, '切换后，本次尚未完成的挑战会结束。已经通关的成绩仍然保留。', '切换关卡');
            return;
        }
        loadLevel(id);
    }
    function updateLevelSwitch() {
        var list = groupList(), i = list.findIndex(function (l) { return l.id === (current === null || current === void 0 ? void 0 : current.level.id); });
        $('previousLevel').disabled = i <= 0;
        $('forwardLevel').disabled = i < 0 || i >= list.length - 1;
        $('previousLevel').title = i > 0 ? list[i - 1].title : '这是本组第一关';
        $('forwardLevel').title = i >= 0 && i < list.length - 1 ? list[i + 1].title : '本组最后一关，可点选关换组';
    }
    function downloadFile(name, text, type) { if (Native) {
        if (!Native.exportFile(name, String(text), type.split(';')[0]))
            throw Error('无法开始保存，请检查文件大小');
        return;
    } var blob = new Blob([text], { type: type }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(function () { return URL.revokeObjectURL(url); }, 10000); }
    function obtainGame(l) {
        return __awaiter(this, void 0, void 0, function () {
            var cached;
            return __generator(this, function (_a) {
                if (l.game)
                    return [2 /*return*/, GoEngine.compile(l.game)];
                cached = docs.get(l.id);
                if (cached)
                    return [2 /*return*/, GoEngine.compile(GoEngine.parse(cached.sgf, l.title)[0])];
                throw Error('本地棋谱缺失，请检查安装包或恢复导入棋谱。');
            });
        });
    }
    function loadLevel(id_1) {
        return __awaiter(this, arguments, void 0, function (id, _a) {
            var l, serial, game, total_1, s, hints_1, hints_1_1, p, e_8;
            var e_9, _b;
            var _c = _a === void 0 ? {} : _a, _d = _c.resume, resume = _d === void 0 ? false : _d, _e = _c.focus, focus = _e === void 0 ? true : _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        l = levels.find(function (x) { return x.id === id; });
                        if (!l)
                            return [2 /*return*/, toast('找不到该关卡；请先恢复对应的 SGF 棋谱。')];
                        stopAuto();
                        serial = ++loadSerial;
                        if (!available(l)) {
                            $('loadingText').textContent = '正在读取本地棋谱…';
                            $('loading').hidden = false;
                        }
                        _f.label = 1;
                    case 1:
                        _f.trys.push([1, 3, 4, 5]);
                        return [4 /*yield*/, obtainGame(l)];
                    case 2:
                        game = _f.sent();
                        if (serial !== loadSerial)
                            return [2 /*return*/];
                        current = { level: l, game: game, start: l.start || 0, end: l.end || game.moves.length };
                        mode = 'preview';
                        at = 0;
                        errors = 0;
                        bad = new Set();
                        hints = new Set();
                        startedAt = 0;
                        hintVisible = false;
                        wrongPoint = -1;
                        total_1 = current.end - current.start, s = state.session;
                        if (resume && (s === null || s === void 0 ? void 0 : s.id) === id && s.mode === 'training' && Number.isInteger(s.at) && s.at >= 0 && s.at < total_1) {
                            mode = 'training';
                            at = s.at;
                            errors = numeric(s.errors);
                            bad = new Set((Array.isArray(s.bad) ? s.bad : []).filter(function (x) { return Number.isInteger(x) && x >= 0 && x < total_1; }));
                            hints = new Set((Array.isArray(s.hints) ? s.hints : []).filter(function (x) { return Number.isInteger(x) && x >= 0 && x < total_1; }));
                            try {
                                for (hints_1 = __values(hints), hints_1_1 = hints_1.next(); !hints_1_1.done; hints_1_1 = hints_1.next()) {
                                    p = hints_1_1.value;
                                    bad.add(p);
                                }
                            }
                            catch (e_9_1) { e_9 = { error: e_9_1 }; }
                            finally {
                                try {
                                    if (hints_1_1 && !hints_1_1.done && (_b = hints_1.return)) _b.call(hints_1);
                                }
                                finally { if (e_9) throw e_9.error; }
                            }
                            startedAt = Number.isFinite(s.startedAt) ? s.startedAt : Date.now();
                            hintVisible = hints.has(at);
                        }
                        setFeedback(mode === 'training' ? '已接着上次的位置。请继续复摆下一手。' : '先点“下一手”看棋谱；记住后，再开始背。');
                        showTab('practice');
                        renderPractice();
                        sessionSave();
                        scheduleLayout();
                        return [3 /*break*/, 5];
                    case 3:
                        e_8 = _f.sent();
                        toast(e_8.message);
                        return [3 /*break*/, 5];
                    case 4:
                        if (serial === loadSerial)
                            $('loading').hidden = true;
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    }
    function setPreview(p) { if (!current)
        return; at = Math.max(0, Math.min(current.end - current.start, p)); setFeedback(at === current.end - current.start ? '已经看到本关最后一手。准备好就遮住答案，自己摆一遍。' : '看位置，也记住黑白棋的先后顺序。'); renderPractice(); sessionSave(); }
    function startTraining() {
        if (!current)
            return;
        stopAuto();
        mode = 'training';
        at = 0;
        errors = 0;
        bad = new Set();
        hints = new Set();
        hintVisible = false;
        wrongPoint = -1;
        startedAt = Date.now();
        var r = rec(current.level.id);
        r.plays++;
        r.lastPlayed = new Date().toISOString();
        state.records[current.level.id] = r;
        setFeedback('轮到你了！按刚才的顺序，把黑白棋都摆出来。');
        renderPractice();
        sessionSave();
    }
    function finish() {
        mode = 'complete';
        hintVisible = false;
        var total = current.end - current.start, accuracy = Math.round((total - bad.size) / total * 1000) / 10, stars = bad.size === 0 ? 3 : accuracy >= 80 ? 2 : 1, r = rec(current.level.id);
        r.passes++;
        r.bestAccuracy = Math.max(r.bestAccuracy, accuracy);
        r.bestStars = Math.max(r.bestStars, stars);
        r.lastAccuracy = accuracy;
        r.lastErrors = errors;
        r.lastHints = hints.size;
        r.lastPlayed = new Date().toISOString();
        r.totalMs += Math.min(Math.max(0, Date.now() - startedAt), 3600000);
        state.records[current.level.id] = r;
        setFeedback(stars === 3 ? '全部独立记住了，获得三星！' : '已经摆完这关！再练一遍，就能记得更稳。', 'success');
        renderPractice();
        sessionSave();
        if (window.ButtonVoice)
            ButtonVoice.say('本关完成鼓励');
    }
    function attempt(p) {
        if (!current || mode !== 'training')
            return;
        var expected = current.game.moves[current.start + at];
        if (!expected)
            return;
        if (p >= 0 && current.game.boards[current.start + at][p]) {
            setFeedback('这个交叉点已经有棋子了，请选空点。');
            return;
        }
        if (p !== expected.p) {
            errors++;
            bad.add(at);
            wrongPoint = p;
            setFeedback('这手与参考棋谱不同。再想一想，也可以看提示。', 'error');
            renderPractice();
            sessionSave();
            if (window.ButtonVoice && Date.now() - lastWrongVoiceAt > 1600) {
                lastWrongVoiceAt = Date.now();
                ButtonVoice.say('落子再想想');
            }
            var id_1 = current.level.id;
            setTimeout(function () { if ((current === null || current === void 0 ? void 0 : current.level.id) === id_1) {
                wrongPoint = -1;
                renderBoard();
            } }, 700);
            return;
        }
        at++;
        hintVisible = false;
        wrongPoint = -1;
        if (at === current.end - current.start)
            return finish();
        setFeedback('这一手记对了！继续下一手。', 'success');
        renderPractice();
        sessionSave();
    }
    function showHint() { if (mode !== 'training' || !current)
        return; hints.add(at); bad.add(at); hintVisible = true; var p = current.game.moves[current.start + at].p; setFeedback(p < 0 ? '下一手是“停一手”，点击下方的停一手按钮。' : '绿色虚线圈就是下一手的位置。看清楚后，再自己落子。'); renderPractice(); sessionSave(); }
    function viewport() {
        var g = current.game, n = g.n;
        if (!zoom || n <= 9 || current.level.group === 'classic')
            return { x0: 0, y0: 0, count: n };
        var pts = [];
        g.initial.forEach(function (c, p) { if (c)
            pts.push(p); });
        g.moves.forEach(function (m) { if (m.p >= 0)
            pts.push(m.p); });
        if (!pts.length)
            return { x0: 0, y0: 0, count: n };
        var xs = pts.map(function (p) { return p % n; }), ys = pts.map(function (p) { return Math.floor(p / n); }), xmin = Math.min.apply(Math, __spreadArray([], __read(xs), false)), xmax = Math.max.apply(Math, __spreadArray([], __read(xs), false)), ymin = Math.min.apply(Math, __spreadArray([], __read(ys), false)), ymax = Math.max.apply(Math, __spreadArray([], __read(ys), false)), count = Math.min(n, Math.max(7, xmax - xmin + 3, ymax - ymin + 3));
        return { x0: Math.max(0, Math.min(n - count, Math.floor((xmin + xmax - count + 1) / 2))), y0: Math.max(0, Math.min(n - count, Math.floor((ymin + ymax - count + 1) / 2))), count: count };
    }
    function renderBoard() {
        var e_10, _a, e_11, _b;
        if (!current)
            return;
        var g = current.game, n = g.n, v = viewport(), margin = Math.max(32, Math.ceil(280 / (v.count - 1) + 13)), step = (600 - 2 * margin) / (v.count - 1), board = g.boards[current.start + at], numbers = g.numbers[current.start + at], last = current.start + at > 0 ? g.moves[current.start + at - 1] : null;
        boardGeometry = __assign(__assign({}, v), { step: step, margin: margin, n: n });
        var pos = function (p) { return ({ x: margin + (p % n - v.x0) * step, y: margin + (Math.floor(p / n) - v.y0) * step }); }, inView = function (p) { return p >= 0 && p % n >= v.x0 && p % n < v.x0 + v.count && Math.floor(p / n) >= v.y0 && Math.floor(p / n) < v.y0 + v.count; };
        var svg = '<defs><linearGradient id="wood" x2="1" y2="1"><stop stop-color="#eed6a6"/><stop offset="1" stop-color="#e4bf7e"/></linearGradient><radialGradient id="blackStone" cx=".33" cy=".25" r=".8"><stop stop-color="#48504b"/><stop offset="1" stop-color="#101b16"/></radialGradient><radialGradient id="whiteStone" cx=".35" cy=".25" r=".85"><stop stop-color="#fffef6"/><stop offset="1" stop-color="#e7e5d9"/></radialGradient></defs><rect width="600" height="600" fill="url(#wood)"/>';
        for (var i = 0; i < v.count; i++) {
            var p = margin + i * step;
            svg += '<path d="M ' + margin + ' ' + p + ' H ' + (600 - margin) + ' M ' + p + ' ' + margin + ' V ' + (600 - margin) + '" stroke="#7a613a" stroke-width="1.1"/>';
        }
        var letters = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';
        for (var i = 0; i < v.count; i++) {
            var p = margin + i * step;
            svg += '<text x="' + p + '" y="18" text-anchor="middle" font-size="' + Math.min(16, step * .47) + '" fill="#705c39">' + letters[v.x0 + i] + '</text><text x="14" y="' + (p + 5) + '" text-anchor="middle" font-size="' + Math.min(16, step * .47) + '" fill="#705c39">' + (n - v.y0 - i) + '</text>';
        }
        var stars = n === 19 ? [3, 9, 15] : n === 13 ? [3, 6, 9] : n === 9 ? [2, 4, 6] : [];
        try {
            for (var stars_1 = __values(stars), stars_1_1 = stars_1.next(); !stars_1_1.done; stars_1_1 = stars_1.next()) {
                var y = stars_1_1.value;
                try {
                    for (var stars_2 = (e_11 = void 0, __values(stars)), stars_2_1 = stars_2.next(); !stars_2_1.done; stars_2_1 = stars_2.next()) {
                        var x = stars_2_1.value;
                        if (n === 9 && ((x === 4) !== (y === 4)))
                            continue;
                        var p = y * n + x;
                        if (inView(p)) {
                            var q = pos(p);
                            svg += '<circle cx="' + q.x + '" cy="' + q.y + '" r="' + Math.max(2.4, step * .065) + '" fill="#705b39"/>';
                        }
                    }
                }
                catch (e_11_1) { e_11 = { error: e_11_1 }; }
                finally {
                    try {
                        if (stars_2_1 && !stars_2_1.done && (_b = stars_2.return)) _b.call(stars_2);
                    }
                    finally { if (e_11) throw e_11.error; }
                }
            }
        }
        catch (e_10_1) { e_10 = { error: e_10_1 }; }
        finally {
            try {
                if (stars_1_1 && !stars_1_1.done && (_a = stars_1.return)) _a.call(stars_1);
            }
            finally { if (e_10) throw e_10.error; }
        }
        board.forEach(function (c, p) { if (!c || !inView(p))
            return; var q = pos(p), r = step * .435; svg += '<circle cx="' + (q.x + 1) + '" cy="' + (q.y + 2) + '" r="' + r + '" fill="#3e2f2025"/><circle cx="' + q.x + '" cy="' + q.y + '" r="' + r + '" fill="url(#' + (c === 1 ? 'blackStone' : 'whiteStone') + ')" stroke="' + (c === 1 ? '#15231b' : '#bbb9aa') + '" stroke-width=".8"/>'; if ($('showNumbers').checked && numbers[p] > current.start) {
            svg += '<text x="' + q.x + '" y="' + q.y + '" dominant-baseline="central" text-anchor="middle" font-size="' + (step * .36) + '" font-weight="650" fill="' + (c === 1 ? '#fffaf0' : '#233d31') + '">' + (numbers[p] - current.start) + '</text>';
        }
        else if ((last === null || last === void 0 ? void 0 : last.p) === p && at > 0) {
            svg += '<circle cx="' + q.x + '" cy="' + q.y + '" r="' + (step * .105) + '" fill="' + (c === 1 ? '#eef5e6' : '#396d50') + '"/>';
        } });
        if (mode === 'training' && hintVisible) {
            var m = g.moves[current.start + at];
            if (m && inView(m.p)) {
                var q = pos(m.p);
                svg += '<circle cx="' + q.x + '" cy="' + q.y + '" r="' + (step * .35) + '" fill="#ffffff50" stroke="#1a7353" stroke-width="3" stroke-dasharray="5 3"/>';
            }
        }
        if (wrongPoint >= 0 && inView(wrongPoint)) {
            var q = pos(wrongPoint), r = step * .2;
            svg += '<path d="M ' + (q.x - r) + ' ' + (q.y - r) + ' L ' + (q.x + r) + ' ' + (q.y + r) + ' M ' + (q.x - r) + ' ' + (q.y + r) + ' L ' + (q.x + r) + ' ' + (q.y - r) + '" stroke="#b1492e" stroke-width="3"/>';
        }
        $('board').innerHTML = svg;
        $('board').setAttribute('aria-label', n + '路围棋棋盘，' + (mode === 'training' ? '点击交叉点复摆' : '看谱模式'));
        $('zoomButton').textContent = v.count < n ? '查看全盘' : '局部放大';
        $('zoomButton').disabled = n <= 9 || current.level.group === 'classic';
        $('zoomButton').setAttribute('aria-pressed', String(v.count < n));
    }
    function renderPractice() {
        if (!current)
            return;
        var l = current.level, total = current.end - current.start, r = rec(l.id), next = current.game.moves[current.start + at];
        $('currentCategory').textContent = CATEGORY[l.group] + ' · ' + (groupList().findIndex(function (x) { return x.id === l.id; }) + 1) + ' / ' + groupList().length;
        $('levelTitle').textContent = l.title;
        $('readLevelName').setAttribute('data-say', l.title);
        $('readLevelName').setAttribute('aria-label', '朗读关卡名称：' + l.title);
        $('levelSubtitle').textContent = l.subtitle + ' · 本关 ' + total + ' 手';
        $('modeLabel').textContent = mode === 'preview' ? '① 先看棋谱' : mode === 'training' ? '② 自己复摆' : '✓ 已完成';
        $('moveLabel').textContent = at + ' / ' + total + ' 手';
        $('turnLabel').textContent = mode === 'complete' ? '完成了！可以继续下一关' : mode === 'training' ? ((next === null || next === void 0 ? void 0 : next.c) === 1 ? '● 黑棋' : '○ 白棋') + ' · 请摆第 ' + (at + 1) + ' 手' : (at === total ? '看完了，可以开始背了' : '先看懂位置和落子顺序');
        $('previewControls').hidden = mode !== 'preview';
        $('trainingControls').hidden = mode !== 'training';
        $('completeControls').hidden = mode !== 'complete';
        $('moveSlider').max = total;
        $('moveSlider').value = at;
        $('prevMove').disabled = at === 0;
        $('nextMove').disabled = at === total;
        $('rewind').disabled = at === 0;
        $('stepMetric').textContent = at;
        $('errorMetric').textContent = errors;
        $('hintMetric').textContent = hints.size;
        $('hint').disabled = hints.has(at);
        $('lessonNote').textContent = l.note;
        $('bestResult').textContent = r.passes ? '已经通关 ' + r.passes + ' 次 · 最佳独立正确率 ' + r.bestAccuracy + '% · ' + r.bestStars + ' 星' : '还没有通关记录，完成一遍就会自动保存。';
        $('levelSource').textContent = l.source;
        $('levelLicense').textContent = l.license;
        $('levelTitle').title = l.title;
        updateLevelSwitch();
        if (mode === 'complete') {
            var acc = Math.round((total - bad.size) / total * 1000) / 10, stars = bad.size === 0 ? 3 : acc >= 80 ? 2 : 1;
            $('stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
            $('resultText').textContent = '首次独立摆对 ' + (total - bad.size) + ' / ' + total + ' 手（' + acc + '%）\n错手 ' + errors + ' 次 · 提示 ' + hints.size + ' 手';
            $('nextLevel').textContent = nextLevel() ? '继续下一关 →' : '本组练完啦 · 去选新关';
        }
        renderBoard();
        scheduleLayout();
    }
    function renderLevels() {
        var category = $('categoryFilter').value, status = $('statusFilter').value, q = $('searchLevels').value.trim().toLowerCase();
        var a = levels.filter(function (l) { var r = rec(l.id); return (category === 'all' || l.group === category) && (!q || (l.title + ' ' + l.subtitle + ' ' + l.id + ' ' + CATEGORY[l.group]).toLowerCase().includes(q)) && (status === 'all' || status === 'offline' && available(l) || status === 'new' && !r.passes || status === 'passed' && r.passes || status === 'review' && r.passes && r.bestStars < 3); });
        page = Math.max(0, Math.min(page, Math.ceil(a.length / PAGE_SIZE) - 1));
        $('filterCount').textContent = '共 ' + a.length + ' 关 · 绿色卡片为已通关';
        $('catalogCount').textContent = levels.length + ' 个关卡入口';
        $('offlineCount').textContent = levels.filter(available).length + ' 关当前可离线练';
        $('levelGrid').innerHTML = a.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(function (l) { var r = rec(l.id); return '<button class="level-card ' + (r.passes ? 'passed ' : '') + ((current === null || current === void 0 ? void 0 : current.level.id) === l.id ? 'current' : '') + '" data-level="' + esc(l.id) + '"><span class="number">' + esc(CATEGORY[l.group]) + ' · ' + esc(l.id.split('-').slice(-1)[0]) + '</span><strong>' + esc(l.title) + '</strong><small>' + esc(l.subtitle) + (l.game ? ' · ' + (l.end - l.start) + ' 手' : '') + '</small><small>' + (available(l) ? '<i class="offline-dot"></i>已离线可用' : '本地数据缺失') + '</small><span class="level-stars">' + (r.passes ? '★'.repeat(r.bestStars) + '☆'.repeat(3 - r.bestStars) + ' <small>最佳 ' + r.bestAccuracy + '%</small>' : '<small>尚未通关</small>') + '</span></button>'; }).join('') || '<p class="empty-message">没有符合条件的关卡。可以调整分类或搜索词。</p>';
        $('pageLabel').textContent = (a.length ? page + 1 : 0) + ' / ' + Math.ceil(a.length / PAGE_SIZE) + ' 页';
        $('pagePrev').disabled = page === 0;
        $('pageNext').disabled = (page + 1) * PAGE_SIZE >= a.length;
        $('continueLast').disabled = !state.lastId;
    }
    function renderProgress() {
        if (window.GoBattle)
            GoBattle.renderRecords();
        var known = new Set(levels.map(function (l) { return l.id; })), entries = Object.entries(state.records).filter(function (_a) {
            var _b = __read(_a, 1), id = _b[0];
            return known.has(id);
        }), passed = entries.filter(function (_a) {
            var _b = __read(_a, 2), r = _b[1];
            return r.passes;
        }).length, perfect = entries.filter(function (_a) {
            var _b = __read(_a, 2), r = _b[1];
            return r.bestStars === 3;
        }).length, plays = entries.reduce(function (a, _a) {
            var _b = __read(_a, 2), r = _b[1];
            return a + r.plays;
        }, 0), passes = entries.reduce(function (a, _a) {
            var _b = __read(_a, 2), r = _b[1];
            return a + r.passes;
        }, 0);
        $('progressMetrics').innerHTML = [[passed, '已通关的关卡'], [perfect, '三星关卡'], [plays, '累计挑战次数'], [passes, '累计完成次数']].map(function (_a) {
            var _b = __read(_a, 2), v = _b[0], t = _b[1];
            return '<div><b>' + v + '</b><small>' + t + '</small></div>';
        }).join('');
        $('groupProgress').innerHTML = Object.entries(CATEGORY).map(function (_a) {
            var _b = __read(_a, 2), k = _b[0], title = _b[1];
            var a = levels.filter(function (l) { return l.group === k; }), n = a.filter(function (l) { return rec(l.id).passes; }).length;
            return a.length ? '<div class="group-row"><header><span>' + title + '</span><span>' + n + ' / ' + a.length + '</span></header><div class="bar-track"><i style="width:' + (n / a.length * 100) + '%"></i></div></div>' : '';
        }).join('');
        var rows = entries.sort(function (a, b) { return b[1].lastPlayed.localeCompare(a[1].lastPlayed); }).slice(0, 12);
        $('recentList').innerHTML = rows.map(function (_a) {
            var _b = __read(_a, 2), id = _b[0], r = _b[1];
            var l = levels.find(function (x) { return x.id === id; }), time = r.lastPlayed ? new Date(r.lastPlayed).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
            return '<div class="recent-row"><div><strong>' + esc(l.title) + '</strong><small>' + esc(l.subtitle) + ' · ' + esc(time) + '</small><br><small>挑战 ' + r.plays + ' 次 · 通关 ' + r.passes + ' 次' + (r.passes ? ' · 最佳 ' + r.bestAccuracy + '%' : ' · 尚未完成') + '</small></div><button class="secondary small" data-level="' + esc(id) + '">再练</button></div>';
        }).join('') || '<p class="muted">还没有练习记录。去完成第一关吧。</p>';
    }
    function renderLibrary() { var n = __spreadArray([], __read(docs.keys()), false).filter(function (k) { return k.startsWith('import-'); }).length; $('cacheStatus').textContent = '内置 548 关全部可用；已导入自己的棋谱 ' + n + ' 个。' + (volatileDocs.size ? '有导入棋谱未写入缓存，请导出 JSON 备份。' : ''); }
    function importSGF(text, title) {
        return __awaiter(this, void 0, void 0, function () {
            var games, games_1, games_1_1, g, id, doc, existed;
            var e_12, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        games = GoEngine.parse(text, title || '导入棋谱');
                        try {
                            for (games_1 = __values(games), games_1_1 = games_1.next(); !games_1_1.done; games_1_1 = games_1.next()) {
                                g = games_1_1.value;
                                GoEngine.compile(g);
                            }
                        }
                        catch (e_12_1) { e_12 = { error: e_12_1 }; }
                        finally {
                            try {
                                if (games_1_1 && !games_1_1.done && (_a = games_1.return)) _a.call(games_1);
                            }
                            finally { if (e_12) throw e_12.error; }
                        }
                        id = 'import-' + GoEngine.hash(text), doc = { id: id, title: String(title || games[0].title || '导入棋谱').slice(0, 100), sgf: text, source: '用户导入' };
                        existed = docs.has(id);
                        return [4 /*yield*/, cacheSave(doc)];
                    case 1:
                        _b.sent();
                        rebuildCatalog();
                        return [2 /*return*/, { id: id, existed: existed, levels: levels.filter(function (l) { return l.docId === id; }).length }];
                }
            });
        });
    }
    function importFiles(files) {
        return __awaiter(this, void 0, void 0, function () {
            var ok, fail, last, details, files_1, files_1_1, f, bytes, text, encoding, e_13, e_14_1;
            var e_14, _a;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (files.length > 100)
                            return [2 /*return*/, toast('每次最多导入 100 个 SGF 文件。')];
                        ok = 0, fail = 0, last = null, details = [];
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 9, 10, 11]);
                        files_1 = __values(files), files_1_1 = files_1.next();
                        _c.label = 2;
                    case 2:
                        if (!!files_1_1.done) return [3 /*break*/, 8];
                        f = files_1_1.value;
                        _c.label = 3;
                    case 3:
                        _c.trys.push([3, 6, , 7]);
                        if (f.size > 3000000)
                            throw Error('文件超过 3 MB');
                        return [4 /*yield*/, f.arrayBuffer()];
                    case 4:
                        bytes = _c.sent();
                        text = new TextDecoder('utf-8').decode(bytes);
                        encoding = (_b = text.match(/CA\[(GB2312|GBK|GB18030|Big5)\]/i)) === null || _b === void 0 ? void 0 : _b[1];
                        if (encoding)
                            text = new TextDecoder(encoding.toLowerCase() === 'big5' ? 'big5' : 'gb18030').decode(bytes);
                        return [4 /*yield*/, importSGF(text, f.name.replace(/\.sgf$/i, ''))];
                    case 5:
                        last = _c.sent();
                        ok++;
                        return [3 /*break*/, 7];
                    case 6:
                        e_13 = _c.sent();
                        fail++;
                        details.push(f.name + '：' + e_13.message);
                        return [3 /*break*/, 7];
                    case 7:
                        files_1_1 = files_1.next();
                        return [3 /*break*/, 2];
                    case 8: return [3 /*break*/, 11];
                    case 9:
                        e_14_1 = _c.sent();
                        e_14 = { error: e_14_1 };
                        return [3 /*break*/, 11];
                    case 10:
                        try {
                            if (files_1_1 && !files_1_1.done && (_a = files_1.return)) _a.call(files_1);
                        }
                        finally { if (e_14) throw e_14.error; }
                        return [7 /*endfinally*/];
                    case 11:
                        $('importStatus').textContent = '导入成功 ' + ok + ' 个文件，失败 ' + fail + ' 个。' + details.slice(0, 4).join('；');
                        renderLibrary();
                        if (last) {
                            $('categoryFilter').value = 'imported';
                            page = 0;
                            toast('棋谱已加入“我的棋谱”，共 ' + levels.filter(function (l) { return l.group === 'imported'; }).length + ' 关。');
                        }
                        return [2 /*return*/];
                }
            });
        });
    }
    function exportBackup() {
        sessionSave();
        var payload = { app: 'weiqi-memory-trainer', version: 2, exportedAt: new Date().toISOString(), progress: state, docs: __spreadArray([], __read(docs.values()), false).map(function (d) { return ({ id: d.id, sgf: d.sgf, title: d.title, source: d.source }); }) };
        downloadFile('围棋闯关备份_' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(payload), 'application/json;charset=utf-8');
        $('backupStatus').textContent = '已准备备份，请在系统窗口中选择保存位置。';
        toast(Native ? '请选择备份保存位置。' : '备份文件已生成。');
    }
    function importBackup(file) {
        return __awaiter(this, void 0, void 0, function () {
            var data, _a, _b, items, count, skipped, items_1, items_1_1, d, _c, _d, g, e_15, e_16_1, incoming, _e, _f, _g, id, r, old, latest, e_17;
            var e_16, _h, e_18, _j, e_19, _k;
            return __generator(this, function (_l) {
                switch (_l.label) {
                    case 0:
                        _l.trys.push([0, 12, , 13]);
                        if (file.size > 30000000)
                            throw Error('备份文件超过 30 MB');
                        _b = (_a = JSON).parse;
                        return [4 /*yield*/, file.text()];
                    case 1:
                        data = _b.apply(_a, [_l.sent()]);
                        if (data.app !== 'weiqi-memory-trainer' || data.version !== 2 || !data.progress)
                            throw Error('不是本应用支持的备份文件');
                        items = Array.isArray(data.docs) ? data.docs : [];
                        if (items.length > 2000)
                            throw Error('备份棋谱条目过多');
                        count = 0, skipped = 0;
                        _l.label = 2;
                    case 2:
                        _l.trys.push([2, 9, 10, 11]);
                        items_1 = __values(items), items_1_1 = items_1.next();
                        _l.label = 3;
                    case 3:
                        if (!!items_1_1.done) return [3 /*break*/, 8];
                        d = items_1_1.value;
                        _l.label = 4;
                    case 4:
                        _l.trys.push([4, 6, , 7]);
                        if (!safeDoc(d))
                            throw Error('无效条目');
                        try {
                            for (_c = (e_18 = void 0, __values(GoEngine.parse(d.sgf, d.title))), _d = _c.next(); !_d.done; _d = _c.next()) {
                                g = _d.value;
                                GoEngine.compile(g);
                            }
                        }
                        catch (e_18_1) { e_18 = { error: e_18_1 }; }
                        finally {
                            try {
                                if (_d && !_d.done && (_j = _c.return)) _j.call(_c);
                            }
                            finally { if (e_18) throw e_18.error; }
                        }
                        return [4 /*yield*/, cacheSave({ id: d.id, sgf: d.sgf, title: String(d.title || '棋谱').slice(0, 100), source: typeof d.source === 'string' ? d.source.slice(0, 400) : '' })];
                    case 5:
                        _l.sent();
                        count++;
                        return [3 /*break*/, 7];
                    case 6:
                        e_15 = _l.sent();
                        skipped++;
                        return [3 /*break*/, 7];
                    case 7:
                        items_1_1 = items_1.next();
                        return [3 /*break*/, 3];
                    case 8: return [3 /*break*/, 11];
                    case 9:
                        e_16_1 = _l.sent();
                        e_16 = { error: e_16_1 };
                        return [3 /*break*/, 11];
                    case 10:
                        try {
                            if (items_1_1 && !items_1_1.done && (_h = items_1.return)) _h.call(items_1);
                        }
                        finally { if (e_16) throw e_16.error; }
                        return [7 /*endfinally*/];
                    case 11:
                        incoming = cleanRecords(data.progress.records);
                        try {
                            for (_e = __values(Object.entries(incoming)), _f = _e.next(); !_f.done; _f = _e.next()) {
                                _g = __read(_f.value, 2), id = _g[0], r = _g[1];
                                old = rec(id), latest = r.lastPlayed > old.lastPlayed ? r : old;
                                state.records[id] = __assign(__assign({}, latest), { plays: Math.max(old.plays, r.plays), passes: Math.max(old.passes, r.passes), bestStars: Math.max(old.bestStars, r.bestStars), bestAccuracy: Math.max(old.bestAccuracy, r.bestAccuracy), totalMs: Math.max(old.totalMs, r.totalMs) });
                            }
                        }
                        catch (e_19_1) { e_19 = { error: e_19_1 }; }
                        finally {
                            try {
                                if (_f && !_f.done && (_k = _e.return)) _k.call(_e);
                            }
                            finally { if (e_19) throw e_19.error; }
                        }
                        if (!state.lastId && typeof data.progress.lastId === 'string') {
                            state.lastId = data.progress.lastId;
                            state.session = data.progress.session || null;
                        }
                        if (window.GoBattle)
                            GoBattle.importProgress(data.progress);
                        rebuildCatalog();
                        saveState();
                        renderLibrary();
                        renderProgress();
                        if (current)
                            renderPractice();
                        $('backupStatus').textContent = '已合并 ' + Object.keys(incoming).length + ' 条记录、恢复 ' + count + ' 个扩展棋谱。' + (skipped ? '跳过 ' + skipped + ' 个无效棋谱条目。' : '') + '相同关卡保留更高成绩与较大次数，不重复累加。';
                        toast('备份已恢复，已有最佳成绩不会降低。');
                        return [3 /*break*/, 13];
                    case 12:
                        e_17 = _l.sent();
                        $('backupStatus').textContent = '恢复失败：' + e_17.message;
                        toast('恢复失败：' + e_17.message);
                        return [3 /*break*/, 13];
                    case 13: return [2 /*return*/];
                }
            });
        });
    }
    function exportOffline() {
        return __awaiter(this, void 0, void 0, function () {
            function readLocal(path) { return new Promise(function (resolve, reject) { var x = new XMLHttpRequest(); x.open('GET', path, true); x.onload = function () { return x.status === 200 ? resolve(x.responseText) : reject(Error('读取失败：' + path)); }; x.onerror = function () { return reject(Error('读取失败：' + path)); }; x.send(); }); }
            var html, doc, style, sty, _a, links, links_1, links_1_1, node, path, text, map, _loop_1, _b, _c, _d, k, path_1, e_20_1, embedded, _e, _f, _g, k, path_2, e_21_1, csp, e_22;
            var e_21, _h, e_20, _j, e_23, _k;
            return __generator(this, function (_l) {
                switch (_l.label) {
                    case 0:
                        _l.trys.push([0, 20, , 21]);
                        toast('正在打包离线网页。此操作较大；练习记录仍请另行备份。');
                        return [4 /*yield*/, readLocal('index.html')];
                    case 1:
                        html = _l.sent(), doc = new DOMParser().parseFromString(html, 'text/html');
                        doc.getElementById('extraData').textContent = JSON.stringify(__spreadArray([], __read(docs.values()), false)).replace(/</g, '\\u003c');
                        style = doc.querySelector('link[rel=stylesheet]'), sty = doc.createElement('style');
                        _a = sty;
                        return [4 /*yield*/, readLocal('app.css')];
                    case 2:
                        _a.textContent = _l.sent();
                        style.replaceWith(sty);
                        links = __spreadArray([], __read(doc.querySelectorAll('script[src]')), false);
                        _l.label = 3;
                    case 3:
                        _l.trys.push([3, 17, 18, 19]);
                        links_1 = __values(links), links_1_1 = links_1.next();
                        _l.label = 4;
                    case 4:
                        if (!!links_1_1.done) return [3 /*break*/, 16];
                        node = links_1_1.value;
                        path = node.getAttribute('src');
                        return [4 /*yield*/, readLocal(path)];
                    case 5:
                        text = _l.sent();
                        if (!(path === 'voice-map.js')) return [3 /*break*/, 14];
                        map = {};
                        _loop_1 = function (k, path_1) {
                            var _m, _o;
                            return __generator(this, function (_p) {
                                switch (_p.label) {
                                    case 0:
                                        if (!!map[path_1]) return [3 /*break*/, 2];
                                        _m = map;
                                        _o = path_1;
                                        return [4 /*yield*/, new Promise(function (resolve, reject) { var x = new XMLHttpRequest(); x.open('GET', path_1); x.responseType = 'blob'; x.onload = function () { if (x.status !== 200)
                                                return reject(Error('声音读取失败')); var r = new FileReader(); r.onload = function () { return resolve(r.result); }; r.onerror = reject; r.readAsDataURL(x.response); }; x.onerror = reject; x.send(); })];
                                    case 1:
                                        _m[_o] = _p.sent();
                                        _p.label = 2;
                                    case 2: return [2 /*return*/];
                                }
                            });
                        };
                        _l.label = 6;
                    case 6:
                        _l.trys.push([6, 11, 12, 13]);
                        _b = (e_20 = void 0, __values(Object.entries(window.VOICE_FILES))), _c = _b.next();
                        _l.label = 7;
                    case 7:
                        if (!!_c.done) return [3 /*break*/, 10];
                        _d = __read(_c.value, 2), k = _d[0], path_1 = _d[1];
                        return [5 /*yield**/, _loop_1(k, path_1)];
                    case 8:
                        _l.sent();
                        _l.label = 9;
                    case 9:
                        _c = _b.next();
                        return [3 /*break*/, 7];
                    case 10: return [3 /*break*/, 13];
                    case 11:
                        e_20_1 = _l.sent();
                        e_20 = { error: e_20_1 };
                        return [3 /*break*/, 13];
                    case 12:
                        try {
                            if (_c && !_c.done && (_j = _b.return)) _j.call(_b);
                        }
                        finally { if (e_20) throw e_20.error; }
                        return [7 /*endfinally*/];
                    case 13:
                        embedded = {};
                        try {
                            for (_e = (e_23 = void 0, __values(Object.entries(window.VOICE_FILES))), _f = _e.next(); !_f.done; _f = _e.next()) {
                                _g = __read(_f.value, 2), k = _g[0], path_2 = _g[1];
                                embedded[k] = map[path_2];
                            }
                        }
                        catch (e_23_1) { e_23 = { error: e_23_1 }; }
                        finally {
                            try {
                                if (_f && !_f.done && (_k = _e.return)) _k.call(_e);
                            }
                            finally { if (e_23) throw e_23.error; }
                        }
                        text = 'window.VOICE_FILES=' + JSON.stringify(embedded) + ';';
                        _l.label = 14;
                    case 14:
                        node.removeAttribute('src');
                        node.removeAttribute('defer');
                        node.textContent = text.replace(/<\/script/gi, '<\\/script');
                        _l.label = 15;
                    case 15:
                        links_1_1 = links_1.next();
                        return [3 /*break*/, 4];
                    case 16: return [3 /*break*/, 19];
                    case 17:
                        e_21_1 = _l.sent();
                        e_21 = { error: e_21_1 };
                        return [3 /*break*/, 19];
                    case 18:
                        try {
                            if (links_1_1 && !links_1_1.done && (_h = links_1.return)) _h.call(links_1);
                        }
                        finally { if (e_21) throw e_21.error; }
                        return [7 /*endfinally*/];
                    case 19:
                        csp = doc.querySelector('meta[http-equiv="Content-Security-Policy"]');
                        csp.setAttribute('content', csp.getAttribute('content').replace("script-src 'self'", "script-src 'self' 'unsafe-inline'"));
                        downloadFile('围棋背谱闯关_离线整合版.html', '<!doctype html>\n' + doc.documentElement.outerHTML, 'text/html;charset=utf-8');
                        $('backupStatus').textContent = '离线网页已准备保存。练习记录请另外导出 JSON。';
                        return [3 /*break*/, 21];
                    case 20:
                        e_22 = _l.sent();
                        toast('导出失败：' + e_22.message);
                        return [3 /*break*/, 21];
                    case 21: return [2 /*return*/];
                }
            });
        });
    }
    function bindEvents() {
        var e_24, _a, e_25, _b;
        var _this = this;
        $('readLevelName').onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            $('readLevelName').click();
        } };
        $('readLevelName').onclick = function () { if (window.ButtonVoice && !ButtonVoice.enabled)
            toast('先点右上角小喇叭打开语音，再听关卡名称。'); };
        document.querySelectorAll('[data-tab]').forEach(function (b) { return b.addEventListener('click', function () { return showTab(b.dataset.tab); }); });
        $('chooseLevel').onclick = function () { if (current)
            $('categoryFilter').value = current.level.group; page = 0; showTab('levels'); };
        $('completeMap').onclick = function () { return showTab('levels'); };
        $('startTraining').onclick = startTraining;
        $('retry').onclick = startTraining;
        $('restart').onclick = function () { return askAction(startTraining, '从本关第一手重新挑战？已经获得的最佳成绩不会改变。', '重新挑战'); };
        $('review').onclick = function () { return askAction(function () { mode = 'preview'; at = 0; hintVisible = false; setFeedback('先重新看一遍，再开始新的挑战。'); renderPractice(); sessionSave(); }, '结束本次挑战并重新看谱？已经获得的最佳成绩不会改变。', '重看棋谱'); };
        $('rewind').onclick = function () { stopAuto(); setPreview(0); };
        $('prevMove').onclick = function () { stopAuto(); setPreview(at - 1); };
        $('nextMove').onclick = function () { stopAuto(); setPreview(at + 1); };
        $('moveSlider').oninput = function (e) { stopAuto(); setPreview(+e.target.value); };
        $('autoPlay').onclick = function () { if (autoTimer)
            return stopAuto(); if (!current)
            return; if (at === current.end - current.start)
            setPreview(0); $('autoPlay').textContent = 'Ⅱ 暂停'; autoTimer = setInterval(function () { if (mode !== 'preview')
            return stopAuto(); setPreview(at + 1); if (at === current.end - current.start)
            stopAuto(); }, 1200); };
        $('hint').onclick = showHint;
        $('pass').onclick = function () { return attempt(-1); };
        $('nextLevel').onclick = function () { var n = nextLevel(); if (n)
            loadLevel(n.id);
        else
            showTab('levels'); };
        $('showNumbers').onchange = function () { renderBoard(); if (window.ButtonVoice)
            ButtonVoice.say($('showNumbers').checked ? '手数显示' : '手数隐藏'); };
        $('zoomButton').onclick = function () { zoom = !zoom; renderBoard(); };
        $('board').addEventListener('click', function (e) { if (mode !== 'training' || !boardGeometry)
            return; var r = $('board').getBoundingClientRect(), b = boardGeometry, x = (e.clientX - r.left) / r.width * 600, y = (e.clientY - r.top) / r.height * 600, xx = Math.round((x - b.margin) / b.step), yy = Math.round((y - b.margin) / b.step); if (xx < 0 || yy < 0 || xx >= b.count || yy >= b.count || Math.abs(x - (b.margin + xx * b.step)) > b.step * .48 || Math.abs(y - (b.margin + yy * b.step)) > b.step * .48)
            return; attempt((yy + b.y0) * b.n + xx + b.x0); });
        try {
            for (var _c = __values(['categoryFilter', 'statusFilter']), _d = _c.next(); !_d.done; _d = _c.next()) {
                var id = _d.value;
                $(id).onchange = function () { page = 0; renderLevels(); };
            }
        }
        catch (e_24_1) { e_24 = { error: e_24_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_24) throw e_24.error; }
        }
        $('searchLevels').oninput = function () { page = 0; renderLevels(); };
        $('pagePrev').onclick = function () { page--; renderLevels(); };
        $('pageNext').onclick = function () { page++; renderLevels(); };
        try {
            for (var _e = __values(['levelGrid', 'recentList']), _f = _e.next(); !_f.done; _f = _e.next()) {
                var id = _f.value;
                $(id).onclick = function (e) { var b = e.target.closest('[data-level]'); if (b)
                    safeLoadLevel(b.dataset.level); };
            }
        }
        catch (e_25_1) { e_25 = { error: e_25_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
            }
            finally { if (e_25) throw e_25.error; }
        }
        $('continueLast').onclick = function () { return loadLevel(state.lastId, { resume: true }); };
        $('randomReview').onclick = function () { var cat = $('categoryFilter').value, a = levels.filter(function (l) { return rec(l.id).passes && (cat === 'all' || l.group === cat); }); if (!a.length)
            return toast('当前分类还没有通关关卡，先完成一关吧。'); loadLevel(a[Math.floor(Math.random() * a.length)].id); };
        $('sgfFiles').onchange = function (e) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, importFiles(__spreadArray([], __read(e.target.files), false))];
                case 1:
                    _a.sent();
                    e.target.value = '';
                    return [2 /*return*/];
            }
        }); }); };
        $('importText').onclick = function () { return __awaiter(_this, void 0, void 0, function () { var r, e_26; return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, importSGF($('sgfText').value, $('sgfTitle').value.trim())];
                case 1:
                    r = _a.sent();
                    $('importStatus').textContent = (r.existed ? '这个棋谱已存在，保留原有记录。' : '导入成功。') + '共有 ' + r.levels + ' 个分段关卡。';
                    renderLibrary();
                    $('categoryFilter').value = 'imported';
                    page = 0;
                    toast('已加入“我的棋谱”。');
                    return [3 /*break*/, 3];
                case 2:
                    e_26 = _a.sent();
                    $('importStatus').textContent = '导入失败：' + e_26.message;
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        }); }); };
        $('exportBackup').onclick = exportBackup;
        $('backupTop').onclick = exportBackup;
        $('backupFile').onchange = function (e) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!e.target.files[0]) return [3 /*break*/, 2];
                    return [4 /*yield*/, importBackup(e.target.files[0])];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    e.target.value = '';
                    return [2 /*return*/];
            }
        }); }); };
        $('exportOffline').onclick = exportOffline;
        $('previousLevel').onclick = function () { var a = groupList(), i = a.findIndex(function (l) { return l.id === (current === null || current === void 0 ? void 0 : current.level.id); }); if (i > 0)
            safeLoadLevel(a[i - 1].id); };
        $('forwardLevel').onclick = function () { var n = nextLevel(); if (n)
            safeLoadLevel(n.id); };
        $('lessonHelp').onclick = function () { stopAuto(); $('lessonHelpDialog').hidden = false; $('closeLessonHelp').focus({ preventScroll: true }); };
        $('closeLessonHelp').onclick = function () { $('lessonHelpDialog').hidden = true; $('lessonHelp').focus({ preventScroll: true }); };
        $('confirmStay').onclick = closeConfirm;
        $('confirmGo').onclick = function () { var action = confirmAction; closeConfirm(); if (action)
            action(); };
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') {
            $('lessonHelpDialog').hidden = true;
            closeConfirm();
        } });
        window.addEventListener('resize', scheduleLayout);
        window.addEventListener('orientationchange', scheduleLayout);
        if (window.visualViewport)
            window.visualViewport.addEventListener('resize', scheduleLayout);
        if (window.ResizeObserver) {
            var ro = new ResizeObserver(scheduleLayout);
            ro.observe(document.querySelector('.board-stage'));
            ro.observe($('levelGrid'));
        }
        document.addEventListener('visibilitychange', function () { if (document.hidden) {
            stopAuto();
            if (window.GoBattle)
                GoBattle.leave();
            sessionSave();
        }
        else if (activeTab === 'battle' && window.GoBattle)
            GoBattle.enter(); });
        window.addEventListener('pagehide', sessionSave);
    }
    window.GoNativeSaveResult = function (ok) { $('backupStatus').textContent = ok ? '文件已保存到所选位置。' : '已取消保存。'; };
    window.GoNativePause = function () { stopAuto(); if (window.GoBattle)
        GoBattle.leave(); sessionSave(); if (window.ButtonVoice)
        ButtonVoice.stop(); };
    function init() {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, k, v, o, saved;
            var e_27, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (window.GoBattle)
                            GoBattle.init({ getState: function () { return state; }, save: saveState, download: downloadFile, layout: scheduleLayout, toast: toast, showTab: showTab });
                        warnStorage();
                        try {
                            for (_a = __values(Object.entries(CATEGORY)), _b = _a.next(); !_b.done; _b = _a.next()) {
                                _c = __read(_b.value, 2), k = _c[0], v = _c[1];
                                o = document.createElement('option');
                                o.value = k;
                                o.textContent = v;
                                $('categoryFilter').append(o);
                            }
                        }
                        catch (e_27_1) { e_27 = { error: e_27_1 }; }
                        finally {
                            try {
                                if (_b && !_b.done && (_d = _a.return)) _d.call(_a);
                            }
                            finally { if (e_27) throw e_27.error; }
                        }
                        bindEvents();
                        return [4 /*yield*/, openCache()];
                    case 1:
                        _e.sent();
                        saveNativeDocs();
                        rebuildCatalog();
                        renderLibrary();
                        saveState();
                        saved = levels.some(function (l) { return l.id === state.lastId; }) ? state.lastId : levels[0].id;
                        return [4 /*yield*/, loadLevel(saved, { resume: true, focus: false })];
                    case 2:
                        _e.sent();
                        // A small documented test surface; contains no network credentials or private data.
                        window.GoTrainer = { get levels() { return levels; }, get state() { return state; }, get current() { return current; }, get mode() { return mode; }, get at() { return at; }, get geometry() { return boardGeometry; }, loadLevel: loadLevel, startTraining: startTraining, attempt: attempt, showHint: showHint, importSGF: importSGF, importBackup: importBackup, exportBackup: exportBackup, exportOffline: exportOffline, showTab: showTab, renderLevels: renderLevels, get docs() { return docs; }, ready: true, fitLayout: fitLayout, get pageSize() { return PAGE_SIZE; } };
                        scheduleLayout();
                        requestAnimationFrame(function () { if (current && $('board').childNodes.length) {
                            if (window.AppBoot)
                                window.AppBoot.ready();
                        } });
                        return [2 /*return*/];
                }
            });
        });
    }
    init().catch(function (e) { toast('启动失败：' + e.message); console.error(e); if (window.AppBoot)
        window.AppBoot.fail('初始化失败：' + e.message); });
})();
