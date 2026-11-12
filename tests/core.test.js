"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../src/core.js");

function reachable(m) {
  const f = C.distanceField(m, 0, 0);
  return Array.from(f).every((v) => v >= 0);
}

test("迷路はどのシード・階層でも全マスがつながる", () => {
  for (let seed = 1; seed <= 30; seed++) {
    for (let level = 1; level <= 14; level++) {
      const lv = C.buildLevel(seed, level);
      assert.ok(reachable(lv.maze), `seed ${seed} level ${level}`);
    }
  }
});

test("外周に抜け道がなく、壁は両側で一致する", () => {
  const lv = C.buildLevel(7, 5);
  const m = lv.maze;
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      for (let d = 0; d < 4; d++) {
        if (C.canMove(m, x, y, d)) {
          const nx = x + C.DX[d];
          const ny = y + C.DY[d];
          assert.ok(C.canMove(m, nx, ny, (d + 2) % 4), "行き来できる");
        }
      }
    }
  }
  assert.equal(C.canMove(m, 0, 0, 0), false);
  assert.equal(C.canMove(m, 0, 0, 3), false);
});

test("欠片・出口・影の配置が重ならず、数が合う", () => {
  for (let level = 1; level <= 12; level++) {
    const lv = C.buildLevel(11, level);
    const p = lv.params;
    assert.equal(lv.shards.length, p.shards, `欠片 level ${level}`);
    assert.equal(lv.hunters.length, p.hunters, `影 level ${level}`);
    const seen = new Set();
    const add = (o) => {
      const k = o.x + "," + o.y;
      assert.ok(!seen.has(k), "重なり " + k);
      seen.add(k);
    };
    add(lv.start);
    add(lv.exit);
    lv.shards.forEach(add);
    lv.hunters.forEach(add);
  }
});

test("階層が上がると大きく・影が増え・速くなる", () => {
  const a = C.levelParams(1);
  const b = C.levelParams(10);
  assert.ok(b.w > a.w && b.h > a.h);
  assert.ok(b.hunters > a.hunters);
  assert.ok(b.hunterTime < a.hunterTime);
  assert.ok(b.hunterTime >= 0.17);
});

test("同じシードなら同じ迷路になる(再現)", () => {
  const a = C.buildLevel(123, 4);
  const b = C.buildLevel(123, 4);
  assert.deepEqual(Array.from(a.maze.walls), Array.from(b.maze.walls));
  assert.deepEqual(a.shards, b.shards);
  assert.deepEqual(a.exit, b.exit);
  const c = C.buildLevel(124, 4);
  assert.notDeepEqual(Array.from(a.maze.walls), Array.from(c.maze.walls));
});

test("同じシードで同じ操作なら同じ結果になる", () => {
  function run() {
    const g = C.createGame(5);
    C.startRun(g, 5);
    for (let i = 0; i < 400; i++) {
      C.setWant(g, (i >> 4) % 4);
      if (i % 90 === 0) C.dash(g);
      C.update(g, 0.016);
    }
    const p = C.position(g.player);
    return JSON.stringify([p, g.score, g.lives, g.hunters.map(C.position)]);
  }
  assert.equal(run(), run());
});

function openDir(g) {
  const p = g.player;
  for (let d = 0; d < 4; d++) if (C.canMove(g.maze, p.x, p.y, d)) return d;
  return -1;
}

test("プレイヤーは壁を抜けない", () => {
  const g = C.createGame(3);
  C.startRun(g, 3);
  g.hunters = [];
  for (let i = 0; i < 2000; i++) {
    C.setWant(g, i % 4);
    C.update(g, 0.016);
    const p = g.player;
    assert.ok(p.x >= 0 && p.y >= 0 && p.x < g.maze.w && p.y < g.maze.h);
    if (p.nx !== p.x || p.ny !== p.y) {
      const d = C.DX.findIndex((dx, k) => dx === p.nx - p.x && C.DY[k] === p.ny - p.y);
      assert.ok(d >= 0 && C.canMove(g.maze, p.x, p.y, d), "壁越えの移動");
    }
  }
});

test("影は壁を抜けない", () => {
  const g = C.createGame(9);
  C.startRun(g, 9);
  g.lives = 999;
  g.player.invuln = 1e9;
  for (let i = 0; i < 3000; i++) {
    C.update(g, 0.016);
    for (const h of g.hunters) {
      if (h.nx !== h.x || h.ny !== h.y) {
        const d = C.DX.findIndex((dx, k) => dx === h.nx - h.x && C.DY[k] === h.ny - h.y);
        assert.ok(d >= 0 && C.canMove(g.maze, h.x, h.y, d), "影が壁越え");
      }
    }
  }
});

test("追跡の影は近づいていく", () => {
  const g = C.createGame(4);
  C.startRun(g, 4);
  g.hunters = g.hunters.slice(0, 1);
  g.hunters[0].kind = "chaser";
  g.hunters[0].stun = 0;
  g.player.invuln = 1e9;
  // 追う範囲(6マス)に入る位置へ影を置く
  const f0 = C.distanceField(g.maze, g.player.x, g.player.y);
  const cand = f0.findIndex((v) => v === 5);
  g.hunters[0].x = g.hunters[0].nx = cand % g.maze.w;
  g.hunters[0].y = g.hunters[0].ny = (cand / g.maze.w) | 0;
  const field = C.distanceField(g.maze, g.player.x, g.player.y);
  const h = g.hunters[0];
  const before = field[h.y * g.maze.w + h.x];
  for (let i = 0; i < 100; i++) C.update(g, 0.016);
  const after = field[h.y * g.maze.w + h.x];
  assert.ok(after < before, `前 ${before} 後 ${after}`);
});

test("ダッシュは3マス進み、その間は捕まらず、冷却がある", () => {
  const g = C.createGame(2);
  C.startRun(g, 2);
  g.hunters = [];
  // まっすぐ進める向きを探す
  C.setWant(g, openDir(g));
  C.update(g, 0.02);
  assert.equal(C.dash(g), true);
  assert.equal(C.dash(g), false, "連続は不可");
  assert.ok(g.player.dashCd > 0);
  assert.ok(g.events.some((e) => e.type === "dash"));
  let steps = 0;
  const start = { x: g.player.x, y: g.player.y };
  for (let i = 0; i < 200 && g.player.dashLeft > 0; i++) {
    C.update(g, 0.01);
    steps++;
  }
  assert.equal(g.player.dashLeft, 0);
  assert.ok(steps < 200);
  // 冷却が終わればまた使える
  for (let i = 0; i < 400; i++) C.update(g, 0.01);
  assert.equal(g.player.dashCd, 0);
  assert.equal(C.dash(g), true);
  void start;
});

test("ダッシュ中は影に重なっても捕まらない", () => {
  const g = C.createGame(2);
  C.startRun(g, 2);
  g.player.invuln = 0;
  const d = openDir(g);
  C.setWant(g, d);
  C.update(g, 0.02);
  assert.equal(C.dash(g), true);
  const h = g.hunters[0];
  h.stun = 5;
  const lives = g.lives;
  C.update(g, 0.001);
  // 動いている最中のプレイヤーの位置に影を重ねる
  const pp = C.position(g.player);
  h.x = h.nx = Math.round(pp.x);
  h.y = h.ny = Math.round(pp.y);
  h.prog = 0;
  C.update(g, 0.001);
  assert.ok(g.player.dashLeft > 0, "ダッシュ中");
  assert.equal(g.lives, lives);
});

function teleportToShard(g, s) {
  g.player.x = g.player.nx = s.x;
  g.player.y = g.player.ny = s.y;
  g.player.prog = 0;
}

test("欠片を取ると得点が入り、全部集めると出口が開く", () => {
  const g = C.createGame(6);
  C.startRun(g, 6);
  g.hunters = [];
  assert.equal(g.alarm, false);
  const n = g.shards.length;
  for (let i = 0; i < n; i++) {
    const s = g.shards[i];
    // 隣のマスから歩いて入る
    teleportToShard(g, s);
    // 到着処理を起こすため、1マス分動かす
    let d = -1;
    for (let k = 0; k < 4; k++) if (C.canMove(g.maze, s.x, s.y, k)) d = k;
    const nx = s.x + C.DX[d];
    const ny = s.y + C.DY[d];
    g.player.x = g.player.nx = nx;
    g.player.y = g.player.ny = ny;
    C.setWant(g, (d + 2) % 4);
    for (let t = 0; t < 40 && !s.got; t++) C.update(g, 0.016);
    assert.ok(s.got, `欠片 ${i}`);
  }
  assert.equal(g.collected, n);
  assert.equal(g.alarm, true);
  assert.ok(g.events.some((e) => e.type === "open"));
  assert.ok(g.score >= 100 * n);
});

function walkInto(g, target) {
  let d = -1;
  for (let k = 0; k < 4; k++) if (C.canMove(g.maze, target.x, target.y, k)) d = k;
  g.player.x = g.player.nx = target.x + C.DX[d];
  g.player.y = g.player.ny = target.y + C.DY[d];
  g.player.prog = 0;
  C.setWant(g, (d + 2) % 4);
  for (let t = 0; t < 60 && g.phase === "play"; t++) C.update(g, 0.016);
}

test("欠片が残っていると出口は通れず、全部集めるとクリアする", () => {
  const g = C.createGame(8);
  C.startRun(g, 8);
  g.hunters = [];
  walkInto(g, g.exit);
  assert.equal(g.phase, "play", "閉じている");
  g.alarm = true;
  g.collected = g.shards.length;
  walkInto(g, g.exit);
  assert.equal(g.phase, "cleared");
  assert.ok(g.events.some((e) => e.type === "clear"));
  assert.ok(g.score >= 500);
  C.nextLevel(g);
  assert.equal(g.level, 2);
  assert.equal(g.phase, "play");
  assert.equal(g.alarm, false);
});

test("捕まると命が減り、スタートに戻って一時無敵になる", () => {
  const g = C.createGame(10);
  C.startRun(g, 10);
  const h = g.hunters[0];
  h.stun = 0;
  const p = g.player;
  p.x = p.nx = h.x;
  p.y = p.ny = h.y;
  p.prog = 0;
  const lives = g.lives;
  C.update(g, 0.001);
  assert.equal(g.lives, lives - 1);
  assert.equal(g.phase, "play");
  assert.equal(g.player.x, g.start.x);
  assert.ok(g.player.invuln > 0);
  assert.ok(g.events.some((e) => e.type === "caught"));
});

test("命がなくなるとゲームオーバーになり、ベストが残る", () => {
  const g = C.createGame(10);
  C.startRun(g, 10);
  g.score = 700;
  g.lives = 1;
  const h = g.hunters[0];
  h.stun = 0;
  const p = g.player;
  p.x = p.nx = h.x;
  p.y = p.ny = h.y;
  p.prog = 0;
  C.update(g, 0.001);
  assert.equal(g.phase, "over");
  assert.equal(g.best, 700);
  assert.ok(g.events.some((e) => e.type === "over"));
  // 終わった後は動かない
  const before = JSON.stringify(C.position(g.player));
  C.update(g, 0.1);
  assert.equal(JSON.stringify(C.position(g.player)), before);
});

test("無敵の間は捕まらない", () => {
  const g = C.createGame(10);
  C.startRun(g, 10);
  const h = g.hunters[0];
  h.stun = 0;
  g.player.invuln = 5;
  g.player.x = g.player.nx = h.x;
  g.player.y = g.player.ny = h.y;
  const lives = g.lives;
  C.update(g, 0.001);
  assert.equal(g.lives, lives);
});

test("大きな dt を渡しても飛び越えない", () => {
  const g = C.createGame(1);
  C.startRun(g, 1);
  g.hunters = [];
  C.setWant(g, openDir(g));
  C.update(g, 100);
  assert.ok(g.levelTime <= 0.05 + 1e-9);
});
