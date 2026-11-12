"use strict";
/* Lumen Run: drawing, input, sound and screens. The rules live in core.js. */
(function () {
  var C = window.LumenCore;
  var I = window.LumenI18n;

  var $ = function (id) { return document.getElementById(id); };
  var cv = $("cv");
  var ctx = cv.getContext("2d");
  var wallLayer = document.createElement("canvas");
  var tmp = document.createElement("canvas");

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("lumenrun." + k); return v === null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("lumenrun." + k, v); } catch (e) { /* private mode */ } }
  };

  var lang = store.get("lang", "") || I.detect();
  if (!I.S[lang]) lang = "en";
  var muted = store.get("muted", "0") === "1";
  var SPEEDS = [0.5, 0.7, 1];
  var speedIdx = parseInt(store.get("speed", "1"), 10);
  if (!(speedIdx >= 0 && speedIdx < SPEEDS.length)) speedIdx = 1;
  var g = C.createGame(1);
  g.speed = SPEEDS[speedIdx];
  g.best = parseInt(store.get("best", "0"), 10) || 0;
  var view = { w: 0, h: 0, dpr: 1, cell: 10, ox: 0, oy: 0 };
  var explored = null;
  var particles = [];
  var shake = 0;
  var paused = false;
  var started = false;
  var floorLabel = "";
  var lastT = 0;
  var bannerTimer = 0;
  var clock = 0;

  // ---------- text ----------
  function t(k) { return I.S[lang][k]; }
  function applyText() {
    document.documentElement.lang = lang;
    var els = document.querySelectorAll("[data-t]");
    for (var i = 0; i < els.length; i++) els[i].textContent = t(els[i].getAttribute("data-t"));
    $("howList").textContent = "";
    t("howLines").forEach(function (s) {
      var li = document.createElement("li");
      li.textContent = s;
      $("howList").appendChild(li);
    });
    $("keys").textContent = t("keys");
    $("bLang").textContent = t("lang");
    $("bSpeed").textContent = t("speed") + ": " + t("speeds")[speedIdx];
    $("bSound").textContent = t("sound") + ": " + (muted ? t("off") : t("on"));
    document.title = t("title");
    $("tBest").textContent = g.best;
    if (g.level) floorLabel = I.floorName(lang, C.levelTitle(g.seed, g.level));
    hud();
  }

  function hud() {
    $("hLevel").textContent = g.level || 1;
    $("hShards").textContent = g.shards ? g.collected + "/" + g.shards.length : "0/0";
    var hearts = "";
    for (var i = 0; i < g.lives; i++) hearts += "♥";
    $("hLives").textContent = hearts;
    $("hScore").textContent = g.score;
    var cd = g.player ? 1 - g.player.dashCd / C.DASH_COOLDOWN : 1;
    $("hDash").firstChild.style.width = Math.round(Math.max(0, Math.min(1, cd)) * 100) + "%";
  }

  function banner(text, ms) {
    var b = $("banner");
    b.textContent = text;
    b.hidden = false;
    b.style.animation = "none";
    void b.offsetWidth;
    b.style.animation = "";
    bannerTimer = ms || 1800;
  }

  // ---------- sound ----------
  var ac = null;
  function audio() {
    if (muted) return null;
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; }
    }
    if (ac && ac.state === "suspended") ac.resume();
    return ac;
  }
  function tone(freq, dur, type, vol, slide, delay) {
    var a = audio();
    if (!a) return;
    var t0 = a.currentTime + (delay || 0);
    var o = a.createOscillator();
    var gn = a.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
    gn.gain.setValueAtTime(0.0001, t0);
    gn.gain.exponentialRampToValueAtTime(vol || 0.08, t0 + 0.01);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(gn);
    gn.connect(a.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }
  var sfx = {
    shard: function (left) { tone(660 + (8 - Math.min(8, left)) * 70, 0.25, "sine", 0.09); tone(990, 0.3, "triangle", 0.04, null, 0.05); },
    open: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.45, "triangle", 0.07, null, i * 0.09); }); },
    dash: function () { tone(500, 0.18, "sawtooth", 0.04, 1400); },
    caught: function () { tone(220, 0.5, "sawtooth", 0.1, 50); },
    clear: function () { [392, 523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.4, "sine", 0.08, null, i * 0.08); }); },
    over: function () { [330, 262, 196, 147].forEach(function (f, i) { tone(f, 0.6, "sine", 0.08, null, i * 0.2); }); },
    level: function () { tone(330, 0.35, "sine", 0.05); }
  };

  // ---------- layout ----------
  function resize() {
    var r = cv.getBoundingClientRect();
    view.dpr = Math.min(2, window.devicePixelRatio || 1);
    view.w = Math.max(1, Math.floor(r.width * view.dpr));
    view.h = Math.max(1, Math.floor(r.height * view.dpr));
    cv.width = wallLayer.width = tmp.width = view.w;
    cv.height = wallLayer.height = tmp.height = view.h;
    layout();
  }
  function layout() {
    if (!g.maze) return;
    var pad = 14 * view.dpr;
    view.cell = Math.max(6, Math.floor(Math.min((view.w - pad * 2) / g.maze.w, (view.h - pad * 2) / g.maze.h)));
    view.ox = Math.floor((view.w - view.cell * g.maze.w) / 2);
    view.oy = Math.floor((view.h - view.cell * g.maze.h) / 2);
    drawWalls();
  }
  function px(x) { return view.ox + x * view.cell; }
  function py(y) { return view.oy + y * view.cell; }

  function drawWalls() {
    var w = wallLayer.getContext("2d");
    w.clearRect(0, 0, view.w, view.h);
    var m = g.maze;
    w.lineCap = "round";
    w.strokeStyle = "#8fd8ff";
    w.lineWidth = Math.max(1.5, view.cell * 0.06);
    w.shadowColor = "#4cc6ff";
    w.shadowBlur = view.cell * 0.25;
    w.beginPath();
    for (var y = 0; y < m.h; y++) {
      for (var x = 0; x < m.w; x++) {
        var wl = m.walls[y * m.w + x];
        var x0 = px(x), y0 = py(y), x1 = px(x + 1), y1 = py(y + 1);
        if (wl & C.BIT[0]) { w.moveTo(x0, y0); w.lineTo(x1, y0); }
        if (wl & C.BIT[3]) { w.moveTo(x0, y0); w.lineTo(x0, y1); }
        if (y === m.h - 1 && wl & C.BIT[2]) { w.moveTo(x0, y1); w.lineTo(x1, y1); }
        if (x === m.w - 1 && wl & C.BIT[1]) { w.moveTo(x1, y0); w.lineTo(x1, y1); }
        if (y < m.h - 1 && wl & C.BIT[2]) { w.moveTo(x0, y1); w.lineTo(x1, y1); }
        if (x < m.w - 1 && wl & C.BIT[1]) { w.moveTo(x1, y0); w.lineTo(x1, y1); }
      }
    }
    w.stroke();
  }

  // ---------- particles ----------
  function burst(cx, cy, color, n, speed) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = (0.3 + Math.random()) * speed;
      particles.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.6 + Math.random() * 0.5, age: 0, color: color });
    }
  }

  // ---------- drawing ----------
  var HCOL = { chaser: "#ff5d73", ambusher: "#c58bff", wanderer: "#ffb35c" };

  function cellCenter(p) { return { x: px(p.x + 0.5), y: py(p.y + 0.5) }; }

  function drawFrame() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#07080f";
    ctx.fillRect(0, 0, view.w, view.h);
    if (!g.maze || !g.player) return;
    var cell = view.cell;
    var sh = shake > 0 ? shake : 0;
    ctx.save();
    if (sh) ctx.translate((Math.random() - 0.5) * sh * view.dpr, (Math.random() - 0.5) * sh * view.dpr);

    var pp = C.position(g.player);
    var pc = cellCenter(pp);
    var R = cell * (g.player.dashLeft > 0 ? 5.4 : 4.1) * (1 + Math.sin(clock * 3) * 0.015);

    // mark explored cells
    var rr = Math.ceil(4.1);
    for (var yy = Math.max(0, Math.floor(pp.y) - rr); yy <= Math.min(g.maze.h - 1, Math.floor(pp.y) + rr); yy++) {
      for (var xx = Math.max(0, Math.floor(pp.x) - rr); xx <= Math.min(g.maze.w - 1, Math.floor(pp.x) + rr); xx++) {
        var dx = xx + 0.5 - (pp.x + 0.5), dy = yy + 0.5 - (pp.y + 0.5);
        if (dx * dx + dy * dy < 12) explored[yy * g.maze.w + xx] = 1;
      }
    }

    // remembered walls (dim)
    ctx.save();
    ctx.beginPath();
    for (var cy = 0; cy < g.maze.h; cy++) {
      for (var cx = 0; cx < g.maze.w; cx++) if (explored[cy * g.maze.w + cx]) ctx.rect(px(cx) - 2, py(cy) - 2, cell + 4, cell + 4);
    }
    ctx.clip();
    ctx.globalAlpha = 0.2;
    ctx.drawImage(wallLayer, 0, 0);
    ctx.restore();

    // lit walls
    var tc = tmp.getContext("2d");
    tc.globalCompositeOperation = "source-over";
    tc.clearRect(0, 0, view.w, view.h);
    tc.drawImage(wallLayer, 0, 0);
    tc.globalCompositeOperation = "destination-in";
    var gr = tc.createRadialGradient(pc.x, pc.y, cell * 0.2, pc.x, pc.y, R);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.55, "rgba(255,255,255,0.75)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    tc.fillStyle = gr;
    tc.fillRect(0, 0, view.w, view.h);
    ctx.drawImage(tmp, 0, 0);

    // warm pool of light on the floor
    var pool = ctx.createRadialGradient(pc.x, pc.y, 0, pc.x, pc.y, R);
    pool.addColorStop(0, "rgba(255,226,160,0.20)");
    pool.addColorStop(1, "rgba(255,226,160,0)");
    ctx.fillStyle = pool;
    ctx.fillRect(0, 0, view.w, view.h);

    // exit
    var ex = cellCenter(g.exit);
    var exDist = Math.hypot(g.exit.x - pp.x, g.exit.y - pp.y);
    if (g.alarm) {
      var pulse = 0.7 + Math.sin(clock * 4) * 0.3;
      var eg = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, cell * 2.4);
      eg.addColorStop(0, "rgba(255,217,138," + 0.55 * pulse + ")");
      eg.addColorStop(1, "rgba(255,217,138,0)");
      ctx.fillStyle = eg;
      ctx.fillRect(ex.x - cell * 3, ex.y - cell * 3, cell * 6, cell * 6);
      ctx.strokeStyle = "#ffd98a";
      ctx.lineWidth = Math.max(2, cell * 0.08);
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, cell * (0.3 + 0.05 * pulse), 0, Math.PI * 2);
      ctx.stroke();
    } else if (explored[g.exit.y * g.maze.w + g.exit.x]) {
      ctx.strokeStyle = "rgba(255,217,138,0.35)";
      ctx.lineWidth = Math.max(1.5, cell * 0.05);
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, cell * 0.28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ex.x - cell * 0.18, ex.y - cell * 0.18);
      ctx.lineTo(ex.x + cell * 0.18, ex.y + cell * 0.18);
      ctx.moveTo(ex.x + cell * 0.18, ex.y - cell * 0.18);
      ctx.lineTo(ex.x - cell * 0.18, ex.y + cell * 0.18);
      ctx.stroke();
    }
    void exDist;

    // shards
    for (var i = 0; i < g.shards.length; i++) {
      var s = g.shards[i];
      if (s.got) continue;
      var sc = cellCenter(s);
      var d = Math.hypot(s.x - pp.x, s.y - pp.y);
      var a = d < 4.4 ? 1 : d < 8 ? 0.35 : explored[s.y * g.maze.w + s.x] ? 0.18 : 0.07;
      var tw = 0.85 + Math.sin(clock * 5 + i) * 0.15;
      var rad = cell * 0.2 * tw;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.shadowColor = "#fff2b0";
      ctx.shadowBlur = cell * 0.5;
      ctx.fillStyle = "#fff2b0";
      ctx.translate(sc.x, sc.y);
      ctx.rotate(clock * 0.8 + i);
      ctx.beginPath();
      ctx.moveTo(0, -rad * 1.4);
      ctx.lineTo(rad, 0);
      ctx.lineTo(0, rad * 1.4);
      ctx.lineTo(-rad, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // shadows
    for (var k = 0; k < g.hunters.length; k++) {
      var h = g.hunters[k];
      var hp = C.position(h);
      var hc = cellCenter(hp);
      var hd = Math.hypot(hp.x - pp.x, hp.y - pp.y);
      var vis = Math.max(0, Math.min(1, (4.6 - hd) / 1.6));
      var near = hd < 8 ? 0.55 * (1 - hd / 8) : 0;
      var col = HCOL[h.kind];
      var br = cell * 0.3 * (1 + Math.sin(clock * 6 + k) * 0.05);
      var stunned = h.stun > 0;
      if (vis > 0) {
        ctx.save();
        ctx.globalAlpha = vis * (stunned ? 0.55 : 1);
        ctx.shadowColor = col;
        ctx.shadowBlur = cell * 0.5;
        ctx.fillStyle = "#12071a";
        ctx.strokeStyle = col;
        ctx.lineWidth = Math.max(1.5, cell * 0.06);
        ctx.beginPath();
        if (h.kind === "chaser") ctx.arc(hc.x, hc.y, br, 0, Math.PI * 2);
        else if (h.kind === "ambusher") {
          ctx.moveTo(hc.x, hc.y - br * 1.15);
          ctx.lineTo(hc.x + br * 1.05, hc.y + br * 0.8);
          ctx.lineTo(hc.x - br * 1.05, hc.y + br * 0.8);
          ctx.closePath();
        } else ctx.rect(hc.x - br * 0.9, hc.y - br * 0.9, br * 1.8, br * 1.8);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      // eyes are visible from further away than the body, so you can tell something is near
      var eye = Math.max(vis, near);
      if (eye > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, eye + 0.1);
        ctx.fillStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = cell * 0.3;
        var er = Math.max(1.5, cell * 0.05);
        var look = h.dir >= 0 ? { x: C.DX[h.dir], y: C.DY[h.dir] } : { x: 0, y: 0 };
        ctx.beginPath();
        ctx.arc(hc.x - br * 0.38 + look.x * br * 0.15, hc.y - br * 0.1 + look.y * br * 0.15, er, 0, Math.PI * 2);
        ctx.arc(hc.x + br * 0.38 + look.x * br * 0.15, hc.y - br * 0.1 + look.y * br * 0.15, er, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // player
    var blink = g.player.invuln > 0 && Math.floor(clock * 14) % 2 === 0;
    if (!blink) {
      var orb = cell * 0.2;
      ctx.save();
      if (g.player.dashLeft > 0) {
        ctx.strokeStyle = "rgba(180,240,255,0.7)";
        ctx.lineWidth = orb * 1.4;
        ctx.lineCap = "round";
        ctx.beginPath();
        var back = g.player.dir >= 0 ? (g.player.dir + 2) % 4 : 0;
        ctx.moveTo(pc.x, pc.y);
        ctx.lineTo(pc.x + C.DX[back] * cell * 1.1, pc.y + C.DY[back] * cell * 1.1);
        ctx.stroke();
      }
      ctx.shadowColor = "#fff6cf";
      ctx.shadowBlur = cell * 0.9;
      ctx.fillStyle = "#fffbe8";
      ctx.beginPath();
      ctx.arc(pc.x, pc.y, orb * (1 + Math.sin(clock * 7) * 0.06), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // particles
    for (var q = 0; q < particles.length; q++) {
      var pt = particles[q];
      ctx.globalAlpha = Math.max(0, 1 - pt.age / pt.life);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(px(pt.x), py(pt.y), Math.max(1, cell * 0.05), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // danger warning: the screen edge glows red when a shadow is close, even if you cannot see it
    var nearest = 99;
    for (var n2 = 0; n2 < g.hunters.length; n2++) {
      var hp2 = C.position(g.hunters[n2]);
      nearest = Math.min(nearest, Math.hypot(hp2.x - pp.x, hp2.y - pp.y));
    }
    if (nearest < 7) {
      var inten = (1 - nearest / 7) * (0.7 + 0.3 * Math.sin(clock * 10));
      var vg = ctx.createRadialGradient(view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.35, view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.75);
      vg.addColorStop(0, "rgba(255,40,70,0)");
      vg.addColorStop(1, "rgba(255,40,70," + (0.45 * inten).toFixed(3) + ")");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, view.w, view.h);
    }
    ctx.restore();
  }

  // ---------- flow ----------
  function show(id, on) { $(id).hidden = !on; }
  function showOnly(id) {
    ["title", "pause", "clear", "over"].forEach(function (p) { show(p, p === id); });
    var f = id ? $(id).querySelector("button.primary") : null;
    if (f) f.focus({ preventScroll: true });
  }

  function newRun(seed) {
    started = true;
    paused = false;
    C.startRun(g, seed);
    onLevelLoaded();
    showOnly(null);
    $("hud").hidden = false;
    $("bDash").hidden = !("ontouchstart" in window);
    audio();
    resize();
  }
  function onLevelLoaded() {
    explored = new Uint8Array(g.maze.w * g.maze.h);
    particles = [];
    floorLabel = I.floorName(lang, C.levelTitle(g.seed, g.level));
    banner(t("level") + " " + g.level + (lang === "ja" ? "：" : " · ") + floorLabel, 2200);
    layout();
    hud();
  }

  function randomSeed() { return (Math.random() * 0xffffffff) >>> 0; }
  function dailySeed() {
    var d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  function handleEvents() {
    var ev = g.events;
    g.events = [];
    for (var i = 0; i < ev.length; i++) {
      var e = ev[i];
      if (e.type === "shard") {
        burst(e.data.x + 0.5, e.data.y + 0.5, "#fff2b0", 16, 1.8);
        sfx.shard(e.data.left);
      } else if (e.type === "open") {
        banner(t("gateOpen"), 2200);
        burst(g.exit.x + 0.5, g.exit.y + 0.5, "#ffd98a", 30, 2.4);
        sfx.open();
      } else if (e.type === "dash") sfx.dash();
      else if (e.type === "caught") {
        shake = 14;
        burst(e.data.x + 0.5, e.data.y + 0.5, "#ff5d73", 26, 2.6);
        sfx.caught();
      } else if (e.type === "clear") {
        sfx.clear();
        $("cInfo").textContent = t("bonus") + ": +" + e.data.bonus + "　" + t("score") + ": " + g.score;
        showOnly("clear");
      } else if (e.type === "over") {
        sfx.over();
        store.set("best", String(g.best));
        $("oInfo").textContent = t("reached") + " " + g.level + "　" + t("score") + ": " + g.score + "　" + t("best") + ": " + g.best + "　" + t("seed") + ": " + g.seed;
        showOnly("over");
      } else if (e.type === "level") sfx.level();
    }
  }

  function setPaused(p) {
    if (g.phase !== "play") return;
    paused = p;
    showOnly(p ? "pause" : null);
  }

  // ---------- input ----------
  var KEYS = { ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3 };
  window.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var playing = started && g.phase === "play" && !paused;
    if (e.code in KEYS) {
      if (playing) { C.setWant(g, KEYS[e.code]); e.preventDefault(); }
    } else if (e.code === "Space" || e.code === "ShiftLeft" || e.code === "ShiftRight") {
      if (playing) { C.dash(g); e.preventDefault(); }
    } else if (e.code === "KeyP" || e.code === "Escape") {
      if (started && g.phase === "play") setPaused(!paused);
    } else if (e.code === "KeyM") toggleSound();
    else if (e.code === "KeyV") toggleSpeed();
    else if (e.code === "KeyL") toggleLang();
  });

  var sw = null;
  cv.addEventListener("pointerdown", function (e) { sw = { x: e.clientX, y: e.clientY }; audio(); });
  cv.addEventListener("pointermove", function (e) {
    if (!sw || !started || g.phase !== "play" || paused) return;
    var dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    C.setWant(g, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
    sw = { x: e.clientX, y: e.clientY };
  });
  function endSwipe() { sw = null; }
  cv.addEventListener("pointerup", endSwipe);
  cv.addEventListener("pointercancel", endSwipe);
  $("bDash").addEventListener("pointerdown", function (e) { e.preventDefault(); if (g.phase === "play" && !paused) C.dash(g); });

  function toggleSound() {
    muted = !muted;
    store.set("muted", muted ? "1" : "0");
    applyText();
    if (!muted) { audio(); tone(660, 0.15, "sine", 0.06); }
  }
  function toggleSpeed() {
    speedIdx = (speedIdx + 1) % SPEEDS.length;
    g.speed = SPEEDS[speedIdx];
    store.set("speed", String(speedIdx));
    applyText();
  }
  function toggleLang() {
    lang = lang === "ja" ? "en" : "ja";
    store.set("lang", lang);
    applyText();
  }
  $("bSound").addEventListener("click", toggleSound);
  $("bSpeed").addEventListener("click", toggleSpeed);
  $("bLang").addEventListener("click", toggleLang);
  $("bPlay").addEventListener("click", function () {
    var q = /[?&]seed=(\d+)/.exec(location.search);
    newRun(q ? parseInt(q[1], 10) : randomSeed());
  });
  $("bDaily").addEventListener("click", function () { newRun(dailySeed()); });
  $("bResume").addEventListener("click", function () { setPaused(false); });
  $("bNext").addEventListener("click", function () {
    C.nextLevel(g);
    onLevelLoaded();
    showOnly(null);
  });
  $("bAgain").addEventListener("click", function () { newRun(randomSeed()); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && started && g.phase === "play") setPaused(true); });
  window.addEventListener("resize", resize);

  // ---------- loop ----------
  function frame(ts) {
    var dt = lastT ? Math.min(0.1, (ts - lastT) / 1000) : 0;
    lastT = ts;
    clock += dt;
    if (started && !paused && g.phase === "play") {
      C.update(g, dt);
      handleEvents();
    }
    if (g.phase !== "title") {
      for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.age += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.age > p.life) particles.splice(i, 1);
      }
      if (shake > 0) shake = Math.max(0, shake - dt * 40);
      if (bannerTimer > 0) {
        bannerTimer -= dt * 1000;
        if (bannerTimer <= 0) $("banner").hidden = true;
      }
      hud();
    }
    drawFrame();
    requestAnimationFrame(frame);
  }

  // The title screen shows a slowly wandering light over a real maze, so it is never an empty box.
  C.startRun(g, 20261112);
  g.phase = "title";
  g.hunters = [];
  explored = new Uint8Array(g.maze.w * g.maze.h);
  applyText();
  resize();
  requestAnimationFrame(frame);

  // for tests and debugging in the console
  window.__lumen = { game: g, core: C };
})();
