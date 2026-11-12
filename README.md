<div align="center">

# Lumen Run

**Carry the light through the dark. Collect every shard and outrun the shadows.**<br>
**自分のあかりだけを頼りに、暗い迷路を進もう。欠片を全部集めて、影から逃げ切ろう。**

[![Play online](https://img.shields.io/badge/play-GitHub%20Pages-2f6f62.svg)](https://r38k51.github.io/lumen-run/)
[![Static page](https://img.shields.io/badge/page-static%20HTML-blue.svg)](#english)
[![No dependencies](https://img.shields.io/badge/dependencies-none-green.svg)](#english)
[![Languages: EN / JA](https://img.shields.io/badge/languages-EN%20%2F%20JA-orange.svg)](#english)
[![Node 20+ for tests](https://img.shields.io/badge/node-20%2B%20(tests)-339933.svg)](package.json)

[English](#english) · [日本語](#日本語) · [Play / 遊ぶ](https://r38k51.github.io/lumen-run/)

<img src="screenshots/play.png" alt="Lumen Run: a lit maze with shards and a shadow / 暗い迷路で欠片を集めている画面" width="720">

</div>

---

<a id="english"></a>

## English

[日本語はこちら](#日本語)

A single static page. You see only what your own light reaches. Collect every shard to open the gate, reach it, and keep going to deeper floors while three kinds of shadows hunt you. English and Japanese UI.

**Play online:** https://r38k51.github.io/lumen-run/

### Features

- **Dark mazes.** You see only what your light reaches. Each floor is generated automatically.
- **Three kinds of shadows.** One chases you, one cuts you off ahead, one wanders around.
- **Dash.** Press Space to slip through 3 cells at once. You cannot be caught while dashing.
- **Floors that grow, then level off.** Mazes get bigger and shadows faster until about floor 15, so you can go deep.
- **Lives and speed.** Clearing a floor restores one life. Choose Slow, Normal or Fast.
- **Phone friendly.** Swipe to move and tap the dash button. Sound effects, English and Japanese UI.

### How to play

| Key / action | What it does |
|---|---|
| Arrow keys, WASD, swipe | Move |
| Space, Shift, ⚡ button | Dash |
| P or Esc | Pause |
| M, V, L | Sound, speed, language |

Add `?seed=123` to the URL to get the same maze every time. "Daily run" uses today's date, so everyone gets the same maze that day.

### Screenshots

![Gameplay](screenshots/play.png)

![Title screen](screenshots/title.png)

The screenshots show the game itself; no personal data is involved.

### Requirements

- A recent browser (Chrome, Edge, Firefox, Safari). Only Chromium has been checked so far; the others are not checked yet.
- Node 20 or later, only to run the tests (checked with Node 22). The page has no dependencies.

### Run locally

```sh
python -m http.server 8000
```

Then open `http://localhost:8000/`. Opening `index.html` directly also works.

### Tests

```sh
node --test
```

The tests cover maze connectivity, walls, dash, shards and the gate, getting caught, game over, and seeded replay.

### License

No license has been chosen yet. If you would like to use this code, please open an Issue.

---

<a id="日本語"></a>

## 日本語

[English](#english)

1枚のページだけで動くゲームです。見えるのは、自分のあかりが届く範囲だけ。欠片を全部集めて出口の扉を開け、3種類の影に追われながら、できるだけ深い階を目指します。表示は日本語と英語に対応しています。

**遊ぶ：** https://r38k51.github.io/lumen-run/

### 特徴

- **暗い迷路。** 見えるのは、あかりが届く範囲だけです。迷路は階ごとに自動で作られます。
- **3種類の影。** 追いかけてくる影、行く先に回り込む影、うろうろしている影がいます。
- **ダッシュ。** スペースで一気に3マス進みます。ダッシュ中は捕まりません。
- **だんだん難しく、やがて一定に。** 15階あたりまでは、階が進むほど迷路が広くなり、影も速くなります。それ以降は難しさが変わらないので、深い階まで進めます。
- **ライフと速さ。** 階をクリアするとライフが1つ回復します。ゲームの速さは「ゆっくり」「ふつう」「はやい」から選べます。
- **スマホでも遊べます。** スワイプで動き、ボタンでダッシュします。効果音もあり、表示は日本語と英語を切り替えられます。

### あそびかた

| キー / 操作 | 動作 |
|---|---|
| 矢印キー、WASD、スワイプ | 移動 |
| スペース、Shift、⚡ ボタン | ダッシュ |
| P または Esc | 一時停止 |
| M、V、L | 音、速さ、言語 |

URL の末尾に `?seed=123` を付けると、毎回同じ迷路で遊べます。「今日の迷路」は日付が元になるので、同じ日は誰でも同じ迷路です。

### 画面

![ゲーム画面](screenshots/play.png)

![タイトル画面](screenshots/title.png)

画面はゲームそのものの様子で、個人情報は写っていません。

### 必要なもの

- 最近のブラウザ（Chrome、Edge、Firefox、Safari）。動作を確かめたのは Chromium だけで、ほかのブラウザは未確認です。
- Node 20 以上は、テストを動かすときだけ必要です（動作確認は Node 22）。ページ自体は、ほかのパッケージを必要としません。

### 手元で動かす

```sh
python -m http.server 8000
```

そのあと `http://localhost:8000/` を開きます。`index.html` を直接開いても動きます。

### テスト

```sh
node --test
```

迷路が全部つながっていること、壁を抜けないこと、ダッシュ、欠片と出口、捕まったときとゲームオーバー、同じ数字で同じ迷路になることを確かめます。

### ライセンス

ライセンスはまだ決めていません。使いたい場合は Issue でお知らせください。
