/* 围棋背谱闯关 — local Go/SGF engine, MIT. No network dependencies. */
'use strict';
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
var GoEngine = (function () {
    var chars = 'abcdefghijklmnopqrstuvwxyz';
    function coord(s, n) {
        if (s === '' || (s === 'tt' && n <= 19))
            return -1;
        if (!/^[a-z]{2}$/.test(s))
            throw Error('棋谱坐标格式不正确：' + s);
        var x = chars.indexOf(s[0]), y = chars.indexOf(s[1]);
        if (x >= n || y >= n)
            throw Error('棋谱坐标超出棋盘：' + s);
        return y * n + x;
    }
    function sgfPoint(p, n) { return p < 0 ? '' : chars[p % n] + chars[Math.floor(p / n)]; }
    function neighbors(p, n) { var a = []; if (p % n)
        a.push(p - 1); if (p % n < n - 1)
        a.push(p + 1); if (p >= n)
        a.push(p - n); if (p < n * (n - 1))
        a.push(p + n); return a; }
    function group(board, p, n) {
        var e_1, _a;
        var stones = [], libs = new Set(), seen = new Set([p]), todo = [p], c = board[p];
        while (todo.length) {
            var q = todo.pop();
            stones.push(q);
            try {
                for (var _b = (e_1 = void 0, __values(neighbors(q, n))), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var r = _c.value;
                    if (!board[r])
                        libs.add(r);
                    else if (board[r] === c && !seen.has(r)) {
                        seen.add(r);
                        todo.push(r);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        return { stones: stones, libs: libs };
    }
    function play(board, p, color, n, previous) {
        var e_2, _a, e_3, _b;
        if (previous === void 0) { previous = null; }
        if (p === -1)
            return { board: board.slice(), captured: [] };
        if (!Number.isInteger(p) || p < 0 || p >= n * n)
            throw Error('落点超出棋盘');
        if (board[p])
            throw Error('这个位置已有棋子');
        var b = board.slice();
        b[p] = color;
        var captured = [];
        try {
            for (var _c = __values(neighbors(p, n)), _d = _c.next(); !_d.done; _d = _c.next()) {
                var q = _d.value;
                if (b[q] && b[q] !== color) {
                    var g = group(b, q, n);
                    if (!g.libs.size) {
                        try {
                            for (var _e = (e_3 = void 0, __values(g.stones)), _f = _e.next(); !_f.done; _f = _e.next()) {
                                var r = _f.value;
                                b[r] = 0;
                                captured.push(r);
                            }
                        }
                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                        finally {
                            try {
                                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                            }
                            finally { if (e_3) throw e_3.error; }
                        }
                    }
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_2) throw e_2.error; }
        }
        if (!group(b, p, n).libs.size)
            throw Error('棋谱出现自杀着法，当前版本不支持');
        if (previous && b.every(function (v, i) { return v === previous[i]; }))
            throw Error('棋谱出现立即回提劫的着法');
        return { board: b, captured: captured };
    }
    function parseTrees(text) {
        if (typeof text !== 'string' || text.length > 3000000)
            throw Error('SGF 文件过大（上限 3 MB 文本）');
        text = text.replace(/^\uFEFF/, '');
        var i = 0, count = 0;
        var ws = function () { while (i < text.length && /\s/.test(text[i]))
            i++; };
        function value() {
            if (text[i++] !== '[')
                throw Error('SGF 缺少左括号');
            var out = '';
            while (i < text.length) {
                var c = text[i++];
                if (c === ']')
                    return out;
                if (c === '\\') {
                    if (i >= text.length)
                        break;
                    c = text[i++];
                    if (c === '\r') {
                        if (text[i] === '\n')
                            i++;
                        continue;
                    }
                    if (c === '\n')
                        continue;
                }
                out += c;
            }
            throw Error('SGF 属性没有结束');
        }
        function node() {
            i++;
            if (++count > 30000)
                throw Error('SGF 节点过多');
            var p = Object.create(null);
            ws();
            while (i < text.length && /[A-Za-z]/.test(text[i])) {
                var key = '';
                while (i < text.length && /[A-Za-z]/.test(text[i]))
                    key += text[i++];
                key = key.toUpperCase();
                ws();
                var vals = [];
                while (text[i] === '[') {
                    vals.push(value());
                    ws();
                }
                if (!vals.length)
                    throw Error('SGF 属性缺少值：' + key);
                p[key] = (p[key] || []).concat(vals);
            }
            return p;
        }
        function tree(depth) {
            if (depth > 128)
                throw Error('SGF 变化分支过深');
            if (text[i++] !== '(')
                throw Error('SGF 格式错误');
            ws();
            var seq = [], children = [];
            while (text[i] === ';') {
                seq.push(node());
                ws();
            }
            if (!seq.length)
                throw Error('SGF 棋谱没有节点');
            while (text[i] === '(') {
                children.push(tree(depth + 1));
                ws();
            }
            if (text[i++] !== ')')
                throw Error('SGF 缺少结束括号');
            return { seq: seq, children: children };
        }
        ws();
        var trees = [];
        while (i < text.length) {
            if (text[i] !== '(')
                throw Error('不是有效的 SGF 文件（应以 (; 开始）');
            trees.push(tree(0));
            ws();
        }
        if (!trees.length)
            throw Error('SGF 文件为空');
        return trees;
    }
    function mainline(t) { var a = []; while (t) {
        a.push.apply(a, __spreadArray([], __read(t.seq), false));
        t = t.children[0];
    } return a; }
    function expand(s, n) {
        if (!s.includes(':'))
            return [coord(s, n)];
        var parts = s.split(':');
        if (parts.length !== 2)
            throw Error('摆子范围错误');
        var a = coord(parts[0], n), b = coord(parts[1], n);
        if (a < 0 || b < 0)
            throw Error('摆子范围不能为空');
        var x = a % n, y = Math.floor(a / n), xx = b % n, yy = Math.floor(b / n), out = [];
        if (x > xx || y > yy)
            throw Error('摆子范围方向错误');
        for (var j = y; j <= yy; j++)
            for (var k = x; k <= xx; k++)
                out.push(j * n + k);
        return out;
    }
    function fromTree(t, fallback) {
        var e_4, _a, e_5, _b, e_6, _c, e_7, _d, e_8, _e;
        var _f, _g, _h, _j;
        if (fallback === void 0) { fallback = '导入棋谱'; }
        var nodes = mainline(t), root = nodes[0], sizeText = (root.SZ || ['19'])[0];
        if (root.GM && root.GM[0] !== '1')
            throw Error('这个文件不是围棋棋谱');
        if (!/^\d+$/.test(sizeText))
            throw Error('暂不支持长方形棋盘');
        var n = Number(sizeText);
        if (n < 2 || n > 25)
            throw Error('支持 2–25 路棋盘');
        var board = Array(n * n).fill(0), moves = [];
        var begun = false;
        try {
            for (var nodes_1 = __values(nodes), nodes_1_1 = nodes_1.next(); !nodes_1_1.done; nodes_1_1 = nodes_1.next()) {
                var node = nodes_1_1.value;
                if (node.AB || node.AW || node.AE) {
                    if (begun)
                        throw Error('暂不支持对局中途增删摆子的 SGF，请另存为纯对局主线');
                    var placed = new Set();
                    try {
                        for (var _k = (e_5 = void 0, __values([['AE', 0], ['AB', 1], ['AW', 2]])), _l = _k.next(); !_l.done; _l = _k.next()) {
                            var _m = __read(_l.value, 2), key = _m[0], c = _m[1];
                            try {
                                for (var _o = (e_6 = void 0, __values(node[key] || [])), _p = _o.next(); !_p.done; _p = _o.next()) {
                                    var s = _p.value;
                                    try {
                                        for (var _q = (e_7 = void 0, __values(expand(s, n))), _r = _q.next(); !_r.done; _r = _q.next()) {
                                            var p = _r.value;
                                            if (p < 0)
                                                throw Error('初始摆子坐标为空');
                                            if (placed.has(p))
                                                throw Error('同一节点的摆子坐标重复或冲突');
                                            placed.add(p);
                                            board[p] = c;
                                        }
                                    }
                                    catch (e_7_1) { e_7 = { error: e_7_1 }; }
                                    finally {
                                        try {
                                            if (_r && !_r.done && (_d = _q.return)) _d.call(_q);
                                        }
                                        finally { if (e_7) throw e_7.error; }
                                    }
                                }
                            }
                            catch (e_6_1) { e_6 = { error: e_6_1 }; }
                            finally {
                                try {
                                    if (_p && !_p.done && (_c = _o.return)) _c.call(_o);
                                }
                                finally { if (e_6) throw e_6.error; }
                            }
                        }
                    }
                    catch (e_5_1) { e_5 = { error: e_5_1 }; }
                    finally {
                        try {
                            if (_l && !_l.done && (_b = _k.return)) _b.call(_k);
                        }
                        finally { if (e_5) throw e_5.error; }
                    }
                }
                if (node.B && node.W)
                    throw Error('同一节点同时包含黑棋和白棋');
                try {
                    for (var _s = (e_8 = void 0, __values([['B', 1], ['W', 2]])), _t = _s.next(); !_t.done; _t = _s.next()) {
                        var _u = __read(_t.value, 2), key = _u[0], c = _u[1];
                        if (node[key]) {
                            if (node[key].length !== 1)
                                throw Error('落子节点包含多个落点');
                            begun = true;
                            moves.push({ c: c, p: coord(node[key][0], n) });
                        }
                    }
                }
                catch (e_8_1) { e_8 = { error: e_8_1 }; }
                finally {
                    try {
                        if (_t && !_t.done && (_e = _s.return)) _e.call(_s);
                    }
                    finally { if (e_8) throw e_8.error; }
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (nodes_1_1 && !nodes_1_1.done && (_a = nodes_1.return)) _a.call(nodes_1);
            }
            finally { if (e_4) throw e_4.error; }
        }
        if (!moves.length)
            throw Error('这个棋谱只有摆子，没有可背的落子手顺');
        if (moves.length > 2500)
            throw Error('单谱主线不能超过 2500 手');
        var pair = [(_f = root.PB) === null || _f === void 0 ? void 0 : _f[0], (_g = root.PW) === null || _g === void 0 ? void 0 : _g[0]].filter(Boolean).join(' 对 ');
        return { n: n, initial: board, moves: moves, title: ((_h = root.GN) === null || _h === void 0 ? void 0 : _h[0]) || pair || fallback, date: ((_j = root.DT) === null || _j === void 0 ? void 0 : _j[0]) || '', players: pair };
    }
    function parse(text, fallback) { return parseTrees(text).map(function (t) { return fromTree(t, fallback); }); }
    function compile(g) {
        var e_9, _a;
        var b = g.initial.slice(), nums = Array(g.n * g.n).fill(0), prev = null;
        var boards = [b], numbers = [nums];
        for (var i = 0; i < g.moves.length; i++) {
            var m = g.moves[i];
            if (m.c !== 1 && m.c !== 2)
                throw Error('棋子颜色无效');
            var next = void 0;
            try {
                next = play(b, m.p, m.c, g.n, prev);
            }
            catch (e) {
                throw Error('主线第 ' + (i + 1) + ' 手：' + e.message);
            }
            nums = nums.slice();
            try {
                for (var _b = (e_9 = void 0, __values(next.captured)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var p = _c.value;
                    nums[p] = 0;
                }
            }
            catch (e_9_1) { e_9 = { error: e_9_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_9) throw e_9.error; }
            }
            if (m.p >= 0)
                nums[m.p] = i + 1;
            prev = b;
            b = next.board;
            boards.push(b);
            numbers.push(nums);
        }
        return __assign(__assign({}, g), { boards: boards, numbers: numbers });
    }
    function rotate(g, k) {
        var n = g.n, point = function (p) {
            var _a;
            if (p < 0)
                return p;
            var x = p % n, y = Math.floor(p / n);
            for (var i = 0; i < k; i++)
                _a = __read([n - 1 - y, x], 2), x = _a[0], y = _a[1];
            return y * n + x;
        };
        var initial = Array(n * n).fill(0);
        g.initial.forEach(function (c, p) { initial[point(p)] = c; });
        return __assign(__assign({}, g), { initial: initial, moves: g.moves.map(function (m) { return ({ c: m.c, p: point(m.p) }); }) });
    }
    function seed(n, ab, aw, seq, first) {
        var e_10, _a, e_11, _b;
        if (first === void 0) { first = 1; }
        var initial = Array(n * n).fill(0);
        try {
            for (var _c = __values((ab || '').split(/\s+/).filter(Boolean)), _d = _c.next(); !_d.done; _d = _c.next()) {
                var s = _d.value;
                initial[coord(s, n)] = 1;
            }
        }
        catch (e_10_1) { e_10 = { error: e_10_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_10) throw e_10.error; }
        }
        try {
            for (var _e = __values((aw || '').split(/\s+/).filter(Boolean)), _f = _e.next(); !_f.done; _f = _e.next()) {
                var s = _f.value;
                initial[coord(s, n)] = 2;
            }
        }
        catch (e_11_1) { e_11 = { error: e_11_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
            }
            finally { if (e_11) throw e_11.error; }
        }
        return { n: n, initial: initial, moves: seq.split(/\s+/).filter(Boolean).map(function (s, i) { return ({ c: i % 2 ? 3 - first : first, p: coord(s === '--' ? '' : s, n) }); }) };
    }
    function toSGF(g) { var a = [], w = []; g.initial.forEach(function (c, p) { if (c === 1)
        a.push(sgfPoint(p, g.n)); if (c === 2)
        w.push(sgfPoint(p, g.n)); }); return '(;GM[1]FF[4]CA[UTF-8]SZ[' + g.n + ']' + (a.length ? 'AB[' + a.join('][') + ']' : '') + (w.length ? 'AW[' + w.join('][') + ']' : '') + g.moves.map(function (m) { return ';' + (m.c === 1 ? 'B' : 'W') + '[' + sgfPoint(m.p, g.n) + ']'; }).join('') + ')'; }
    function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++)
        h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); }
    return { coord: coord, sgfPoint: sgfPoint, neighbors: neighbors, group: group, play: play, parseTrees: parseTrees, mainline: mainline, parse: parse, compile: compile, rotate: rotate, seed: seed, toSGF: toSGF, hash: hash };
})();
if (typeof module !== 'undefined')
    module.exports = GoEngine;
