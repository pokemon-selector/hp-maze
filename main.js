// ====== 設定 ======
const SPIKE_EXTRA_COST = 1; // スパイクは追加で-1（合計-2）
const CELL = {
  WALL: "1",
  FLOOR: "0",
  PLAYER: "P",
  GOAL: "G",
  BLOCK: "B",
  KEY: "K",
  DOOR: "D",
  SPIKE: "^",
  WARP: "W",
  HOLE: "O",
};

// ====== ステージ ======
// editor.html の出力は map: [ "....", "...." ] をそのまま貼れる
const STAGES = [
  {
    name: "STAGE 1",
    hp: 18,
    map: [
    "1111111111",
    "1P111111G1",
    "1011111101",
    "1011111101",
    "1011111101",
    "1000000001",
    "1111111111",
    "1111111111",
    "1111111111",
    "1111111111"
]
  },
  // ここに editor の出力をどんどん追加
  {
  name: "STAGE2",
  hp: 18,
  map: [
    "1111111111",
    "1P11111G11",
    "1011111011",
    "1011111011",
    "1011111011",
    "100000B001",
    "1111111111",
    "1111111111",
    "1111111111",
    "1111111111"
  ],
},
{
  name: "STAGE 3",
  hp: 18,
  map: [
    "1111111111",
    "1P0B010001",
    "1010010101",
    "1011010101",
    "1011000101",
    "1011111101",
    "100^0^0001",
    "1111111101",
    "11111111G1",
    "1111111111"
  ],
},

{
  name: "STAGE 4",
  hp: 30,
  map: [
    "111111111111111",
    "1P0001111111111",
    "110001111111111",
    "110001111111111",
    "110001111111111",
    "110001111111111",
    "110001111111111",
    "1100B0111111111",
    "110BB00000D00G1",
    "111000000011111",
    "111011111111111",
    "111011111111111",
    "111K11111111111",
    "111111111111111",
    "111111111111111"
  ],
},


  {
  name: "STAGE 5",
  hp: 35,
  map: [
    "111111111111111",
    "1P11111111111G1",
    "101111111111101",
    "101111111111101",
    "100B0BBB000BB01",
    "10B0B000B0B0001",
    "100B00B00BB0001",
    "100BB00B000BB01",
    "10000BB0B0BB001",
    "111111111111111"
  ],
},

 {
  name: "STAGE 6",
  hp: 15,
  map: [
    "111111111111111",
    "111111111111111",
    "111111111111111",
    "111111111111111",
    "11P000W1W000G11",
    "111111111111111",
    "111111111111111",
    "111111111111111",
    "111111111111111",
    "111111111111111"
  ],
},

{
  name: "STAGE 7",
  hp: 25,
  map: [
    "1111111",
    "1P111W1",
    "101^101",
    "1011101",
    "100B001",
    "10101D1",
    "101K101",
    "1011101",
    "1W111G1",
    "1111111"
  ],
},

{
  name: "STAGE 8",
  hp: 15,
  map: [
    "1111111111",
    "1P1111G111",
    "1011110111",
    "1011110111",
    "10B0O00111",
    "1111111111",
    "1111111111",
    "1111111111",
    "1111111111",
    "1111111111"
  ],
},

{
  name: "STAGE9",
  hp: 90,
  map: [
    "11111111111111111111",
    "10000000000111110G01",
    "10000000000011110O01",
    "10000000P00001111D11",
    "11B11000000000010001",
    "10001111O11000010001",
    "10001000001000OD0001",
    "10001000B01000010B01",
    "10K01K00001000010001",
    "11111111111111111111"
  ],
},

{
  name: "STAGE 10",
  hp: 150,
  map: [
    "11111111111111111111",
    "1P000000000100000011",
    "10000000B00100000011",
    "1000000B0B0D00000011",
    "10001100B00100000011",
    "10001100000100000011",
    "10001111111111OO1111",
    "100011110000B000B001",
    "100011110000B000B001",
    "1^1O1111OOO111111111",
    "1^101111000111111111",
    "1^101111000O000000W1",
    "1^101111111111111111",
    "1^101111111111111111",
    "1^1011100^00^000^0^1",
    "1^101110^^^0^0000^01",
    "1^1011100^00^^^0^0^1",
    "1^1011100^00^0^00001",
    "1^KO111W0000000000G1",
    "11111111111111111111"
  ],
}, 
];


function getStageFromHash(){
  const m = location.hash.match(/stage=([^&]+)/);
  if (!m) return null;
  try {
    return JSON.parse(decodeURIComponent(m[1]));
  } catch (e) {
    console.error("Invalid stage in hash", e);
    return null;
  }
}

const custom = getStageFromHash();
if (custom && custom.map && custom.hp != null) {
  // テストプレイ時はこのステージ1つだけにする
  STAGES.length = 0;
  STAGES.push(custom);
}

// ====== 状態 ======
let stageIndex = 0;

let grid = [];
let w = 0, h = 0;
let player = { x: 1, y: 1 };
let goal = { x: 1, y: 1 };

let hp = 0;
let steps = 0;
let status = "探索中";
let keys = 0;
let warps = []; // [{x,y}, {x,y}] を想定
let skipWarpOnce = false; // ワープ後に連鎖しないため


// Undo用：履歴
const history = []; // 配列の末尾が最新
const HISTORY_LIMIT = 200;

function snapshot(){
  return {
    grid: grid.map(row => row.join("")),
    player: { ...player },
    goal: { ...goal },
    w, h,
    hp, steps,
    keys,
    status,
  };
}

function restore(s){
  w = s.w; h = s.h;
  grid = s.grid.map(line => line.split(""));
  player = { ...s.player };
  goal = { ...s.goal };
  hp = s.hp;
  steps = s.steps;
  keys = s.keys;
  status = s.status;

  // Undoしたら探索中に戻したい場合はここで上書きしてもOK
  // status = "探索中: " + STAGES[stageIndex].name;
}

function pushHistory(){
  history.push(snapshot());
  if (history.length > HISTORY_LIMIT) history.shift();
}

function undo(){
  if (history.length === 0) return;
  const prev = history.pop();
  restore(prev);

  // クリア/失敗画面が出ていたら閉じる
  hideOverlay();
  render();
}
// ====== ボタン ======
const btnUndo = document.getElementById("undo");
if (btnUndo) btnUndo.addEventListener("click", () => undo());


// ====== DOM ======
const elBoard = document.getElementById("board");
const elHp = document.getElementById("hp");
const elSteps = document.getElementById("steps");
const elStatus = document.getElementById("status");
const btnNext = document.getElementById("new");
const btnRestart = document.getElementById("restart");

// ====== SOUND (WebAudio) ======
let audioCtx = null;
let soundEnabled = true;
let bgmTimer = null;
let bgmStep = 0;

function ensureAudio(){
  if (!soundEnabled) return false;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return true;
}

function beep({ freq=440, dur=0.08, type="sine", vol=0.15, slideTo=null } = {}){
  if (!ensureAudio()) return;

  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();

  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo != null) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);

  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  o.connect(g).connect(audioCtx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function playSE(name){
  // 軽い・分かりやすい音だけ用意
  if (name === "move")  beep({ freq: 520, dur: 0.04, type:"square", vol:0.06, slideTo: 430 });
  if (name === "push")  beep({ freq: 180, dur: 0.07, type:"square", vol:0.10, slideTo: 120 });
  if (name === "spike") beep({ freq: 880, dur: 0.06, type:"sawtooth", vol:0.10, slideTo: 440 });
  if (name === "warp")  beep({ freq: 330, dur: 0.10, type:"sine", vol:0.12, slideTo: 990 });
  if (name === "key")   beep({ freq: 660, dur: 0.08, type:"triangle", vol:0.12, slideTo: 990 });
  if (name === "door")  beep({ freq: 220, dur: 0.10, type:"square", vol:0.12, slideTo: 160 });
  if (name === "hole")  beep({ freq: 140, dur: 0.10, type:"square", vol:0.12, slideTo: 90 });
  if (name === "clear") {
    beep({ freq: 523, dur: 0.09, type:"triangle", vol:0.16, slideTo: 784 });
    setTimeout(() => beep({ freq: 784, dur: 0.10, type:"triangle", vol:0.16, slideTo: 1046 }), 90);
  }
  if (name === "allclear") {
    // ちょい派手
    playSE("clear");
    setTimeout(() => beep({ freq: 988, dur: 0.12, type:"triangle", vol:0.18, slideTo: 1319 }), 180);
  }
  if (name === "dead")  beep({ freq: 220, dur: 0.18, type:"sawtooth", vol:0.14, slideTo: 70 });
}

function startBGM(){
  if (!ensureAudio()) return;
  if (bgmTimer) return;

  // 簡易8bitループ（軽いBGM）
  const scale = [0, 3, 5, 7, 10, 12]; // だいたいマイナーっぽい
  const base = 220;

  bgmStep = 0;
  bgmTimer = setInterval(() => {
    if (!soundEnabled || !audioCtx) return;

    const s = scale[bgmStep % scale.length];
    const freq = base * Math.pow(2, s / 12);

    // 2音を交互に鳴らすだけでもBGM感出る
    beep({ freq, dur: 0.08, type:"square", vol:0.03 });
    if (bgmStep % 2 === 0) beep({ freq: freq/2, dur: 0.06, type:"triangle", vol:0.02 });

    bgmStep++;
  }, 180);
}

function stopBGM(){
  if (bgmTimer) clearInterval(bgmTimer);
  bgmTimer = null;
}

function setSoundUI(){
  const btn = document.getElementById("sound");
  if (!btn) return;
  btn.textContent = soundEnabled ? "🔊 Sound" : "🔇 Sound";
}


// ====== Overlay（クリア/失敗演出） ======
const overlay = document.createElement("div");
overlay.className = "overlay";
overlay.innerHTML = `
  <div class="overlayCard" role="dialog" aria-modal="true">
    <h2 class="overlayTitle" id="ovTitle">CLEAR</h2>
    <p class="overlayText" id="ovText">次のステージへ進めます。</p>
    <div class="overlayBtns">
      <button class="ghost" id="ovRetry">やり直す</button>
      <button id="ovNext">次へ</button>
    </div>
  </div>
`;
document.body.appendChild(overlay);

const ovTitle = overlay.querySelector("#ovTitle");
const ovText  = overlay.querySelector("#ovText");
const ovRetry = overlay.querySelector("#ovRetry");
const ovNext  = overlay.querySelector("#ovNext");

ovRetry.addEventListener("click", () => loadStage(stageIndex));
ovNext.addEventListener("click", () => {
  const isLast = (stageIndex === STAGES.length - 1);
  loadStage(isLast ? 0 : stageIndex + 1);
});


function showOverlay(kind){
  const isLast = (stageIndex === STAGES.length - 1);

  if (kind === "clear") {
    if (isLast) {
      ovTitle.textContent = "ALL CLEAR!";
      ovText.textContent = "全ステージクリア！遊んでくれてありがとう。";
      ovNext.textContent = "最初から";
      ovNext.disabled = false;
      ovTitle.classList.add("allclearTitle");
      spawnConfetti();

    } else {
      ovTitle.textContent = "CLEAR!";
      ovText.textContent = "次へで次のステージに進めます。";
      ovNext.textContent = "次へ";
      ovNext.disabled = false;
      ovTitle.classList.remove("allclearTitle");
    }
  } else if (kind === "dead") {
    ovTitle.textContent = "FAILED";
    ovText.textContent = "HPが0になりました。やり直そう。";
    ovNext.textContent = "次へ";
    ovTitle.classList.remove("allclearTitle");
    ovNext.disabled = true; // 失敗時は次へ無効
  }

  overlay.classList.add("show");
}

function spawnConfetti(){
  // 既存があれば消す
  document.querySelectorAll(".confetti").forEach(x => x.remove());

  const wrap = document.createElement("div");
  wrap.className = "confetti";

  const N = 60;
  for (let i=0;i<N;i++){
    const p = document.createElement("i");
    p.style.left = Math.random()*100 + "vw";
    p.style.animationDuration = (1.3 + Math.random()*1.2) + "s";
    p.style.animationDelay = (Math.random()*0.15) + "s";
    // 色指定はしてない（あなたのポリシー次第で後で付けてもOK）
    // 代わりに明るさをランダム
    const gray = 200 + Math.floor(Math.random()*55);
    p.style.background = `rgb(${gray},${gray},${gray})`;
    wrap.appendChild(p);
  }

  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 2600);
}


function hideOverlay(){
  overlay.classList.remove("show");
}




// ====== ユーティリティ ======
function setStatus(text){
  status = text;
  elStatus.textContent = text;
}

function inBounds(x,y){ return y>=0 && y<h && x>=0 && x<w; }
function tileAt(x,y){ return inBounds(x,y) ? grid[y][x] : CELL.WALL; }
function setTile(x,y,v){ if (inBounds(x,y)) grid[y][x] = v; }

function parseStage(stage){
  const lines = stage.map;
  h = lines.length;
  w = lines[0].length;

  // 全行の長さチェック（事故防止）
  for (const row of lines){
    if (row.length !== w) throw new Error("Stage row length mismatch");
  }

  grid = lines.map(row => row.split(""));
  keys = 0;
  warps = [];
  skipWarpOnce = false;  

  // P/G を探して床に置換
  let foundP = false, foundG = false;

  for (let y=0; y<h; y++){
    for (let x=0; x<w; x++){
      const c = grid[y][x];

      if (c === CELL.WARP){
        warps.push({ x, y });
      }

      if (c === CELL.PLAYER){
        player = { x, y };
        grid[y][x] = CELL.FLOOR;
        foundP = true;
      }
      if (c === CELL.GOAL){
        goal = { x, y };
        grid[y][x] = CELL.FLOOR;
        foundG = true;
      }
    }
  }
 
  if (!foundP) throw new Error("Stage must contain P");
  if (!foundG) throw new Error("Stage must contain G");
}

function hideTitle(){
  document.body.classList.add("game-playing");
}


function loadStage(i){
  stageIndex = (i + STAGES.length) % STAGES.length;
  const stage = STAGES[stageIndex];

  history.length = 0;

  try {
    parseStage(stage);
  } catch (e) {
    console.error(e);
    alert(`ステージ読み込みエラー: ${stage.name}\n${e.message}`);
    // 壊れてたらステージ1に戻す（任意）
    // if (stageIndex !== 0) loadStage(0);
    return;
  }

  hp = stage.hp;
  steps = 0;
  setStatus(`探索中: ${stage.name}`);
  render();

  btnNext.disabled = true;
  btnNext.classList.remove("primary");
  btnNext.textContent = "次へ";
}

function canEnter(x,y){
  const t = tileAt(x,y);
  if (t === CELL.WALL) return false;
  if (t === CELL.DOOR && keys <= 0) return false;
  if (t === CELL.HOLE) return false; // ★追加
  return true;
}


function consumeStep(extra=0){
  steps += 1;
  hp -= (1 + extra);
  if (hp < 0) hp = 0;
}

function onEnterTile(x,y){
  const t = tileAt(x,y);

  // 鍵：拾ったら+1して床に
  if (t === CELL.KEY) {
    keys += 1;
    setTile(x,y, CELL.FLOOR);
    playSE("key");
    return;
  }

  // ドア：鍵があれば消費して開ける（床に）
  // ※ canEnter / tryMove 側で鍵0なら入れないので基本ここは通る時点で keys>0 のはず
  if (t === CELL.DOOR) {
    if (keys > 0) {
      keys -= 1;
      setTile(x,y, CELL.FLOOR);
      playSE("door");
    }
    return;
  }

  // ワープ（Wが2個以上ある時だけ動く）
  if (!skipWarpOnce && t === CELL.WARP && warps.length >= 2) {
    const dest = (warps[0].x === x && warps[0].y === y) ? warps[1] : warps[0];

    if (dest && (dest.x !== x || dest.y !== y)) {
      player.x = dest.x;
      player.y = dest.y;

      playSE("warp");

      // このターンは連鎖ワープしない
      skipWarpOnce = true;
    }
    return;
  }

  // 次のターンはワープOKに戻す
  skipWarpOnce = false;
}


function checkGoalOrDead(){
  // クリア判定
  if (player.x === goal.x && player.y === goal.y) {
    const isLast = (stageIndex === STAGES.length - 1);

    setStatus(`クリア！: ${STAGES[stageIndex].name}`);
    btnNext.disabled = false;
    btnNext.classList.add("primary");
    btnNext.textContent = isLast ? "最初から" : "次へ";

    // ★SE
    playSE(isLast ? "allclear" : "clear");
    return;
  }

  // 死亡判定
  if (hp <= 0) {
    setStatus(`力尽きた…: ${STAGES[stageIndex].name}`);
    btnNext.disabled = true;
    btnNext.classList.remove("primary");
    btnNext.textContent = "次へ"; // 見た目の保険（任意）

    // ★SE
    playSE("dead");
  }
}

function tryMove(dir){
  startBGM();

  if (!status.startsWith("探索中")) return;
  if (hp <= 0) { checkGoalOrDead(); render(); return; }

  const delta = {
    up:    {dx:0, dy:-1},
    down:  {dx:0, dy: 1},
    left:  {dx:-1,dy: 0},
    right: {dx: 1,dy: 0},
  }[dir];
  if (!delta) return;

  const nx = player.x + delta.dx;
  const ny = player.y + delta.dy;

  const t = tileAt(nx, ny);

  // 壁
  if (t === CELL.WALL) return;

  // ドア（鍵なし）
  if (t === CELL.DOOR && keys <= 0) return;

  // ブロック：押せるなら押して進む
  if (t === CELL.BLOCK) {
    const bx = nx + delta.dx;
    const by = ny + delta.dy;
    const bt = tileAt(bx, by);

    // 押し先が床 or 穴ならOK
    if (bt === CELL.FLOOR || bt === CELL.HOLE) {
      pushHistory();

      // ★SE：押した
      playSE("push");
      if (bt === CELL.HOLE) playSE("hole");

      if (bt === CELL.HOLE) {
        // 穴に落ちる → 床になる（ブロック消滅）
        setTile(bx, by, CELL.FLOOR);
      } else {
        setTile(bx, by, CELL.BLOCK);
      }

      setTile(nx, ny, CELL.FLOOR);

      player.x = nx;
      player.y = ny;

      const landed = tileAt(player.x, player.y); // ブロックを押して進んだ先の床
      const extra = (landed === CELL.SPIKE) ? SPIKE_EXTRA_COST : 0;
      consumeStep(extra);

      // ★SE：スパイクを踏んだら
      if (landed === CELL.SPIKE) playSE("spike");

      onEnterTile(player.x, player.y);
      checkGoalOrDead();
      render();
    }
    return;
  }

  // 通常移動
  if (!canEnter(nx, ny)) return;

  pushHistory();

  player.x = nx;
  player.y = ny;

  const extra = (t === CELL.SPIKE) ? SPIKE_EXTRA_COST : 0;
  consumeStep(extra);

  // ★SE：移動成功
  playSE("move");
  // ★SE：スパイク踏んだ
  if (t === CELL.SPIKE) playSE("spike");

  onEnterTile(nx, ny);
  checkGoalOrDead();
  render();
}


function render(){
  elHp.textContent = String(hp);
  elSteps.textContent = String(steps);
  elStatus.textContent = keys > 0 ? `${status} 🔑x${keys}` : status;

  elBoard.style.setProperty("--w", w);
  elBoard.style.setProperty("--h", h);

  elBoard.innerHTML = "";

  for (let y=0; y<h; y++){
    for (let x=0; x<w; x++){
      const base = tileAt(x,y);
      const cell = document.createElement("div");

      cell.className = "cell " + (base === CELL.WALL ? "wall" : "floor");
      cell.textContent = "";

      // 表示（地形）
      if (x === goal.x && y === goal.y) {
        cell.className = "cell goal";
        cell.textContent = "G";
      } else if (base === CELL.BLOCK) {
        cell.textContent = "■";
      } else if (base === CELL.KEY) {
        cell.textContent = "K";
      } else if (base === CELL.DOOR) {
        cell.textContent = "D";
      } else if (base === CELL.SPIKE) {
        cell.textContent = "^";
      } else if (base === CELL.WARP) {
        cell.textContent = "W";
      } else if (base === CELL.HOLE) {
        cell.textContent = "O";
      }



      // プレイヤー最前面
      if (x === player.x && y === player.y) {
        cell.className = "cell player";
        cell.textContent = "P";
      }

      // 死亡表示
      if (status.startsWith("力尽きた") && x === player.x && y === player.y) {
        cell.className = "cell dead";
        cell.textContent = "X";
      }

      elBoard.appendChild(cell);
    }
  }

  // ★★★ ここに貼る ★★★
  if (status.startsWith("クリア")) {
    showOverlay("clear");
  } else if (status.startsWith("力尽きた")) {
    showOverlay("dead");
  } else {
    hideOverlay();
  }  
}

// ====== 入力 ======
// 矢印ボタン（1タップ=1手）
document.querySelectorAll("[data-move]").forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    tryMove(btn.dataset.move);
  });
});

// キーボード
window.addEventListener("keydown", (e)=>{
  const map = { ArrowUp:"up", ArrowDown:"down", ArrowLeft:"left", ArrowRight:"right" };
  const dir = map[e.key];

  if (dir) { e.preventDefault(); tryMove(dir); return; }

  if (e.key === "r" || e.key === "R") {
    e.preventDefault();
    loadStage(stageIndex);
    return;
  }

  if (e.key === "n" || e.key === "N") {
    e.preventDefault();
    loadStage(stageIndex + 1);
    return;
  }

  if (e.key === "z" || e.key === "Z" || e.key === "Backspace") {
    e.preventDefault();
    undo();
    return;
  }

});

// 既存ボタン
document.getElementById("restart").addEventListener("click", ()=>loadStage(stageIndex));
document.getElementById("new").addEventListener("click", ()=>loadStage(stageIndex + 1));

const btnSound = document.getElementById("sound");
if (btnSound) {
  setSoundUI();
  btnSound.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    if (!soundEnabled) stopBGM();
    setSoundUI();
    if (soundEnabled) { ensureAudio(); startBGM(); }
  });
}

// ===== Title Screen control =====
const elTitle = document.getElementById("titleScreen");
const btnStart = document.getElementById("start");
const btnHowto = document.getElementById("howtoBtn");
const elHowto = document.getElementById("howto");

// タイトル表示/非表示
function showTitle(){
  if (elTitle) elTitle.classList.remove("hidden");
}
function hideTitle(){
  if (elTitle) elTitle.classList.add("hidden");
}

// STARTでゲーム開始
if (btnStart){
  btnStart.addEventListener("click", () => {
    // スマホ対策：ここで音の許可を取る
    startBGM();
    hideTitle();
    loadStage(0);
  });
}

// 遊び方 開閉
if (btnHowto && elHowto){
  btnHowto.addEventListener("click", () => {
    elHowto.hidden = !elHowto.hidden;
  });
}

showTitle(); // 最初はタイトルを出す

































