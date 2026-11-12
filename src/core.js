"use strict";
/*
 * Lumen Run: game logic only (no DOM, no drawing, no audio).
 * Everything here is deterministic for a given seed, so it can be tested with node.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LumenCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  // Directions: 0 up, 1 right, 2 down, 3 left. A wall bit means "there is a wall on that side".
  var DX = [0, 1, 0, -1];
  var DY = [-1, 0, 1, 0];
  var BIT = [1, 2, 4, 8];

  var PLAYER_TIME = 0.22; // seconds per cell
  var DASH_TIME = 0.065;
  var DASH_CELLS = 3;
  var DASH_COOLDOWN = 1.5;
  var START_LIVES = 5;
  var MAX_LIVES = 8;
  var INVULN_AFTER_CATCH = 3.0;
  var CATCH_DISTANCE = 0.5;
  var RANGE = { chaser: 5, ambusher: 4, wanderer: 3 };
  var KINDS = ["chaser", "ambusher", "wanderer", "chaser"];

  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function inBounds(m, x, y) {
    return x >= 0 && y >= 0 && x < m.w && y < m.h;
  }

  function canMove(m, x, y, d) {
    if (d < 0 || !inBounds(m, x, y)) return false;
    if (m.walls[y * m.w + x] & BIT[d]) return false;
    return inBounds(m, x + DX[d], y + DY[d]);
  }

  // Recursive backtracker, then knock out some extra walls so there are loops (no dead-end-only maze).
  function makeMaze(w, h, rng, braid) {
    var walls = new Uint8Array(w * h).fill(15);
    var seen = new Uint8Array(w * h);
    var stack = [0];
    seen[0] = 1;
    while (stack.length) {
      var c = stack[stack.length - 1];
      var cx = c % w;
      var cy = (c / w) | 0;
      var opts = [];
      for (var d = 0; d < 4; d++) {
        var nx = cx + DX[d];
        var ny = cy + DY[d];
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && !seen[ny * w + nx]) opts.push(d);
      }
      if (!opts.length) {
        stack.pop();
        continue;
      }
      var pick = opts[(rng() * opts.length) | 0];
      var n = (cy + DY[pick]) * w + cx + DX[pick];
      walls[c] &= ~BIT[pick];
      walls[n] &= ~BIT[(pick + 2) % 4];
      seen[n] = 1;
      stack.push(n);
    }
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        for (var k = 1; k <= 2; k++) {
          // right and down only, so each wall is considered once
          var ax = x + DX[k];
          var ay = y + DY[k];
          if (ax >= w || ay >= h) continue;
          if (walls[y * w + x] & BIT[k] && rng() < braid) {
            walls[y * w + x] &= ~BIT[k];
            walls[ay * w + ax] &= ~BIT[(k + 2) % 4];
          }
        }
      }
    }
    return { w: w, h: h, walls: walls };
  }

  // Number of steps from (tx, ty) to every cell; -1 where unreachable.
  function distanceField(m, tx, ty) {
    var dist = new Int16Array(m.w * m.h).fill(-1);
    var queue = [ty * m.w + tx];
    dist[queue[0]] = 0;
    for (var head = 0; head < queue.length; head++) {
      var c = queue[head];
      var cx = c % m.w;
      var cy = (c / m.w) | 0;
      for (var d = 0; d < 4; d++) {
        if (!canMove(m, cx, cy, d)) continue;
        var n = (cy + DY[d]) * m.w + cx + DX[d];
        if (dist[n] < 0) {
          dist[n] = dist[c] + 1;
          queue.push(n);
        }
      }
    }
    return dist;
  }

  // Difficulty rises for the first ~15 floors and then plateaus, so a steady player can go very deep.
  function levelParams(level) {
    var l = Math.max(1, level | 0);
    return {
      w: Math.min(16, 8 + Math.ceil(l / 2)),
      h: Math.min(11, 6 + Math.ceil(l / 3)),
      hunters: Math.min(2, 1 + (l >> 3)),
      shards: Math.min(6, 2 + (l >> 1)),
      hunterTime: Math.max(0.6, 0.8 - 0.015 * (l - 1)),
      par: 25 + Math.min(l, 15) * 6
    };
  }

  function levelTitle(seed, level) {
    var r = makeRng((seed ^ (level * 2654435761)) >>> 0);
    return [(r() * 8) | 0, (r() * 8) | 0];
  }

  function shuffle(arr, rng) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = (rng() * (i + 1)) | 0;
      var t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function buildLevel(seed, level) {
    var p = levelParams(level);
    var rng = makeRng((seed * 1000003 + level * 7919) >>> 0);
    var maze = makeMaze(p.w, p.h, rng, 0.22);
    var sx = (rng() * p.w) | 0;
    var sy = (rng() * p.h) | 0;
    var field = distanceField(maze, sx, sy);
    var maxd = 0;
    var exitIdx = 0;
    for (var i = 0; i < field.length; i++) {
      if (field[i] > maxd) {
        maxd = field[i];
        exitIdx = i;
      }
    }
    var exit = { x: exitIdx % p.w, y: (exitIdx / p.w) | 0 };

    var used = {};
    used[sy * p.w + sx] = 1;
    used[exitIdx] = 1;

    var cells = [];
    for (var c = 0; c < field.length; c++) cells.push(c);
    shuffle(cells, rng);

    var shards = [];
    var minGap = 3;
    while (shards.length < p.shards && minGap >= 0) {
      for (var a = 0; a < cells.length && shards.length < p.shards; a++) {
        var id = cells[a];
        if (used[id] || field[id] < 3) continue;
        var ix = id % p.w;
        var iy = (id / p.w) | 0;
        var far = true;
        for (var s = 0; s < shards.length; s++) {
          if (Math.abs(shards[s].x - ix) + Math.abs(shards[s].y - iy) < minGap) {
            far = false;
            break;
          }
        }
        if (!far) continue;
        used[id] = 1;
        shards.push({ x: ix, y: iy, got: false });
      }
      minGap--;
    }

    var hunters = [];
    var minFar = Math.max(6, Math.floor(maxd * 0.5));
    for (var b = 0; b < cells.length && hunters.length < p.hunters; b++) {
      var hid = cells[b];
      if (used[hid] || field[hid] < minFar) continue;
      used[hid] = 1;
      var hx = hid % p.w;
      var hy = (hid / p.w) | 0;
      hunters.push({
        kind: KINDS[hunters.length % KINDS.length],
        x: hx, y: hy, nx: hx, ny: hy, prog: 0, dir: -1,
        sx: hx, sy: hy, stun: 3
      });
    }
    return { maze: maze, start: { x: sx, y: sy }, exit: exit, shards: shards, hunters: hunters, params: p, maxd: maxd };
  }

  function newPlayer(start) {
    return {
      x: start.x, y: start.y, nx: start.x, ny: start.y, prog: 0,
      dir: -1, want: -1, face: -1, dashLeft: 0, dashCd: 0, invuln: 0
    };
  }

  function createGame(seed) {
    return {
      seed: seed >>> 0,
      rng: makeRng((seed ^ 0x9e3779b9) >>> 0),
      phase: "title", // title | play | cleared | over
      level: 0, score: 0, lives: START_LIVES, best: 0,
      levelTime: 0, time: 0, collected: 0, events: [],
      maze: null, player: null, hunters: [], shards: [], exit: null, params: null,
      fieldPlayer: null, fieldAmbush: null, fieldKey: -1,
      lastBonus: 0, alarm: false, speed: 1
    };
  }

  function emit(g, type, data) {
    g.events.push({ type: type, data: data || null });
  }

  function loadLevel(g) {
    var lv = buildLevel(g.seed, g.level);
    g.maze = lv.maze;
    g.params = lv.params;
    g.exit = lv.exit;
    g.shards = lv.shards;
    g.hunters = lv.hunters;
    g.start = lv.start;
    g.maxd = lv.maxd;
    g.player = newPlayer(lv.start);
    g.collected = 0;
    g.levelTime = 0;
    g.alarm = false;
    g.fieldKey = -1;
    g.phase = "play";
    refreshFields(g);
    emit(g, "level", { level: g.level });
  }

  function startRun(g, seed) {
    if (seed !== undefined) {
      g.seed = seed >>> 0;
      g.rng = makeRng((seed ^ 0x9e3779b9) >>> 0);
    }
    g.level = 1;
    g.score = 0;
    g.lives = START_LIVES;
    g.time = 0;
    loadLevel(g);
  }

  function nextLevel(g) {
    g.level++;
    if (g.lives < MAX_LIVES) g.lives++; // a cleared floor restores one life
    loadLevel(g);
  }

  function playerCell(g) {
    var p = g.player;
    return p.prog < 0.5 ? { x: p.x, y: p.y } : { x: p.nx, y: p.ny };
  }

  function ambushTarget(g, pc) {
    var p = g.player;
    var cx = pc.x;
    var cy = pc.y;
    if (p.face < 0) return pc;
    for (var i = 0; i < 4; i++) {
      if (!canMove(g.maze, cx, cy, p.face)) break;
      cx += DX[p.face];
      cy += DY[p.face];
    }
    return { x: cx, y: cy };
  }

  function refreshFields(g) {
    var pc = playerCell(g);
    var key = pc.y * g.maze.w + pc.x + g.player.face * 100000;
    if (key === g.fieldKey) return;
    g.fieldKey = key;
    g.fieldPlayer = distanceField(g.maze, pc.x, pc.y);
    var t = ambushTarget(g, pc);
    g.fieldAmbush = distanceField(g.maze, t.x, t.y);
  }

  function bestByField(g, field, x, y, opts) {
    var best = [];
    var bestVal = 1e9;
    for (var i = 0; i < opts.length; i++) {
      var d = opts[i];
      var v = field[(y + DY[d]) * g.maze.w + x + DX[d]];
      if (v < 0) continue;
      if (v < bestVal) {
        bestVal = v;
        best = [d];
      } else if (v === bestVal) best.push(d);
    }
    if (!best.length) return opts[(g.rng() * opts.length) | 0];
    return best[(g.rng() * best.length) | 0];
  }

  function hunterChoose(g, h) {
    var opts = [];
    for (var d = 0; d < 4; d++) if (canMove(g.maze, h.x, h.y, d)) opts.push(d);
    if (!opts.length) return -1;
    // Every shadow only hunts you once you are within its range; otherwise it patrols.
    var field = null;
    var near = g.fieldPlayer[h.y * g.maze.w + h.x];
    var range = RANGE[h.kind] + (g.alarm ? 3 : 0);
    if (near >= 0 && near <= range) field = h.kind === "ambusher" ? g.fieldAmbush : g.fieldPlayer;
    if (field) return bestByField(g, field, h.x, h.y, opts);
    // wandering: do not turn back unless it is a dead end
    var fwd = opts.filter(function (d) {
      return h.dir < 0 || d !== (h.dir + 2) % 4;
    });
    if (fwd.length) opts = fwd;
    return opts[(g.rng() * opts.length) | 0];
  }

  // Moves an entity along cell to cell. `choose` picks the next direction when it is standing on a cell centre.
  function advance(e, dt, cellTime, choose, onArrive) {
    var rem = dt;
    var guard = 0;
    while (rem > 1e-9 && guard++ < 64) {
      if (e.nx === e.x && e.ny === e.y) {
        var d = choose(e);
        if (d < 0) return;
        e.dir = d;
        e.face = d;
        e.nx = e.x + DX[d];
        e.ny = e.y + DY[d];
        e.prog = 0;
      }
      var ct = cellTime(e);
      var need = (1 - e.prog) * ct;
      if (rem >= need) {
        rem -= need;
        e.x = e.nx;
        e.y = e.ny;
        e.prog = 0;
        if (onArrive) onArrive(e);
      } else {
        e.prog += rem / ct;
        rem = 0;
      }
    }
  }

  function position(e) {
    return { x: e.x + (e.nx - e.x) * e.prog, y: e.y + (e.ny - e.y) * e.prog };
  }

  function setWant(g, d) {
    if (!g.player || g.phase !== "play") return;
    var p = g.player;
    p.want = d;
    var moving = p.nx !== p.x || p.ny !== p.y;
    // turning straight back mid-cell is allowed, which feels much better than waiting
    if (moving && p.dashLeft <= 0 && d === (p.dir + 2) % 4) {
      var tx = p.x;
      var ty = p.y;
      p.x = p.nx;
      p.y = p.ny;
      p.nx = tx;
      p.ny = ty;
      p.prog = 1 - p.prog;
      p.dir = d;
      p.face = d;
    }
  }

  function dash(g) {
    var p = g.player;
    if (!p || g.phase !== "play") return false;
    if (p.dashCd > 0 || p.dashLeft > 0) return false;
    if (p.face < 0) return false;
    p.dashLeft = DASH_CELLS;
    p.dashCd = DASH_COOLDOWN;
    emit(g, "dash");
    return true;
  }

  function onPlayerArrive(g) {
    var p = g.player;
    if (p.dashLeft > 0) {
      p.dashLeft--;
      if (p.dashLeft === 0 && p.invuln < 0.5) p.invuln = 0.5; // a little grace after the dash ends
    }
    for (var i = 0; i < g.shards.length; i++) {
      var s = g.shards[i];
      if (!s.got && s.x === p.x && s.y === p.y) {
        s.got = true;
        g.collected++;
        g.score += 100;
        emit(g, "shard", { x: s.x, y: s.y, left: g.shards.length - g.collected });
        if (g.collected === g.shards.length) {
          g.alarm = true;
          emit(g, "open");
        }
      }
    }
    if (g.alarm && p.x === g.exit.x && p.y === g.exit.y) {
      var bonus = Math.max(0, Math.round((g.params.par - g.levelTime) * 10));
      g.lastBonus = bonus;
      g.score += 500 + bonus;
      g.phase = "cleared";
      if (g.score > g.best) g.best = g.score;
      emit(g, "clear", { bonus: bonus });
    }
  }

  function respawn(g) {
    var p = g.player;
    g.player = newPlayer(g.start);
    g.player.invuln = INVULN_AFTER_CATCH;
    g.player.dashCd = p.dashCd;
    // Shadows are sent to random far corners, so a retry is never the same fight twice.
    var field = distanceField(g.maze, g.start.x, g.start.y);
    var far = [];
    var minFar = Math.max(6, Math.floor(g.maxd * 0.5));
    for (var c = 0; c < field.length; c++) if (field[c] >= minFar) far.push(c);
    for (var i = 0; i < g.hunters.length; i++) {
      var h = g.hunters[i];
      var pick = far.length ? far[(g.rng() * far.length) | 0] : h.sy * g.maze.w + h.sx;
      h.x = h.nx = pick % g.maze.w;
      h.y = h.ny = (pick / g.maze.w) | 0;
      h.prog = 0;
      h.dir = -1;
      h.stun = 2.5;
    }
    g.fieldKey = -1;
    refreshFields(g);
  }

  function checkCatch(g) {
    var p = g.player;
    if (p.invuln > 0 || p.dashLeft > 0) return;
    var pp = position(p);
    for (var i = 0; i < g.hunters.length; i++) {
      var hp = position(g.hunters[i]);
      var dx = hp.x - pp.x;
      var dy = hp.y - pp.y;
      if (dx * dx + dy * dy < CATCH_DISTANCE * CATCH_DISTANCE) {
        g.lives--;
        emit(g, "caught", { x: pp.x, y: pp.y, lives: g.lives });
        if (g.lives <= 0) {
          g.phase = "over";
          if (g.score > g.best) g.best = g.score;
          emit(g, "over");
        } else respawn(g);
        return;
      }
    }
  }

  function update(g, dtRaw) {
    if (g.phase !== "play") return;
    var dt = Math.min(0.05, Math.max(0, dtRaw)) * (g.speed > 0 ? g.speed : 1); // game speed: scales everything alike
    g.time += dt;
    g.levelTime += dt;
    var p = g.player;
    if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - dt);
    if (p.dashCd > 0) p.dashCd = Math.max(0, p.dashCd - dt);

    advance(
      p, dt,
      function (e) { return e.dashLeft > 0 ? DASH_TIME : PLAYER_TIME; },
      function (e) {
        if (e.dashLeft > 0 && canMove(g.maze, e.x, e.y, e.dir)) return e.dir;
        if (e.dashLeft > 0) e.dashLeft = 0;
        if (canMove(g.maze, e.x, e.y, e.want)) return e.want;
        if (canMove(g.maze, e.x, e.y, e.dir)) return e.dir;
        return -1;
      },
      function () { onPlayerArrive(g); }
    );
    if (g.phase !== "play") return;
    refreshFields(g);

    var speedUp = g.alarm ? 0.9 : 1;
    var mult = { chaser: 1, ambusher: 1.05, wanderer: 0.9 };
    for (var i = 0; i < g.hunters.length; i++) {
      var h = g.hunters[i];
      if (h.stun > 0) {
        h.stun = Math.max(0, h.stun - dt);
        continue;
      }
      advance(
        h, dt,
        function (e) { return g.params.hunterTime * mult[e.kind] * speedUp; },
        function (e) { return hunterChoose(g, e); },
        null
      );
    }
    checkCatch(g);
  }

  return {
    DX: DX, DY: DY, BIT: BIT,
    PLAYER_TIME: PLAYER_TIME, DASH_TIME: DASH_TIME, DASH_CELLS: DASH_CELLS, DASH_COOLDOWN: DASH_COOLDOWN,
    START_LIVES: START_LIVES, MAX_LIVES: MAX_LIVES, INVULN_AFTER_CATCH: INVULN_AFTER_CATCH,
    makeRng: makeRng, makeMaze: makeMaze, canMove: canMove, distanceField: distanceField,
    levelParams: levelParams, levelTitle: levelTitle, buildLevel: buildLevel,
    createGame: createGame, startRun: startRun, nextLevel: nextLevel,
    setWant: setWant, dash: dash, update: update, position: position
  };
});
