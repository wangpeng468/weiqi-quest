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
/* Offline battle screen. Keeps its state inside the existing progress envelope,
 * so native backup, export and in-place Android upgrades retain it with the lessons. */
(function () {
    'use strict';
    var E = window.BattleEngine, $ = function (id) { return document.getElementById(id); }, labels = ['轻松', '认真', '挑战'];
    var host = null, game = null, human = 1, difficulty = 0, phase = 'playing', dead = [], result = null, id = '', updatedAt = '', active = false, busy = false, timer = null, ticket = 0, geometry = null, hint = -1, wrong = -1, dialogAction = null, setup = { n: 9, human: 1, difficulty: 0 }, recordsPage = 0, recordFilter = 'all';
    function speak(key) { if (window.ButtonVoice)
        ButtonVoice.say(key); }
    function stamp() { return new Date().toISOString(); }
    function save() { if (!host || !game)
        return; updatedAt = stamp(); host.getState().battle = { version: 1, n: game.n, human: human, difficulty: difficulty, phase: phase, dead: dead.slice(), result: result, id: id, updatedAt: updatedAt, passes: game.passes, moves: game.moves.map(function (m) { return ({ p: m.p, c: m.c }); }) }; host.save(); }
    function cancelAI() { ticket++; clearTimeout(timer); timer = null; busy = false; }
    function leave() { active = false; cancelAI(); }
    function newGame(n, h, d) { cancelAI(); game = E.create(n); human = h; difficulty = d; phase = 'playing'; dead = []; result = null; hint = -1; wrong = -1; id = 'battle-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); save(); render(); if (active)
        scheduleAI(); }
    function load(raw) { var r = E.restore(raw); if (!r)
        return false; game = r.game; human = r.human; difficulty = r.difficulty; phase = r.phase; dead = r.dead; result = r.result; id = r.id; updatedAt = r.updatedAt; hint = -1; wrong = -1; return true; }
    function enter() { active = true; if (!game) {
        newGame(9, 1, 0);
    } render(); if (phase === 'judging' || phase === 'playing' && game.passes >= 2)
        autoFinish();
    else
        scheduleAI(); }
    function status(text, key, icon, kind) {
        if (kind === void 0) { kind = ''; }
        $('battleStatusText').textContent = text;
        $('battleStatus').setAttribute('data-say', key);
        $('battleStatusIcon').textContent = icon || '●';
        $('battleStatus').className = 'battle-status' + (kind ? ' ' + kind : '');
    }
    function canUndo() { return game && phase === 'playing' && game.moves.some(function (m) { return m.c === human; }); }
    function scheduleAI() {
        if (!active || !game || phase !== 'playing' || game.turn === human || busy || document.hidden)
            return;
        busy = true;
        render();
        var token = ++ticket;
        timer = setTimeout(function () { if (token !== ticket || !active || document.hidden)
            return; try {
            var p = E.choose(game, difficulty);
            if (token !== ticket)
                return;
            busy = false;
            apply(p, false);
        }
        catch (e) {
            busy = false;
            status('电脑暂停了，点这里重试。', '电脑重试', '↻', 'error');
            console.warn('offline AI', e);
        } }, 450);
    }
    function apply(p, isHuman) {
        if (!game || phase !== 'playing' || (isHuman && (busy || game.turn !== human)))
            return false;
        var r = E.play(game, p);
        if (!r.ok) {
            wrong = p;
            var k = r.reason === 'occupied' ? '这里已经有棋子' : r.reason === 'suicide' ? '这里没有气' : r.reason === 'ko' ? '不能马上打劫' : '点交叉点';
            status(k, k, '!', 'error');
            speak(k);
            renderBoard();
            return false;
        }
        hint = -1;
        wrong = -1;
        if (game.passes >= 2) {
            autoFinish();
            return true;
        }
        save();
        render();
        if (isHuman)
            scheduleAI();
        else if (p < 0) {
            status('电脑停一手，轮到你了。', '电脑停一手', '✋');
            speak('电脑停一手');
        }
        else if (active)
            speak('轮到你了');
        return true;
    }
    function ask(title, text, key, action, yes, yesKey) {
        if (yes === void 0) { yes = '✓ 确定'; }
        if (yesKey === void 0) { yesKey = '对战确定'; }
        dialogAction = action;
        $('battleDialogTitle').textContent = title;
        $('battleDialogText').textContent = text;
        $('battleDialogYes').textContent = yes;
        $('battleDialogYes').setAttribute('data-say', yesKey);
        $('battleDialog').hidden = false;
        speak(key);
    }
    function closeDialog() { $('battleDialog').hidden = true; dialogAction = null; }
    function beginScoring() { cancelAI(); phase = 'scoring'; hint = -1; wrong = -1; save(); render(); speak('对战标记死子'); }
    function score() { var s = E.area(game.board, game.n, dead), komi = 7.5, d = s.black - s.white - komi; return { black: s.black, white: s.white, neutral: s.neutral, komi: komi, winner: d > 0 ? 1 : d < 0 ? 2 : 0, margin: Math.abs(d), reason: 'score', method: 'manual', provisional: false, dead: dead.slice(), notes: [] }; }
    function autoFinish() {
        if (!game || phase === 'finished')
            return;
        cancelAI();
        phase = 'judging';
        hint = -1;
        wrong = -1;
        save();
        render();
        speak('自动判胜负中');
        var token = ++ticket;
        timer = setTimeout(function () { if (token !== ticket || !active)
            return; try {
            var r = E.autoScore(game);
            dead = r.dead.slice();
            finish(r);
        }
        catch (e) {
            phase = 'scoring';
            save();
            render();
            status('自动算分未完成，可以继续下或请家长检查。', '自动判分失败', 'ⓘ');
            speak('自动判分失败');
            console.warn('automatic scoring', e);
        } }, 180);
    }
    function history() { var a = host.getState().battleHistory; return Array.isArray(a) ? a : []; }
    function cleanHistory(a) {
        var e_1, _a, e_2, _b;
        if (!Array.isArray(a))
            return [];
        var seen = {}, out = [];
        try {
            for (var _c = __values(a.slice(0, 1000)), _d = _c.next(); !_d.done; _d = _c.next()) {
                var x = _d.value;
                if (!x || typeof x.id !== 'string' || typeof x.date !== 'string' || !Number.isFinite(Date.parse(x.date)) || [9, 13, 19].indexOf(x.n) < 0 || [1, 2].indexOf(x.human) < 0 || [0, 1, 2].indexOf(x.winner) < 0 || [0, 1, 2].indexOf(x.difficulty) < 0)
                    continue;
                var row = { id: x.id.slice(0, 80), date: x.date.slice(0, 35), updatedAt: typeof x.updatedAt === 'string' && Number.isFinite(Date.parse(x.updatedAt)) ? x.updatedAt.slice(0, 35) : x.date.slice(0, 35), n: x.n, human: x.human, winner: x.winner, difficulty: x.difficulty, moves: Math.max(0, Math.min(3000, Math.floor(Number(x.moves) || 0))), reason: x.reason === 'resign' ? 'resign' : 'score', method: ['auto', 'manual'].indexOf(x.method) >= 0 ? x.method : 'legacy', provisional: x.provisional === true, black: null, white: null, komi: null, margin: null, autoDead: Math.max(0, Math.min(x.n * x.n, Number(x.autoDead) || 0)), unsettledGroups: Math.max(0, Math.min(x.n * x.n, Number(x.unsettledGroups) || 0)) };
                if (row.reason === 'score' && Number.isFinite(x.black) && Number.isFinite(x.white) && Number.isFinite(x.komi) && x.black >= 0 && x.white >= 0 && x.black + x.white <= x.n * x.n && Math.abs(x.komi) <= 100) {
                    row.black = x.black;
                    row.white = x.white;
                    row.komi = x.komi;
                    row.margin = Math.abs(x.black - x.white - x.komi);
                    row.winner = x.black > x.white + x.komi ? 1 : x.black < x.white + x.komi ? 2 : 0;
                }
                if (!seen[row.id] || row.updatedAt > seen[row.id].updatedAt)
                    seen[row.id] = row;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_1) throw e_1.error; }
        }
        try {
            for (var _e = __values(Object.keys(seen)), _f = _e.next(); !_f.done; _f = _e.next()) {
                var k = _f.value;
                out.push(seen[k]);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return out.sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 100);
    }
    function cleanVoids(a) {
        var e_3, _a;
        var m = {};
        try {
            for (var _b = __values(Array.isArray(a) ? a.slice(0, 1000) : []), _c = _b.next(); !_c.done; _c = _b.next()) {
                var x = _c.value;
                if (x && typeof x.id === 'string' && typeof x.date === 'string' && Number.isFinite(Date.parse(x.date)))
                    if (!m[x.id] || m[x.id] < x.date)
                        m[x.id] = x.date;
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return Object.keys(m).map(function (id) { return ({ id: id.slice(0, 80), date: m[id] }); });
    }
    function syncRows(rows) {
        var e_4, _a;
        var v = {};
        try {
            for (var _b = __values(cleanVoids(host.getState().battleVoids)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var x = _c.value;
                v[x.id] = x.date;
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_4) throw e_4.error; }
        }
        host.getState().battleHistory = cleanHistory(rows).filter(function (x) { return !v[x.id] || x.updatedAt > v[x.id]; });
    }
    function resultVoice(r) { return r.provisional ? (r.winner === 0 ? '估算和棋' : r.winner === human ? '估算你赢了' : '估算电脑赢了') : (r.winner === 0 ? '对战和棋' : r.winner === human ? '对战赢了' : '对战结束鼓励'); }
    function finish(r) {
        if (!game || !r || [0, 1, 2].indexOf(r.winner) < 0)
            return;
        cancelAI();
        result = r;
        phase = 'finished';
        var rows = history().filter(function (x) { return x.id !== id; }), date = stamp();
        rows.unshift({ id: id, date: date, updatedAt: date, n: game.n, human: human, difficulty: difficulty, moves: game.moves.length, winner: r.winner, reason: r.reason, method: r.method || 'manual', provisional: !!r.provisional, black: r.black, white: r.white, komi: r.komi, margin: r.margin, autoDead: r.autoDead || 0, unsettledGroups: r.unsettledGroups || 0 });
        host.getState().battleVoids = cleanVoids(host.getState().battleVoids).filter(function (x) { return x.id !== id; });
        syncRows(rows);
        save();
        render();
        renderRecords();
        speak(resultVoice(r));
    }
    function resumeGame() {
        if (!game)
            return;
        cancelAI();
        if (history().some(function (x) { return x.id === id; })) {
            host.getState().battleHistory = history().filter(function (x) { return x.id !== id; });
            host.getState().battleVoids = cleanVoids((host.getState().battleVoids || []).concat([{ id: id, date: stamp() }]));
        }
        phase = 'playing';
        result = null;
        game.passes = 0;
        dead = [];
        hint = -1;
        wrong = -1;
        save();
        render();
        renderRecords();
        scheduleAI();
    }
    function undo() { if (!canUndo())
        return; cancelAI(); game = E.undo(game, human); hint = -1; wrong = -1; dead = []; save(); render(); speak('对战悔棋完成'); scheduleAI(); }
    function suggest() { if (!game || phase !== 'playing' || busy || game.turn !== human)
        return; hint = E.choose(game, 2, function () { return .5; }); wrong = -1; renderBoard(); if (hint < 0) {
        status('没有合适的落点，可以停一手。', '提示停一手', '✋');
        speak('提示停一手');
    }
    else {
        speak('对战提示落点');
    } }
    function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]); }); }
    function renderBoard() {
        var e_5, _a, e_6, _b;
        if (!game)
            return;
        var n = game.n, margin = 33, step = (600 - 2 * margin) / (n - 1), b = game.board;
        geometry = { n: n, margin: margin, step: step };
        var pos = function (p) { return ({ x: margin + p % n * step, y: margin + Math.floor(p / n) * step }); };
        var scored = phase === 'scoring' || phase === 'finished' && result && result.reason === 'score', territory = scored ? E.area(b, n, dead) : null;
        var svg = '<defs><linearGradient id="battleWood" x2="1" y2="1"><stop stop-color="#eed6a6"/><stop offset="1" stop-color="#e4bf7e"/></linearGradient><radialGradient id="battleBlack" cx=".33" cy=".25" r=".8"><stop stop-color="#48504b"/><stop offset="1" stop-color="#101b16"/></radialGradient><radialGradient id="battleWhite" cx=".35" cy=".25" r=".85"><stop stop-color="#fffef6"/><stop offset="1" stop-color="#e7e5d9"/></radialGradient></defs><rect width="600" height="600" fill="url(#battleWood)"/>';
        for (var i = 0; i < n; i++) {
            var p = margin + i * step;
            svg += '<path d="M ' + margin + ' ' + p + ' H ' + (600 - margin) + ' M ' + p + ' ' + margin + ' V ' + (600 - margin) + '" stroke="#7a613a" stroke-width="1.1"/>';
        }
        var letters = 'ABCDEFGHJKLMNOPQRST';
        for (var i = 0; i < n; i++) {
            var p = margin + i * step;
            svg += '<text x="' + p + '" y="18" text-anchor="middle" font-size="14" fill="#705c39">' + letters[i] + '</text><text x="14" y="' + (p + 5) + '" text-anchor="middle" font-size="14" fill="#705c39">' + (n - i) + '</text>';
        }
        var stars = n === 19 ? [3, 9, 15] : n === 13 ? [3, 6, 9] : [2, 4, 6];
        try {
            for (var stars_1 = __values(stars), stars_1_1 = stars_1.next(); !stars_1_1.done; stars_1_1 = stars_1.next()) {
                var y = stars_1_1.value;
                try {
                    for (var stars_2 = (e_6 = void 0, __values(stars)), stars_2_1 = stars_2.next(); !stars_2_1.done; stars_2_1 = stars_2.next()) {
                        var x = stars_2_1.value;
                        if (n === 9 && ((x === 4) !== (y === 4)))
                            continue;
                        svg += '<circle cx="' + (margin + x * step) + '" cy="' + (margin + y * step) + '" r="2.8" fill="#705b39"/>';
                    }
                }
                catch (e_6_1) { e_6 = { error: e_6_1 }; }
                finally {
                    try {
                        if (stars_2_1 && !stars_2_1.done && (_b = stars_2.return)) _b.call(stars_2);
                    }
                    finally { if (e_6) throw e_6.error; }
                }
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (stars_1_1 && !stars_1_1.done && (_a = stars_1.return)) _a.call(stars_1);
            }
            finally { if (e_5) throw e_5.error; }
        }
        var last = game.moves.length ? game.moves[game.moves.length - 1].p : -1;
        for (var p = 0; p < b.length; p++) {
            var q = pos(p), c = b[p], isDead = dead.indexOf(p) >= 0;
            if (!c) {
                if (territory && territory.owner[p]) {
                    var rr = step * .13;
                    svg += '<rect x="' + (q.x - rr) + '" y="' + (q.y - rr) + '" width="' + (rr * 2) + '" height="' + (rr * 2) + '" fill="' + (territory.owner[p] === 1 ? '#1b3025' : '#fffdf5') + '" stroke="#78653e" stroke-width=".6"/>';
                }
                continue;
            }
            var r = step * .435;
            svg += '<circle cx="' + (q.x + 1) + '" cy="' + (q.y + 2) + '" r="' + r + '" fill="#3e2f2025"/><circle cx="' + q.x + '" cy="' + q.y + '" r="' + r + '" fill="url(#' + (c === 1 ? 'battleBlack' : 'battleWhite') + ')" stroke="' + (c === 1 ? '#15231b' : '#bbb9aa') + '" stroke-width=".8"' + (isDead ? ' opacity=".42"' : '') + '/>';
            if (p === last && !isDead)
                svg += '<circle cx="' + q.x + '" cy="' + q.y + '" r="' + (step * .11) + '" fill="' + (c === 1 ? '#fff8d0' : '#205c49') + '"/>';
            if (isDead) {
                var rr = step * .22;
                svg += '<path d="M ' + (q.x - rr) + ' ' + (q.y - rr) + ' L ' + (q.x + rr) + ' ' + (q.y + rr) + ' M ' + (q.x - rr) + ' ' + (q.y + rr) + ' L ' + (q.x + rr) + ' ' + (q.y - rr) + '" stroke="#ad3e2f" stroke-width="3"/>';
            }
        }
        if (hint >= 0 && phase === 'playing') {
            var q = pos(hint);
            svg += '<circle cx="' + q.x + '" cy="' + q.y + '" r="' + (step * .35) + '" fill="#fff9" stroke="#205c49" stroke-width="3" stroke-dasharray="5 3"/>';
        }
        if (wrong >= 0 && wrong < b.length) {
            var q = pos(wrong);
            svg += '<circle cx="' + q.x + '" cy="' + q.y + '" r="' + (step * .35) + '" fill="none" stroke="#b1492e" stroke-width="3"/>';
        }
        $('battleBoard').innerHTML = svg;
        $('battleBoard').setAttribute('aria-label', n + '路围棋棋盘，' + (phase === 'scoring' ? '点击棋块标记或取消死子' : '点击交叉点落子'));
        if (territory)
            $('battleScorePreview').innerHTML = '<span>● ' + territory.black + '</span><span>○ ' + territory.white + ' + 7.5</span>';
    }
    function render() {
        var e_7, _a, e_8, _b;
        if (!game)
            return;
        $('battleSummary').textContent = game.n + ' 路 · 你执' + (human === 1 ? '黑棋 ●' : '白棋 ○') + ' · 白贴 7.5';
        $('battleMoveCount').textContent = '已下 ' + game.moves.length + ' 手';
        $('battleCaptures').textContent = '提子 ● ' + game.captures[1] + ' / ○ ' + game.captures[2];
        $('battle').setAttribute('data-phase', phase);
        try {
            for (var _c = __values(document.querySelectorAll('[data-difficulty]')), _d = _c.next(); !_d.done; _d = _c.next()) {
                var el = _d.value;
                var yes = Number(el.dataset.difficulty) === difficulty;
                el.classList.toggle('active', yes);
                el.setAttribute('aria-pressed', String(yes));
                el.disabled = phase !== 'playing';
            }
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_7) throw e_7.error; }
        }
        $('battleJudging').hidden = phase !== 'judging';
        $('battlePlay').hidden = phase !== 'playing';
        $('battleScoring').hidden = phase !== 'scoring';
        $('battleResult').hidden = phase !== 'finished';
        $('battleUndo').disabled = !canUndo();
        try {
            for (var _e = __values(['battleHint', 'battlePass']), _f = _e.next(); !_f.done; _f = _e.next()) {
                var key = _f.value;
                $(key).disabled = busy || game.turn !== human || phase !== 'playing';
            }
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
            }
            finally { if (e_8) throw e_8.error; }
        }
        $('battleScore').disabled = busy || game.turn !== human || !game.moves.length;
        $('battleResign').disabled = phase !== 'playing';
        if (phase === 'judging')
            status('正在自动计算胜负…', '自动判胜负中', '◷');
        else if (phase === 'scoring')
            status('请和家长一起检查死子。', '对战标记死子', '▦');
        else if (phase === 'finished')
            status(result && result.provisional ? '估算结果已保存，可请家长复核。' : '胜负已保存到记录。', '对战结果已保存', '✓');
        else if (busy || game.turn !== human)
            status('电脑正在想…', '电脑在想', '◷');
        else
            status('轮到你了，放' + (human === 1 ? '黑棋' : '白棋') + '。', human === 1 ? '请下黑棋' : '请下白棋', human === 1 ? '●' : '○');
        $('battleTip').textContent = busy ? '电脑正在选择落点。想改上一步，可以点“悔棋”。' : game.moves.length === 0 ? '先看棋盘，点击交叉点落子。' : '圈点是刚刚落下的棋子。想改一改，就点“悔棋”。';
        var rows = history();
        $('battleRecord').textContent = '本机已完成 ' + rows.length + ' 局 · 对局自动保存';
        if (phase === 'finished' && result) {
            var won = result.winner === human, draw = result.winner === 0;
            $('battleResultIcon').textContent = draw ? '＝' : won ? '★' : '♡';
            $('battleResultTitle').textContent = (result.provisional ? '估算：' : '') + (draw ? '这一局和棋' : won ? '你赢啦！' : '电脑赢了，再加油！');
            $('battleResultTitle').setAttribute('data-say', resultVoice(result));
            $('battleResultDetails').textContent = result.reason === 'resign' ? '认输结束，结果已记录。' : ('● ' + Number(result.black) + ' 点 · ○ ' + Number(result.white) + ' + ' + Number(result.komi == null ? 7.5 : result.komi) + ' 点\n' + (draw ? '双方分数相同。' : (result.winner === 1 ? '黑棋' : '白棋') + '胜 ' + Number(result.margin == null ? Math.abs(result.black - result.white - 7.5) : result.margin) + ' 点。'));
            $('battleResultDetails').textContent = $('battleResultDetails').textContent.replace(/\\n/g, '\n');
            $('battleResultCaution').textContent = result.provisional ? '死活或早停有疑点：这是练习估算，不是最终裁判。' : result.reason === 'resign' ? '认输胜负已确定。' : result.method === 'manual' ? '已按家长确认的死子标记计分。' : '按活棋子与围住的空点计算。';
            $('battleCorrect').hidden = result.reason === 'resign';
            $('battleContinueAfter').hidden = result.reason === 'resign';
        }
        renderBoard();
        if (host)
            host.layout();
    }
    function point(event) { var r = $('battleBoard').getBoundingClientRect(), g = geometry; if (!g || !r.width)
        return -2; var x = (event.clientX - r.left) / r.width * 600, y = (event.clientY - r.top) / r.height * 600, xx = Math.round((x - g.margin) / g.step), yy = Math.round((y - g.margin) / g.step); if (xx < 0 || yy < 0 || xx >= g.n || yy >= g.n || Math.abs(x - g.margin - xx * g.step) > g.step * .48 || Math.abs(y - g.margin - yy * g.step) > g.step * .48)
        return -2; return yy * g.n + xx; }
    function boardClick(event) { var p = point(event); if (p < 0)
        return; if (phase === 'scoring') {
        if (!game.board[p])
            return;
        var stones_1 = E.group(game.board, p, game.n).stones;
        var remove = dead.indexOf(p) >= 0;
        if (remove)
            dead = dead.filter(function (q) { return stones_1.indexOf(q) < 0; });
        else
            dead = dead.concat(stones_1.filter(function (q) { return dead.indexOf(q) < 0; }));
        save();
        renderBoard();
        speak(remove ? '取消死子标记' : '已标记死子');
        return;
    } if (phase !== 'playing')
        return; if (busy || game.turn !== human) {
        speak('电脑在想');
        return;
    } apply(p, true); }
    function updateSetup() {
        var e_9, _a, e_10, _b;
        try {
            for (var _c = __values([['[data-board-size]', 'n'], ['[data-human]', 'human'], ['[data-setup-difficulty]', 'difficulty']]), _d = _c.next(); !_d.done; _d = _c.next()) {
                var _e = __read(_d.value, 2), selector = _e[0], field = _e[1];
                try {
                    for (var _f = (e_10 = void 0, __values(document.querySelectorAll(selector))), _g = _f.next(); !_g.done; _g = _f.next()) {
                        var el = _g.value;
                        var value = Number(el.getAttribute(selector.slice(1, -1)));
                        var selected = value === setup[field];
                        el.classList.toggle('active', selected);
                        el.setAttribute('aria-pressed', String(selected));
                    }
                }
                catch (e_10_1) { e_10 = { error: e_10_1 }; }
                finally {
                    try {
                        if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                    }
                    finally { if (e_10) throw e_10.error; }
                }
            }
        }
        catch (e_9_1) { e_9 = { error: e_9_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_9) throw e_9.error; }
        }
    }
    function openSetup() { setup = { n: game ? game.n : 9, human: human, difficulty: difficulty }; updateSetup(); $('battleSetup').hidden = false; speak('设置新对局'); }
    function info(title, body) { $('battleInfoClose').setAttribute('data-say', document.body.dataset.page === 'progress' ? '返回记录' : '返回对战'); $('battleInfoTitle').textContent = title; $('battleInfoBody').innerHTML = body; $('battleInfo').hidden = false; }
    function exportSGF() {
        var e_11, _a;
        if (!game)
            return;
        var coords = function (p) { return p < 0 ? '' : String.fromCharCode(97 + p % game.n, 97 + Math.floor(p / game.n)); };
        var s = '(;GM[1]FF[4]CA[UTF-8]SZ[' + game.n + ']KM[7.5]PB[' + (human === 1 ? '小棋手' : '本地电脑') + ']PW[' + (human === 2 ? '小棋手' : '本地电脑') + ']';
        if (result) {
            s += 'RE[' + (result.winner === 0 ? '0' : (result.winner === 1 ? 'B' : 'W') + '+' + (result.reason === 'resign' ? 'R' : Math.abs(result.black - result.white - (result.komi == null ? 7.5 : result.komi)))) + ']';
            if (result.provisional)
                s += 'C[练习自动估算，死活未完全确认，结果需要复核。]';
        }
        try {
            for (var _b = __values(game.moves), _c = _b.next(); !_c.done; _c = _b.next()) {
                var m = _c.value;
                s += ';' + (m.c === 1 ? 'B' : 'W') + '[' + coords(m.p) + ']';
            }
        }
        catch (e_11_1) { e_11 = { error: e_11_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_11) throw e_11.error; }
        }
        s += ')';
        host.download('围棋对战_' + new Date().toISOString().slice(0, 10) + '.sgf', s, 'application/x-go-sgf');
    }
    function importProgress(incoming) {
        host.getState().battleVoids = cleanVoids((host.getState().battleVoids || []).concat(incoming.battleVoids || []));
        syncRows(history().concat(Array.isArray(incoming.battleHistory) ? incoming.battleHistory : []));
        var raw = incoming.battle, voidRow = raw && (host.getState().battleVoids || []).find(function (x) { return x.id === raw.id; });
        if (raw && E.restore(raw) && (!voidRow || String(raw.updatedAt || '') > voidRow.date) && (!game || String(raw.updatedAt || '') > updatedAt)) {
            cancelAI();
            if (load(raw)) {
                host.getState().battle = raw;
                render();
                if (active) {
                    if (phase === 'judging')
                        autoFinish();
                    else
                        scheduleAI();
                }
            }
        }
        renderRecords();
    }
    function recordOutcome(r) { return r.winner === 0 ? '和棋' : r.winner === r.human ? '你赢了' : '电脑赢了'; }
    function recordVoice(r) { return r.provisional ? (r.winner === 0 ? '估算和棋' : r.winner === r.human ? '估算你赢了' : '估算电脑赢了') : (r.winner === 0 ? '记录和棋' : r.winner === r.human ? '记录你赢了' : '记录电脑赢了'); }
    function recordScore(r) { return r.reason === 'resign' ? '认输结束' : r.black == null ? '旧版记录 · 未保存分数' : '● ' + r.black + ' · ○ ' + r.white + ' + ' + r.komi + (r.winner === 0 ? ' · 和棋' : ' · 胜 ' + r.margin + ' 点'); }
    function setRecordView(view) { host.getState().recordView = view === 'battle' ? 'battle' : 'lessons'; host.save(); renderRecords(); }
    function showRecords() { host.getState().recordView = 'battle'; host.save(); host.showTab('progress'); renderRecords(); }
    function summary(rows) { var win = rows.filter(function (r) { return r.winner === r.human; }).length, draw = rows.filter(function (r) { return r.winner === 0; }).length, loss = rows.length - win - draw; return { total: rows.length, win: win, loss: loss, draw: draw, provisional: rows.filter(function (r) { return r.provisional; }).length, rate: rows.length ? Math.round(win / rows.length * 100) : 0 }; }
    function renderRecords() {
        var e_12, _a, e_13, _b;
        if (!host || !$('battleRecordsPane'))
            return;
        var isBattle = host.getState().recordView === 'battle';
        $('lessonRecordsPane').hidden = isBattle;
        $('battleRecordsPane').hidden = !isBattle;
        try {
            for (var _c = __values(document.querySelectorAll('[data-record-view]')), _d = _c.next(); !_d.done; _d = _c.next()) {
                var el = _d.value;
                var yes = el.dataset.recordView === (isBattle ? 'battle' : 'lessons');
                el.classList.toggle('active', yes);
                el.setAttribute('aria-pressed', String(yes));
            }
        }
        catch (e_12_1) { e_12 = { error: e_12_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_12) throw e_12.error; }
        }
        $('progressTitle').textContent = isBattle ? '我的对战记录' : '我的闯关记录';
        $('progressDescription').textContent = isBattle ? '胜负自动存本机 · 闯关成绩另存，不会混在一起。' : '保留最佳成绩、挑战次数、通关次数和最近练习时间。';
        var all = history(), stat = summary(all);
        $('battleRecordMetrics').innerHTML = [[stat.win, '★ 赢了'], [stat.loss, '♡ 再加油'], [stat.draw, '＝ 和棋'], [stat.total ? stat.rate + '%' : '—', '胜率']].map(function (_a) {
            var _b = __read(_a, 2), v = _b[0], t = _b[1];
            return '<div><b>' + v + '</b><small>' + t + '</small></div>';
        }).join('');
        $('battleRecordTotals').textContent = '最近 ' + stat.total + ' 局：胜 ' + stat.win + ' · 负 ' + stat.loss + ' · 和 ' + stat.draw + '。' + (stat.provisional ? '其中 ' + stat.provisional + ' 局为估算，已计入上述统计。' : '') + ' 未结束不计入；保留最近 100 局。';
        var rows = all.filter(function (r) { return recordFilter === 'all' || recordFilter === 'win' && r.winner === r.human || recordFilter === 'loss' && r.winner !== 0 && r.winner !== r.human || recordFilter === 'estimate' && r.provisional; });
        var size = window.innerHeight < 600 ? 2 : window.innerHeight < 760 ? 3 : 5, totalPages = Math.max(1, Math.ceil(rows.length / size));
        recordsPage = Math.max(0, Math.min(recordsPage, totalPages - 1));
        $('battleRecordList').innerHTML = rows.slice(recordsPage * size, recordsPage * size + size).map(function (r) {
            var won = r.winner === r.human, draw = r.winner === 0, date = new Date(r.date), time = date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            return '<button class="battle-record-row ' + (draw ? 'draw' : won ? 'won' : 'lost') + '" data-record-id="' + esc(r.id) + '" data-say="' + recordVoice(r) + '"><span class="record-medal" aria-hidden="true">' + (draw ? '＝' : won ? '★' : '♡') + '</span><span class="record-main"><strong>' + recordOutcome(r) + (r.provisional ? ' <em>估算待复核</em>' : '') + '</strong><small>' + esc(time) + ' · ' + r.n + '路 · ' + labels[r.difficulty] + ' · 执' + (r.human === 1 ? '黑' : '白') + ' · ' + r.moves + '手</small></span><span class="record-score">' + recordScore(r) + '<small>' + (r.provisional ? '自动估算' : r.reason === 'resign' ? '认输结算' : r.method === 'manual' ? '家长复核' : r.method === 'auto' ? '自动计分' : '旧版保存') + ' ◖))</small></span></button>';
        }).join('') || '<div class="records-empty">⚔<br>还没有这类对战记录<br><small>完成一局后，胜负会自动出现在这里。</small></div>';
        $('battleRecordsPageLabel').textContent = (recordsPage + 1) + ' / ' + totalPages + ' 页';
        $('battleRecordsPrev').disabled = recordsPage <= 0;
        $('battleRecordsNext').disabled = recordsPage >= totalPages - 1;
        try {
            for (var _e = __values(document.querySelectorAll('[data-record-filter]')), _f = _e.next(); !_f.done; _f = _e.next()) {
                var el = _f.value;
                el.classList.toggle('active', el.dataset.recordFilter === recordFilter);
            }
        }
        catch (e_13_1) { e_13 = { error: e_13_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
            }
            finally { if (e_13) throw e_13.error; }
        }
    }
    function init(h) {
        var e_14, _a, e_15, _b, e_16, _c, e_17, _d, e_18, _e, e_19, _f;
        host = h;
        host.getState().battleVoids = cleanVoids(host.getState().battleVoids);
        syncRows(host.getState().battleHistory);
        if (host.getState().battle && !load(host.getState().battle))
            host.toast('旧对战记录无法读取，闯关成绩不受影响。');
        $('battleBoard').addEventListener('click', boardClick);
        var _loop_1 = function (el) {
            el.onclick = function () { difficulty = Number(el.dataset.difficulty); if (busy)
                cancelAI(); save(); render(); scheduleAI(); };
        };
        try {
            for (var _g = __values(document.querySelectorAll('[data-difficulty]')), _h = _g.next(); !_h.done; _h = _g.next()) {
                var el = _h.value;
                _loop_1(el);
            }
        }
        catch (e_14_1) { e_14 = { error: e_14_1 }; }
        finally {
            try {
                if (_h && !_h.done && (_a = _g.return)) _a.call(_g);
            }
            finally { if (e_14) throw e_14.error; }
        }
        $('battleUndo').onclick = undo;
        $('battleHint').onclick = suggest;
        $('battlePass').onclick = function () { if (busy || game.turn !== human)
            return; ask('停一手？', '这一手先不落子，让电脑下。双方都停一手后，会自动判胜负并保存记录。', '对战停手确认', function () { return apply(-1, true); }, '✋ 停一手', '对战确认停手'); };
        $('battleScore').onclick = function () { if (busy || game.turn !== human || !game.moves.length)
            return; ask('现在自动判胜负？', '将按当前盘面结束并保存这一局。还没下清楚或有复杂死活时，会标为估算；之后仍可继续下或请家长复核。', '自动判分确认', autoFinish, '✓ 判胜负', '确认自动判分'); };
        $('battleResign').onclick = function () { return ask('要结束这一局吗？', '认输后这局结束。闯关记录不会改变。', '对战认输确认', function () { return finish({ reason: 'resign', winner: 3 - human }); }, '⚑ 确认认输', '对战确认认输'); };
        $('battleNew').onclick = openSetup;
        $('battleAgain').onclick = openSetup;
        $('battleResume').onclick = resumeGame;
        $('battleFinish').onclick = function () { return finish(score()); };
        $('battleCorrect').onclick = beginScoring;
        $('battleContinueAfter').onclick = function () { return ask('继续下这一局？', '会撤回本局的胜负记录，恢复下棋；下完后再结算。其他对局和闯关成绩不变。', '撤回结算说明', resumeGame, '▶ 继续下', '对战继续下棋'); };
        $('battleOpenRecords').onclick = showRecords;
        $('battleDialogNo').onclick = closeDialog;
        $('battleDialogYes').onclick = function () { var action = dialogAction; closeDialog(); if (action)
            action(); };
        $('battleSetupClose').onclick = function () { $('battleSetup').hidden = true; };
        var _loop_2 = function (el) {
            el.onclick = function () { setup.n = Number(el.dataset.boardSize); updateSetup(); };
        };
        try {
            for (var _j = __values(document.querySelectorAll('[data-board-size]')), _k = _j.next(); !_k.done; _k = _j.next()) {
                var el = _k.value;
                _loop_2(el);
            }
        }
        catch (e_15_1) { e_15 = { error: e_15_1 }; }
        finally {
            try {
                if (_k && !_k.done && (_b = _j.return)) _b.call(_j);
            }
            finally { if (e_15) throw e_15.error; }
        }
        var _loop_3 = function (el) {
            el.onclick = function () { setup.human = Number(el.dataset.human); updateSetup(); };
        };
        try {
            for (var _l = __values(document.querySelectorAll('[data-human]')), _m = _l.next(); !_m.done; _m = _l.next()) {
                var el = _m.value;
                _loop_3(el);
            }
        }
        catch (e_16_1) { e_16 = { error: e_16_1 }; }
        finally {
            try {
                if (_m && !_m.done && (_c = _l.return)) _c.call(_l);
            }
            finally { if (e_16) throw e_16.error; }
        }
        var _loop_4 = function (el) {
            el.onclick = function () { setup.difficulty = Number(el.dataset.setupDifficulty); updateSetup(); };
        };
        try {
            for (var _o = __values(document.querySelectorAll('[data-setup-difficulty]')), _p = _o.next(); !_p.done; _p = _o.next()) {
                var el = _p.value;
                _loop_4(el);
            }
        }
        catch (e_17_1) { e_17 = { error: e_17_1 }; }
        finally {
            try {
                if (_p && !_p.done && (_d = _o.return)) _d.call(_o);
            }
            finally { if (e_17) throw e_17.error; }
        }
        $('battleSetupGo').onclick = function () { $('battleSetup').hidden = true; newGame(setup.n, setup.human, setup.difficulty); };
        $('battleStatus').onclick = function () { if (phase === 'playing' && game.turn !== human && !busy)
            scheduleAI(); };
        $('battleHelp').onclick = function () { return info('和电脑下围棋', '<p>● 黑棋先走，○ 白棋后走。你和电脑轮流点击交叉点；没有气的棋子会被提走。</p><p>↶ <b>悔棋</b>：回到你上次落子前，也会撤销电脑随后的一手。💡 <b>提示</b>：圈出一个参考落点，不保证最优。</p><p>✋ <b>停一手</b>：不落子，把回合让给对手。双方连续停手后自动判胜负，并保存到记录。</p><p>▦ <b>判胜负</b>：按“活棋子 + 围住的空点”计面积，白棋加 7.5；已提走的棋子不另外加分。对明显包围的小块死棋作有限的本地分析；未确定的棋块留在盘上，结果标为<b>估算待复核</b>。这不是职业级裁判。复杂劫争、双活或未下完的局面，可请家长复核或继续下清楚。</p><p>⚑ <b>认输</b>和＋<b>新一局</b>都先确认。三档难度使用不同的本地启蒙选点策略，不对应专业棋力或段位。</p><p>题库与对战分别保存，切换不会清除成绩。备份导出的 JSON 也包含当前对局和最近结果。</p>'); };
        $('battleHistory').onclick = showRecords;
        var _loop_5 = function (el) {
            el.onclick = function () { return setRecordView(el.dataset.recordView); };
        };
        try {
            for (var _q = __values(document.querySelectorAll('[data-record-view]')), _r = _q.next(); !_r.done; _r = _q.next()) {
                var el = _r.value;
                _loop_5(el);
            }
        }
        catch (e_18_1) { e_18 = { error: e_18_1 }; }
        finally {
            try {
                if (_r && !_r.done && (_e = _q.return)) _e.call(_q);
            }
            finally { if (e_18) throw e_18.error; }
        }
        var _loop_6 = function (el) {
            el.onclick = function () { recordFilter = el.dataset.recordFilter; recordsPage = 0; renderRecords(); };
        };
        try {
            for (var _s = __values(document.querySelectorAll('[data-record-filter]')), _t = _s.next(); !_t.done; _t = _s.next()) {
                var el = _t.value;
                _loop_6(el);
            }
        }
        catch (e_19_1) { e_19 = { error: e_19_1 }; }
        finally {
            try {
                if (_t && !_t.done && (_f = _s.return)) _f.call(_s);
            }
            finally { if (e_19) throw e_19.error; }
        }
        $('battleRecordsPrev').onclick = function () { recordsPage--; renderRecords(); };
        $('battleRecordsNext').onclick = function () { recordsPage++; renderRecords(); };
        $('battleRecordsPlay').onclick = function () { return host.showTab('battle'); };
        $('battleRecordList').addEventListener('click', function (e) { var el = e.target.closest('[data-record-id]'); if (!el)
            return; var r = history().find(function (x) { return x.id === el.dataset.recordId; }); if (!r)
            return; info('这局：' + recordOutcome(r), '<p>' + esc(new Date(r.date).toLocaleString('zh-CN')) + ' · ' + r.n + ' 路 · ' + labels[r.difficulty] + '难度 · 你执' + (r.human === 1 ? '黑棋' : '白棋') + '</p><p><b>' + recordScore(r) + '</b></p><p>' + (r.provisional ? '本局为自动练习估算，未确定的棋块按存活暂计；不是经确认的最终死活判决。' : r.reason === 'resign' ? '认输结算。' : r.method === 'manual' ? '已按家长确认的死子标记计分。' : r.method === 'legacy' ? '这是升级前的记录。旧版未保存黑白具体分数，无法补出。' : '按盘面面积自动计分。') + '</p><p class="muted">胜率按最近保存的全部结果计算，估算记录也包含在内。</p>'); });
        window.addEventListener('resize', function () { if (document.body.dataset.page === 'progress')
            renderRecords(); });
        $('battleReview').onclick = function () { return info('看看这盘棋', '<p>棋盘保留了最终局面。想逐手回看，请导出这盘 SGF，然后在“备份”页导入，即可用看谱功能逐手查看。</p><button id="battleExportSGF" class="primary wide" data-say="导出对战棋谱">▣ 导出这盘 SGF</button>'); };
        $('battleInfoBody').addEventListener('click', function (e) { if (e.target.closest('#battleExportSGF'))
            exportSGF(); });
        $('battleInfoClose').onclick = function () { $('battleInfo').hidden = true; };
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') {
            closeDialog();
            $('battleSetup').hidden = true;
            $('battleInfo').hidden = true;
        } });
    }
    window.GoBattle = { init: init, enter: enter, leave: leave, importProgress: importProgress, render: render, save: save, play: function (p) { return apply(p, true); }, undo: undo, beginScoring: beginScoring, autoFinish: autoFinish, resumeGame: resumeGame, finish: finish, score: score, newGame: newGame, exportSGF: exportSGF, renderRecords: renderRecords, showRecords: showRecords, cleanHistory: cleanHistory, summary: summary, get game() { return game; }, get human() { return human; }, get phase() { return phase; }, get result() { return result; }, get busy() { return busy; }, get geometry() { return geometry; }, get difficulty() { return difficulty; }, get dead() { return dead; }, get active() { return active; } };
})();
