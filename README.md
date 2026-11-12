<h1 align="center">Lumen Run</h1>
<p align="center">English: A tiny browser maze game. Carry the light, collect every shard, outrun the shadows.<br>日本語：暗い迷路を、自分のあかりだけを頼りに進むブラウザゲーム。欠片を全部集めて出口を開き、追ってくる影から逃げ切ります。</p>
<p align="center">
  <a href="https://r38k51.github.io/lumen-run/"><img src="https://img.shields.io/badge/play-online-7fe3ff" alt="Play online"></a>
  <img src="https://img.shields.io/badge/dependencies-none-brightgreen" alt="No dependencies">
  <img src="https://img.shields.io/badge/tests-node%3Atest-blue" alt="Tests: node:test">
</p>
<p align="center"><b>English</b> · <a href="#日本語">日本語</a></p>

![Gameplay](screenshots/play.png)

*Screenshot of the game (floor 1, English UI). / ゲーム画面（1階、英語表示）。*

## English

Play it here: https://r38k51.github.io/lumen-run/

### Features

- Dark mazes lit only by your own light. Every floor is generated from a seed.
- Three kinds of shadows: a chaser, an ambusher that cuts you off, and a wanderer.
- Dash (Space) slips through 3 cells at once, and you cannot be caught meanwhile.
- Floors get bigger and the shadows get faster, then the difficulty levels off so you can go deep.
- Clearing a floor restores one life. Three speed settings (Slow, Normal, Fast).
- English and Japanese UI, sound effects, touch controls (swipe and a dash button).
- One static page: no install, no network requests, no assets.

![Title screen](screenshots/title.png)

### Requirements

- A recent browser (Chrome, Edge, Firefox, Safari). Checked in Chromium only; other browsers are not checked yet.
- To run the tests: Node.js 20 or later (checked with Node 22).

### Usage

Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8000
```

| Key / action | What it does |
|---|---|
| Arrow keys / WASD / swipe | Move |
| Space / Shift / ⚡ button | Dash |
| P or Esc | Pause |
| M / V / L | Sound / Speed / Language |

Add `?seed=123` to the URL to replay the same maze. "Daily run" uses today's date as the seed.

### Tests

```bash
node --test
```

The tests cover maze connectivity, walls, dash, shards and the gate, getting caught, game over, and seeded replay.

### License

Not decided yet.

---

<a id="日本語"></a>
## 日本語

ここで遊べます：https://r38k51.github.io/lumen-run/

### 特徴

- 見えるのは、自分のあかりが届く範囲だけです。迷路は階ごとに自動で作られます。
- 影は3種類います。追いかけてくる影、行く先に回り込む影、うろうろしている影です。
- ダッシュ（スペース）で一気に3マス進み、その間は捕まりません。
- 階が進むと迷路は広くなり、影は速くなります。ただし15階あたりからは難しさが変わらないので、深い階まで進めます。
- 階をクリアするとライフが1つ回復します。ゲームの速さは3段階（ゆっくり、ふつう、はやい）から選べます。
- 日本語と英語の表示、効果音、スマホ用の操作（スワイプとダッシュボタン）があります。
- 1枚のページだけで動きます。インストールも通信も不要で、画像などの素材も使っていません。

![タイトル画面](screenshots/title.png)

### 必要なもの

- 最近のブラウザ（Chrome、Edge、Firefox、Safari）。動作を確かめたのは Chromium だけで、ほかのブラウザは未確認です。
- テストを動かすには Node.js 20 以上（確認は Node 22）。

### 使い方

`index.html` をブラウザで開くか、フォルダを配信します。

```bash
python -m http.server 8000
```

| キー / 操作 | 動作 |
|---|---|
| 矢印キー / WASD / スワイプ | 移動 |
| スペース / Shift / ⚡ ボタン | ダッシュ |
| P または Esc | 一時停止 |
| M / V / L | 音 / 速さ / 言語 |

URL の末尾に `?seed=123` を付けると、毎回同じ迷路で遊べます（数字が迷路の元になります）。「今日の迷路」は、その日の日付が元になるので、同じ日は誰でも同じ迷路です。

### テスト

```bash
node --test
```

迷路が全部つながっていること、壁を抜けないこと、ダッシュ、欠片と出口、捕まったときとゲームオーバー、同じ数字で同じ迷路になることを確かめます。

### ライセンス

未決です。
