"use strict";
/* Strings for Lumen Run (Japanese and English). */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LumenI18n = api;
})(typeof self !== "undefined" ? self : this, function () {
  var S = {
    en: {
      title: "Lumen Run",
      tagline: "Carry the light. Wake the shards. Outrun the dark.",
      play: "Play",
      daily: "Daily run",
      how: "How to play",
      howLines: [
        "Move with arrow keys / WASD, or swipe.",
        "Collect every shard to open the gate, then reach it.",
        "Shadows hunt you: one chases, one ambushes ahead, one wanders.",
        "Dash (Space) slips 3 cells at once and cannot be caught.",
        "Only your light shows the way. Each floor is bigger and meaner."
      ],
      level: "Floor",
      shards: "Shards",
      score: "Score",
      best: "Best",
      lives: "Lives",
      dash: "Dash",
      gateOpen: "The gate is open!",
      gateHint: "Collect all shards first",
      paused: "Paused",
      resume: "Resume",
      cleared: "Floor cleared",
      bonus: "Speed bonus",
      next: "Next floor",
      over: "The light went out",
      reached: "You reached floor",
      again: "Try again",
      seed: "Seed",
      sound: "Sound",
      speed: "Speed",
      speeds: ["Slow", "Normal", "Fast"],
      on: "on",
      off: "off",
      lang: "日本語",
      keys: "P pause · M sound · V speed · L language",
      adjectives: ["Hollow", "Quiet", "Glass", "Ember", "Drowned", "Pale", "Whispering", "Endless"],
      nouns: ["Gallery", "Vault", "Orchard", "Cistern", "Spiral", "Garden", "Cellar", "Atrium"]
    },
    ja: {
      title: "ルーメン・ラン",
      tagline: "あかりを抱いて、欠片を灯し、闇から逃げ切れ。",
      play: "はじめる",
      daily: "今日の迷路",
      how: "あそびかた",
      howLines: [
        "矢印キー / WASD、またはスワイプで動く。",
        "欠片を全部集めると扉が開く。出口へ向かおう。",
        "影が追ってくる。追いかける影、先回りする影、さまよう影。",
        "ダッシュ（スペース）は一気に3マス、その間は捕まらない。",
        "道を照らすのは自分のあかりだけ。階が進むほど広く、手ごわくなる。"
      ],
      level: "階",
      shards: "欠片",
      score: "スコア",
      best: "ベスト",
      lives: "ライフ",
      dash: "ダッシュ",
      gateOpen: "扉が開いた！",
      gateHint: "先に欠片を全部集めよう",
      paused: "一時停止",
      resume: "つづける",
      cleared: "クリア",
      bonus: "スピードボーナス",
      next: "次の階へ",
      over: "あかりが消えた",
      reached: "到達",
      again: "もう一度",
      seed: "シード",
      sound: "音",
      speed: "速さ",
      speeds: ["ゆっくり", "ふつう", "はやい"],
      on: "オン",
      off: "オフ",
      lang: "English",
      keys: "P 一時停止 · M 音 · V 速さ · L 言語",
      adjectives: ["うつろな", "しずかな", "ガラスの", "残り火の", "沈んだ", "青白い", "ささやく", "果てしない"],
      nouns: ["回廊", "地下蔵", "果樹園", "貯水槽", "螺旋", "庭", "穴ぐら", "吹き抜け"]
    }
  };

  function detect() {
    try {
      var l = (navigator.language || "en").toLowerCase();
      return l.indexOf("ja") === 0 ? "ja" : "en";
    } catch (e) {
      return "en";
    }
  }

  // "Hollow Gallery" in English, "うつろな回廊" in Japanese.
  function floorName(lang, pair) {
    var t = S[lang];
    var a = t.adjectives[pair[0] % t.adjectives.length];
    var n = t.nouns[pair[1] % t.nouns.length];
    return lang === "ja" ? a + n : a + " " + n;
  }

  return { S: S, detect: detect, floorName: floorName };
});
