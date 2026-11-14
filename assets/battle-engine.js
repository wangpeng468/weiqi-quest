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
/* Local Go rules and child-oriented tactical opponent. MIT.
 * No network, external engine, neural model or claimed rank.
 * Positional superko; no suicide; pass always legal; area = stones + surrounded empties.
 * Automatic scoring uses pass-alive regions and bounded local capture reading.
 * Unresolved groups are kept on the board and the result is explicitly provisional.
 */
(function (root) {
    'use strict';
    var neighbours = {};
    function adjacent(n) { if (neighbours[n])
        return neighbours[n]; var a = []; for (var p = 0; p < n * n; p++) {
        var x = p % n, y = Math.floor(p / n), v = [];
        if (x)
            v.push(p - 1);
        if (x < n - 1)
            v.push(p + 1);
        if (y)
            v.push(p - n);
        if (y < n - 1)
            v.push(p + n);
        a.push(v);
    } return neighbours[n] = a; }
    function key(b) { return b.join(''); }
    function group(b, p, n) {
        var e_1, _a;
        if (!b[p])
            return { stones: [], libs: [] };
        var ns = adjacent(n), colour = b[p], seen = {}, lib = {}, todo = [p], stones = [];
        seen[p] = 1;
        while (todo.length) {
            var q = todo.pop();
            stones.push(q);
            try {
                for (var _b = (e_1 = void 0, __values(ns[q])), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var v = _c.value;
                    if (!b[v])
                        lib[v] = 1;
                    else if (b[v] === colour && !seen[v]) {
                        seen[v] = 1;
                        todo.push(v);
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
        return { stones: stones, libs: Object.keys(lib).map(Number) };
    }
    function analyse(b, n) {
        var e_2, _a;
        var groups = [], at = new Array(b.length).fill(-1);
        for (var p = 0; p < b.length; p++)
            if (b[p] && at[p] < 0) {
                var g = group(b, p, n);
                g.c = b[p];
                try {
                    for (var _b = (e_2 = void 0, __values(g.stones)), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var q = _c.value;
                        at[q] = groups.length;
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
                groups.push(g);
            }
        return { groups: groups, at: at };
    }
    function tryMove(b, n, p, c, seen) {
        var e_3, _a, e_4, _b;
        if (!Number.isInteger(p) || p < 0 || p >= b.length)
            return { ok: false, reason: 'outside' };
        if (b[p])
            return { ok: false, reason: 'occupied' };
        var out = b.slice(), ns = adjacent(n);
        out[p] = c;
        var captured = [];
        try {
            for (var _c = __values(ns[p]), _d = _c.next(); !_d.done; _d = _c.next()) {
                var q = _d.value;
                if (out[q] === 3 - c) {
                    var g = group(out, q, n);
                    if (!g.libs.length) {
                        try {
                            for (var _e = (e_4 = void 0, __values(g.stones)), _f = _e.next(); !_f.done; _f = _e.next()) {
                                var k = _f.value;
                                out[k] = 0;
                            }
                        }
                        catch (e_4_1) { e_4 = { error: e_4_1 }; }
                        finally {
                            try {
                                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                            }
                            finally { if (e_4) throw e_4.error; }
                        }
                        captured = captured.concat(g.stones);
                    }
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_3) throw e_3.error; }
        }
        var own = group(out, p, n);
        if (!own.libs.length)
            return { ok: false, reason: 'suicide' };
        var hash = key(out);
        if (seen && seen[hash])
            return { ok: false, reason: 'ko' };
        return { ok: true, board: out, captured: captured, own: own, hash: hash };
    }
    function create(n) {
        if (n === void 0) { n = 9; }
        if ([9, 13, 19].indexOf(n) < 0)
            throw Error('棋盘大小不支持');
        var b = new Array(n * n).fill(0);
        return { n: n, board: b, turn: 1, passes: 0, captures: [0, 0, 0], moves: [], hashes: [key(b)] };
    }
    function play(s, p) {
        var e_5, _a;
        if (p === -1) {
            s.moves.push({ p: -1, c: s.turn, captured: 0 });
            s.turn = 3 - s.turn;
            s.passes++;
            s.hashes.push(key(s.board));
            return { ok: true, passed: true, captured: [] };
        }
        var seen = {};
        try {
            for (var _b = __values(s.hashes), _c = _b.next(); !_c.done; _c = _b.next()) {
                var h = _c.value;
                seen[h] = true;
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_5) throw e_5.error; }
        }
        var r = tryMove(s.board, s.n, p, s.turn, seen);
        if (!r.ok)
            return r;
        s.captures[s.turn] += r.captured.length;
        s.moves.push({ p: p, c: s.turn, captured: r.captured.length });
        s.board = r.board;
        s.turn = 3 - s.turn;
        s.passes = 0;
        s.hashes.push(r.hash);
        return r;
    }
    function rebuild(n, moves) {
        var e_6, _a;
        var s = create(n);
        try {
            for (var moves_1 = __values(moves), moves_1_1 = moves_1.next(); !moves_1_1.done; moves_1_1 = moves_1.next()) {
                var m = moves_1_1.value;
                if (!m || m.c !== s.turn || !Number.isInteger(m.p) || !play(s, m.p).ok)
                    throw Error('对局记录包含无效落子');
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (moves_1_1 && !moves_1_1.done && (_a = moves_1.return)) _a.call(moves_1);
            }
            finally { if (e_6) throw e_6.error; }
        }
        return s;
    }
    function undo(s, human) { if (!s.moves.length)
        return s; var len = s.moves.length - 1; while (len > 0 && s.moves[len].c !== human)
        len--; if (s.moves[len].c !== human)
        return s; return rebuild(s.n, s.moves.slice(0, len)); }
    function area(b, n, dead) {
        var e_7, _a, e_8, _b, e_9, _c;
        if (dead === void 0) { dead = []; }
        var board = b.slice();
        try {
            for (var dead_1 = __values(dead), dead_1_1 = dead_1.next(); !dead_1_1.done; dead_1_1 = dead_1.next()) {
                var p = dead_1_1.value;
                if (Number.isInteger(p) && p >= 0 && p < board.length)
                    board[p] = 0;
            }
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (dead_1_1 && !dead_1_1.done && (_a = dead_1.return)) _a.call(dead_1);
            }
            finally { if (e_7) throw e_7.error; }
        }
        var ns = adjacent(n), seen = {}, owner = new Array(board.length).fill(0), score = [0, 0, 0];
        for (var p = 0; p < board.length; p++) {
            if (board[p]) {
                score[board[p]]++;
                owner[p] = board[p];
                continue;
            }
            if (seen[p])
                continue;
            var todo = [p], region = [], touch = {};
            seen[p] = 1;
            while (todo.length) {
                var q = todo.pop();
                region.push(q);
                try {
                    for (var _d = (e_8 = void 0, __values(ns[q])), _e = _d.next(); !_e.done; _e = _d.next()) {
                        var v = _e.value;
                        if (board[v])
                            touch[board[v]] = true;
                        else if (!seen[v]) {
                            seen[v] = 1;
                            todo.push(v);
                        }
                    }
                }
                catch (e_8_1) { e_8 = { error: e_8_1 }; }
                finally {
                    try {
                        if (_e && !_e.done && (_b = _d.return)) _b.call(_d);
                    }
                    finally { if (e_8) throw e_8.error; }
                }
            }
            var col = touch[1] && !touch[2] ? 1 : touch[2] && !touch[1] ? 2 : 0;
            score[col] += region.length;
            try {
                for (var region_1 = (e_9 = void 0, __values(region)), region_1_1 = region_1.next(); !region_1_1.done; region_1_1 = region_1.next()) {
                    var q = region_1_1.value;
                    owner[q] = col;
                }
            }
            catch (e_9_1) { e_9 = { error: e_9_1 }; }
            finally {
                try {
                    if (region_1_1 && !region_1_1.done && (_c = region_1.return)) _c.call(region_1);
                }
                finally { if (e_9) throw e_9.error; }
            }
        }
        return { black: score[1], white: score[2], neutral: score[0], owner: owner, board: board };
    }
    function eye(b, n, p, c) {
        var e_10, _a, e_11, _b;
        var ns = adjacent(n)[p];
        if (!ns.length || ns.some(function (q) { return b[q] !== c; }))
            return false;
        var bad = 0, off = 0;
        var x = p % n, y = Math.floor(p / n);
        try {
            for (var _c = __values([-1, 1]), _d = _c.next(); !_d.done; _d = _c.next()) {
                var dx = _d.value;
                try {
                    for (var _e = (e_11 = void 0, __values([-1, 1])), _f = _e.next(); !_f.done; _f = _e.next()) {
                        var dy = _f.value;
                        var xx = x + dx, yy = y + dy;
                        if (xx < 0 || yy < 0 || xx >= n || yy >= n)
                            off++;
                        else if (b[yy * n + xx] === 3 - c)
                            bad++;
                    }
                }
                catch (e_11_1) { e_11 = { error: e_11_1 }; }
                finally {
                    try {
                        if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                    }
                    finally { if (e_11) throw e_11.error; }
                }
            }
        }
        catch (e_10_1) { e_10 = { error: e_10_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_10) throw e_10.error; }
        }
        return off ? bad === 0 : bad <= 1;
    }
    function staticValue(b, n, c) {
        var e_12, _a;
        var a = analyse(b, n);
        var value = 0;
        try {
            for (var _b = __values(a.groups), _c = _b.next(); !_c.done; _c = _b.next()) {
                var g = _c.value;
                var sign = g.c === c ? 1 : -1;
                value += sign * (g.stones.length * 3 + (g.libs.length === 1 ? -g.stones.length * 13 - 7 : g.libs.length === 2 ? -g.stones.length * 2 : Math.min(g.libs.length, 8) * .3));
            }
        }
        catch (e_12_1) { e_12 = { error: e_12_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_12) throw e_12.error; }
        }
        return value;
    }
    function candidates(s, level, limit) {
        var e_13, _a, e_14, _b, e_15, _c;
        var b = s.board, n = s.n, c = s.turn, opp = 3 - c, ns = adjacent(n), info = analyse(b, n), seen = {};
        try {
            for (var _d = __values(s.hashes), _e = _d.next(); !_e.done; _e = _d.next()) {
                var h = _e.value;
                seen[h] = true;
            }
        }
        catch (e_13_1) { e_13 = { error: e_13_1 }; }
        finally {
            try {
                if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
            }
            finally { if (e_13) throw e_13.error; }
        }
        var list = [], step = s.moves.length, stoneCount = b.reduce(function (a, v) { return a + (v ? 1 : 0); }, 0);
        for (var p = 0; p < b.length; p++) {
            if (b[p])
                continue;
            var move = tryMove(b, n, p, c, seen);
            if (!move.ok)
                continue;
            var ownEye = eye(b, n, p, c);
            var val = move.captured.length * 24, save = 0, threat = 0, friend = 0, enemy = 0, unique = {};
            try {
                for (var _f = (e_14 = void 0, __values(ns[p])), _g = _f.next(); !_g.done; _g = _f.next()) {
                    var q = _g.value;
                    if (b[q] === c)
                        friend++;
                    else if (b[q] === opp)
                        enemy++;
                    var gi = info.at[q];
                    if (gi < 0 || unique[gi])
                        continue;
                    unique[gi] = 1;
                    var g = info.groups[gi];
                    if (g.c === c && g.libs.length === 1 && move.own.libs.length > 1)
                        save += g.stones.length * 22 + 8;
                    if (g.c === opp && g.libs.length === 2)
                        threat += Math.min(g.stones.length, 5) * 4 + 6;
                }
            }
            catch (e_14_1) { e_14 = { error: e_14_1 }; }
            finally {
                try {
                    if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                }
                finally { if (e_14) throw e_14.error; }
            }
            val += save + threat;
            if (move.own.libs.length === 1 && !move.captured.length)
                val -= 40 + move.own.stones.length * 14;
            if (ownEye && !move.captured.length)
                val -= 70;
            var x = p % n, y = Math.floor(p / n), edge = Math.min(x, y, n - 1 - x, n - 1 - y), desired = n === 9 ? 2 : 3;
            var nearF = 99, nearE = 99;
            for (var q = 0; q < b.length; q++)
                if (b[q]) {
                    var d = Math.abs(x - q % n) + Math.abs(y - Math.floor(q / n));
                    if (b[q] === c)
                        nearF = Math.min(nearF, d);
                    else
                        nearE = Math.min(nearE, d);
                }
            // Open with corners, extend with space; gradually fill neutral points, not own eyes.
            if (stoneCount < n * 2) {
                val += Math.max(0, 4 - Math.abs(edge - desired)) * 1.5;
                var corners = [[desired, desired], [n - 1 - desired, desired], [desired, n - 1 - desired], [n - 1 - desired, n - 1 - desired]];
                var corner = 99;
                try {
                    for (var corners_1 = (e_15 = void 0, __values(corners)), corners_1_1 = corners_1.next(); !corners_1_1.done; corners_1_1 = corners_1.next()) {
                        var pt = corners_1_1.value;
                        corner = Math.min(corner, Math.abs(x - pt[0]) + Math.abs(y - pt[1]));
                    }
                }
                catch (e_15_1) { e_15 = { error: e_15_1 }; }
                finally {
                    try {
                        if (corners_1_1 && !corners_1_1.done && (_c = corners_1.return)) _c.call(corners_1);
                    }
                    finally { if (e_15) throw e_15.error; }
                }
                val += Math.max(0, 4 - corner) * 1.5;
                if (nearF >= 3 && nearF <= 5)
                    val += 3;
                if (nearF <= 1)
                    val -= 3;
                if (edge === 0)
                    val -= 7;
                if (enemy && !move.captured.length)
                    val -= 2;
            }
            else {
                if (nearF <= 3 && nearE <= 4)
                    val += 3;
                if (nearE === 1)
                    val += 1;
                if (nearF === 1 && nearE > 4)
                    val -= 5;
                if (edge === 0 && nearE > 2)
                    val -= 3;
            }
            if (friend >= 2 && enemy === 0 && !save)
                val -= friend * 1.7;
            val += Math.min(move.own.libs.length, 5) * .5;
            list.push({ p: p, val: val, move: move, ownEye: ownEye, save: save, threat: threat });
        }
        list.sort(function (a, b) { return b.val - a.val || a.p - b.p; });
        return limit ? list.slice(0, limit) : list;
    }
    function choose(s, difficulty, random) {
        var e_16, _a;
        if (difficulty === void 0) { difficulty = 1; }
        if (random === void 0) { random = Math.random; }
        var list = candidates(s, difficulty, 0);
        if (!list.length)
            return -1;
        var useful = list.filter(function (v) { return !v.ownEye && (v.move.own.libs.length > 1 || v.move.captured.length); });
        if (!useful.length)
            return -1;
        // Answer a human pass with a pass once there is no tactical urgency and little disputed area.
        if (s.passes) {
            var a = area(s.board, s.n);
            var danger = useful[0].save > 0 || useful[0].move.captured.length > 0 || useful[0].threat >= 14;
            if (!danger && (a.neutral <= Math.max(4, s.n) || s.moves.length >= s.n * s.n * 1.3))
                return -1;
        }
        if (difficulty === 0) {
            var urgent = useful.filter(function (v) { return v.move.captured.length > 0 || v.save > 0; });
            var pool = urgent.length && random() < .7 ? urgent : useful.slice(0, Math.min(16, useful.length));
            return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))].p;
        }
        if (difficulty === 1) {
            var best_1 = useful[0].val, near = useful.filter(function (v) { return v.val >= best_1 - 2; }).slice(0, 5);
            return near[Math.min(near.length - 1, Math.floor(random() * near.length))].p;
        }
        // Challenge level checks the strongest few local opponent replies (bounded two-ply search).
        var base = staticValue(s.board, s.n, s.turn), top = useful.slice(0, 7);
        try {
            for (var top_1 = __values(top), top_1_1 = top_1.next(); !top_1_1.done; top_1_1 = top_1.next()) {
                var candidate = top_1_1.value;
                var after = { n: s.n, board: candidate.move.board, turn: 3 - s.turn, moves: s.moves.concat([{ p: candidate.p, c: s.turn }]), hashes: s.hashes.concat([candidate.move.hash]), passes: 0 };
                var replies = candidates(after, 1, 4);
                var worst = staticValue(after.board, s.n, s.turn);
                if (replies.length)
                    worst = Math.min.apply(Math, __spreadArray([], __read(replies.map(function (r) { return staticValue(r.move.board, s.n, s.turn); })), false));
                candidate.search = candidate.val * .6 + (worst - base) * 1.5 + random() * .4;
            }
        }
        catch (e_16_1) { e_16 = { error: e_16_1 }; }
        finally {
            try {
                if (top_1_1 && !top_1_1.done && (_a = top_1.return)) _a.call(top_1);
            }
            finally { if (e_16) throw e_16.error; }
        }
        top.sort(function (a, b) { return b.search - a.search; });
        return top[0].p;
    }
    // Conservative pass-alive analysis: a chain needs two vital empty regions;
    // removing an unsafe chain also removes regions that depend on its boundary.
    // This deliberately does NOT label "not proven alive" as "dead".
    function passAlive(board, n) {
        var e_17, _a, e_18, _b;
        var info = analyse(board, n), ns = adjacent(n), regions = [], visited = {}, alive = {};
        for (var p = 0; p < board.length; p++)
            if (!board[p] && !visited[p]) {
                var todo = [p], points = [], boundary = {}, colours = {};
                visited[p] = 1;
                while (todo.length) {
                    var q = todo.pop();
                    points.push(q);
                    try {
                        for (var _c = (e_17 = void 0, __values(ns[q])), _d = _c.next(); !_d.done; _d = _c.next()) {
                            var v = _d.value;
                            if (board[v]) {
                                boundary[info.at[v]] = true;
                                colours[board[v]] = true;
                            }
                            else if (!visited[v]) {
                                visited[v] = 1;
                                todo.push(v);
                            }
                        }
                    }
                    catch (e_17_1) { e_17 = { error: e_17_1 }; }
                    finally {
                        try {
                            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                        }
                        finally { if (e_17) throw e_17.error; }
                    }
                }
                var colour = colours[1] && !colours[2] ? 1 : colours[2] && !colours[1] ? 2 : 0;
                if (colour)
                    regions.push({ points: points, boundary: Object.keys(boundary).map(Number), colour: colour });
            }
        var _loop_1 = function (c) {
            var e_19, _g, e_20, _h;
            var blocks = {};
            info.groups.forEach(function (g, i) { if (g.c === c)
                blocks[i] = true; });
            var rs = regions.filter(function (r) { return r.colour === c; }).map(function (r) { return ({ boundary: r.boundary, vital: r.boundary.filter(function (i) { return r.points.every(function (p) { return info.groups[i].libs.indexOf(p) >= 0; }); }) }); });
            var changed = true;
            var _loop_2 = function () {
                var e_21, _o;
                changed = false;
                var valid = rs.filter(function (r) { return r.boundary.every(function (i) { return blocks[i]; }); });
                var remove = Object.keys(blocks).map(Number).filter(function (i) { return valid.filter(function (r) { return r.vital.indexOf(i) >= 0; }).length < 2; });
                try {
                    for (var remove_1 = (e_21 = void 0, __values(remove)), remove_1_1 = remove_1.next(); !remove_1_1.done; remove_1_1 = remove_1.next()) {
                        var i = remove_1_1.value;
                        delete blocks[i];
                        changed = true;
                    }
                }
                catch (e_21_1) { e_21 = { error: e_21_1 }; }
                finally {
                    try {
                        if (remove_1_1 && !remove_1_1.done && (_o = remove_1.return)) _o.call(remove_1);
                    }
                    finally { if (e_21) throw e_21.error; }
                }
            };
            while (changed) {
                _loop_2();
            }
            try {
                for (var _j = (e_19 = void 0, __values(Object.keys(blocks))), _k = _j.next(); !_k.done; _k = _j.next()) {
                    var i = _k.value;
                    try {
                        for (var _l = (e_20 = void 0, __values(info.groups[i].stones)), _m = _l.next(); !_m.done; _m = _l.next()) {
                            var p = _m.value;
                            alive[p] = c;
                        }
                    }
                    catch (e_20_1) { e_20 = { error: e_20_1 }; }
                    finally {
                        try {
                            if (_m && !_m.done && (_h = _l.return)) _h.call(_l);
                        }
                        finally { if (e_20) throw e_20.error; }
                    }
                }
            }
            catch (e_19_1) { e_19 = { error: e_19_1 }; }
            finally {
                try {
                    if (_k && !_k.done && (_g = _j.return)) _g.call(_j);
                }
                finally { if (e_19) throw e_19.error; }
            }
        };
        try {
            for (var _e = __values([1, 2]), _f = _e.next(); !_f.done; _f = _e.next()) {
                var c = _f.value;
                _loop_1(c);
            }
        }
        catch (e_18_1) { e_18 = { error: e_18_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
            }
            finally { if (e_18) throw e_18.error; }
        }
        return { alive: alive, info: info };
    }
    // Only read small regions whose entire external stone boundary is pass-alive
    // enemy stones. Defender moves first and every legal local defence must fail.
    // Ko, depth/time limits, and large/open regions never become a dead-stone claim.
    function localCapture(board, n, anchor, zone, hashes, budget) {
        var e_22, _a;
        var defender = board[anchor], attacker = 3 - defender, initial = {}, ns = adjacent(n);
        try {
            for (var _b = __values(hashes || []), _c = _b.next(); !_c.done; _c = _b.next()) {
                var h = _c.value;
                initial[h] = true;
            }
        }
        catch (e_22_1) { e_22 = { error: e_22_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_22) throw e_22.error; }
        }
        initial[key(board)] = true;
        function solve(b, turn, depth, seen, previousPass) {
            var e_23, _a, e_24, _b, e_25, _c;
            if (!b[anchor])
                return 1;
            if (--budget.nodes < 0 || Date.now() > budget.end || depth <= 0)
                return 0;
            var chain = group(b, anchor, n);
            if (chain.libs.some(function (p) { return zone.indexOf(p) < 0; }))
                return 0;
            var options = [];
            var ko = false;
            try {
                for (var zone_1 = __values(zone), zone_1_1 = zone_1.next(); !zone_1_1.done; zone_1_1 = zone_1.next()) {
                    var p = zone_1_1.value;
                    if (!b[p]) {
                        var r = tryMove(b, n, p, turn, seen);
                        if (r.ok)
                            options.push({ p: p, r: r });
                        else if (r.reason === 'ko')
                            ko = true;
                    }
                }
            }
            catch (e_23_1) { e_23 = { error: e_23_1 }; }
            finally {
                try {
                    if (zone_1_1 && !zone_1_1.done && (_a = zone_1.return)) _a.call(zone_1);
                }
                finally { if (e_23) throw e_23.error; }
            }
            if (ko)
                return 0; // A ko threat outside this local region may change the result.
            options.sort(function (a, b) { return b.r.captured.length - a.r.captured.length || (chain.libs.indexOf(a.p) >= 0 ? -1 : 1) - (chain.libs.indexOf(b.p) >= 0 ? -1 : 1); });
            function child(o) { var path = Object.assign({}, seen); path[o.r.hash] = true; return solve(o.r.board, 3 - turn, depth - 1, path, false); }
            if (turn === attacker) {
                try {
                    for (var options_1 = __values(options), options_1_1 = options_1.next(); !options_1_1.done; options_1_1 = options_1.next()) {
                        var o = options_1_1.value;
                        if (child(o) === 1)
                            return 1;
                    }
                }
                catch (e_24_1) { e_24 = { error: e_24_1 }; }
                finally {
                    try {
                        if (options_1_1 && !options_1_1.done && (_b = options_1.return)) _b.call(options_1);
                    }
                    finally { if (e_24) throw e_24.error; }
                }
                return 0; // Passing cannot establish a forced capture in this conservative reader.
            }
            // Defender may also pass; an empty set of stone moves is not proof of death.
            if (previousPass || solve(b, attacker, depth - 1, seen, true) !== 1)
                return 0;
            try {
                for (var options_2 = __values(options), options_2_1 = options_2.next(); !options_2_1.done; options_2_1 = options_2.next()) {
                    var o = options_2_1.value;
                    if (child(o) !== 1)
                        return 0;
                }
            }
            catch (e_25_1) { e_25 = { error: e_25_1 }; }
            finally {
                try {
                    if (options_2_1 && !options_2_1.done && (_c = options_2.return)) _c.call(options_2);
                }
                finally { if (e_25) throw e_25.error; }
            }
            return 1;
        }
        return solve(board, defender, Math.min(22, zone.length * 2 + 6), initial, false) === 1;
    }
    function autoScore(state, options) {
        var e_26, _a, e_27, _b, e_28, _c, e_29, _d, e_30, _e, e_31, _f, e_32, _g;
        if (options === void 0) { options = {}; }
        var n = state.n, original = state.board, ns = adjacent(n), dead = [], notes = [];
        var life = passAlive(original, n), visited = {}, regions = [];
        var budget = { nodes: Math.max(0, Math.min(8000, Number(options.nodes) || 2800)), end: Date.now() + Math.max(10, Math.min(1000, Number(options.timeMs) || 300)) };
        for (var p = 0; p < original.length; p++)
            if (!life.alive[p] && !visited[p]) {
                var todo = [p], points = [], boundary = {};
                visited[p] = 1;
                while (todo.length) {
                    var q = todo.pop();
                    points.push(q);
                    try {
                        for (var _h = (e_26 = void 0, __values(ns[q])), _j = _h.next(); !_j.done; _j = _h.next()) {
                            var v = _j.value;
                            if (life.alive[v])
                                boundary[life.alive[v]] = true;
                            else if (!visited[v]) {
                                visited[v] = 1;
                                todo.push(v);
                            }
                        }
                    }
                    catch (e_26_1) { e_26 = { error: e_26_1 }; }
                    finally {
                        try {
                            if (_j && !_j.done && (_a = _h.return)) _a.call(_h);
                        }
                        finally { if (e_26) throw e_26.error; }
                    }
                }
                regions.push({ points: points, boundary: boundary });
            }
        try {
            for (var regions_1 = __values(regions), regions_1_1 = regions_1.next(); !regions_1_1.done; regions_1_1 = regions_1.next()) {
                var region = regions_1_1.value;
                var attacker = region.boundary[1] && !region.boundary[2] ? 1 : region.boundary[2] && !region.boundary[1] ? 2 : 0;
                if (!attacker || region.points.length > 18)
                    continue;
                var targets = {};
                try {
                    for (var _k = (e_28 = void 0, __values(region.points)), _l = _k.next(); !_l.done; _l = _k.next()) {
                        var p = _l.value;
                        if (original[p] === 3 - attacker)
                            targets[life.info.at[p]] = true;
                    }
                }
                catch (e_28_1) { e_28 = { error: e_28_1 }; }
                finally {
                    try {
                        if (_l && !_l.done && (_c = _k.return)) _c.call(_k);
                    }
                    finally { if (e_28) throw e_28.error; }
                }
                try {
                    for (var _m = (e_29 = void 0, __values(Object.keys(targets))), _o = _m.next(); !_o.done; _o = _m.next()) {
                        var gi = _o.value;
                        var g = life.info.groups[gi];
                        if (localCapture(original, n, g.stones[0], region.points, state.hashes, budget))
                            try {
                                for (var _p = (e_30 = void 0, __values(g.stones)), _q = _p.next(); !_q.done; _q = _p.next()) {
                                    var p = _q.value;
                                    dead.push(p);
                                }
                            }
                            catch (e_30_1) { e_30 = { error: e_30_1 }; }
                            finally {
                                try {
                                    if (_q && !_q.done && (_e = _p.return)) _e.call(_p);
                                }
                                finally { if (e_30) throw e_30.error; }
                            }
                    }
                }
                catch (e_29_1) { e_29 = { error: e_29_1 }; }
                finally {
                    try {
                        if (_o && !_o.done && (_d = _m.return)) _d.call(_m);
                    }
                    finally { if (e_29) throw e_29.error; }
                }
            }
        }
        catch (e_27_1) { e_27 = { error: e_27_1 }; }
        finally {
            try {
                if (regions_1_1 && !regions_1_1.done && (_b = regions_1.return)) _b.call(regions_1);
            }
            finally { if (e_27) throw e_27.error; }
        }
        var after = original.slice();
        try {
            for (var dead_2 = __values(dead), dead_2_1 = dead_2.next(); !dead_2_1.done; dead_2_1 = dead_2.next()) {
                var p = dead_2_1.value;
                after[p] = 0;
            }
        }
        catch (e_31_1) { e_31 = { error: e_31_1 }; }
        finally {
            try {
                if (dead_2_1 && !dead_2_1.done && (_f = dead_2.return)) _f.call(dead_2);
            }
            finally { if (e_31) throw e_31.error; }
        }
        var finalLife = passAlive(after, n), unsettled = [];
        try {
            for (var _r = __values(finalLife.info.groups), _s = _r.next(); !_s.done; _s = _r.next()) {
                var g = _s.value;
                if (!finalLife.alive[g.stones[0]])
                    unsettled.push(g.stones.slice());
            }
        }
        catch (e_32_1) { e_32 = { error: e_32_1 }; }
        finally {
            try {
                if (_s && !_s.done && (_g = _r.return)) _g.call(_r);
            }
            finally { if (e_32) throw e_32.error; }
        }
        var a = area(original, n, dead), komi = 7.5, difference = a.black - (a.white + komi), winner = difference > 0 ? 1 : difference < 0 ? 2 : 0;
        var early = (state.moves || []).filter(function (m) { return m.p >= 0; }).length < Math.floor(n * n * .25);
        if (unsettled.length)
            notes.push('有 ' + unsettled.length + ' 块棋的死活未确定，暂时留在盘上计分。');
        if (a.neutral)
            notes.push('双方交界的 ' + a.neutral + ' 个空点不计入任何一方。');
        if (early)
            notes.push('落子较少或提前结束，只能作为练习估算。');
        return { black: a.black, white: a.white, neutral: a.neutral, komi: komi, winner: winner, margin: Math.abs(difference), reason: 'score', method: 'auto', provisional: unsettled.length > 0 || early, unsettledGroups: unsettled.length, uncertain: unsettled.reduce(function (all, g) { return all.concat(g); }, []), dead: dead.slice(), autoDead: dead.length, early: early, notes: notes, algorithm: 'conservative-area-v1' };
    }
    function restore(raw) {
        if (!raw || raw.version !== 1 || [9, 13, 19].indexOf(raw.n) < 0 || [1, 2].indexOf(raw.human) < 0 || !Array.isArray(raw.moves) || raw.moves.length > 3000)
            return null;
        try {
            var game_1 = rebuild(raw.n, raw.moves);
            if (raw.phase === 'playing')
                game_1.passes = Math.min(2, Math.max(0, Number(raw.passes) || 0));
            return { game: game_1, human: raw.human, difficulty: [0, 1, 2].indexOf(raw.difficulty) >= 0 ? raw.difficulty : 1, phase: ['playing', 'scoring', 'finished', 'judging'].indexOf(raw.phase) >= 0 ? raw.phase : 'playing', dead: Array.isArray(raw.dead) ? raw.dead.filter(function (p) { return Number.isInteger(p) && p >= 0 && p < game_1.board.length && game_1.board[p]; }) : [], result: raw.result && typeof raw.result === 'object' ? raw.result : null, id: typeof raw.id === 'string' ? raw.id.slice(0, 80) : 'game-' + Date.now(), updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '' };
        }
        catch (e) {
            return null;
        }
    }
    var api = { adjacent: adjacent, key: key, group: group, analyse: analyse, tryMove: tryMove, create: create, play: play, rebuild: rebuild, undo: undo, area: area, eye: eye, candidates: candidates, choose: choose, restore: restore, passAlive: passAlive, localCapture: localCapture, autoScore: autoScore };
    root.BattleEngine = api;
    if (typeof module !== 'undefined' && module.exports)
        module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
