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
    "11P000W1W000B11",
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
    key,
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
ovNext.addEventListener("click", () => loadStage(stageIndex + 1));

function showOverlay(kind){
  if (kind === "clear") {
    ovTitle.textContent = "CLEAR!";
    ovText.textContent = "次へで次のステージに進めます。";
    ovNext.disabled = false;
  } else if (kind === "dead") {
    ovTitle.textContent = "FAILED";
    ovText.textContent = "HPが0になりました。やり直そう。";
    ovNext.disabled = true; // 失敗時は次へ無効（好みで変えてOK）
  }
  overlay.classList.add("show");
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

function loadStage(i){
  stageIndex = (i + STAGES.length) % STAGES.length;
  const stage = STAGES[stageIndex];
  
  history.length = 0;

  parseStage(stage);

  hp = stage.hp;
  steps = 0;
  setStatus(`探索中: ${stage.name}`);
  render();

  btnNext.disabled = true;
  btnNext.classList.remove("primary");
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

  if (t === CELL.KEY) {
    keys += 1;
    setTile(x,y, CELL.FLOOR);
    return;
  }
   // ドア：鍵があれば消費して開ける（床に）
  if (t === CELL.DOOR) {
    if (keys > 0) {
      keys -= 1;
      setTile(x,y, CELL.FLOOR);
    }
    return;
  }
    // ワープ（Wが2個以上ある時だけ動く）
  if (!skipWarpOnce && t === CELL.WARP && warps.length >= 2) {
    // 今いるW以外のやつへ飛ぶ（2個想定）
    const dest = (warps[0].x === x && warps[0].y === y) ? warps[1] : warps[0];

    // 目的地が同じなら何もしない（保険）
    if (dest && (dest.x !== x || dest.y !== y)) {
      player.x = dest.x;
      player.y = dest.y;

      // このターンは連鎖ワープしない
      skipWarpOnce = true;
    }
  } else {
    // 次のターンはワープOKに戻す
    skipWarpOnce = false;
  }

}

function checkGoalOrDead(){
  if (player.x === goal.x && player.y === goal.y) {
    setStatus(`クリア！: ${STAGES[stageIndex].name}`);
    btnNext.disabled = false;
    btnNext.classList.add("primary");
    return;
  }
  if (hp <= 0) {
    setStatus(`力尽きた…: ${STAGES[stageIndex].name}`);
    btnNext.disabled = true;
    btnNext.classList.remove("primary");
  }
}
function tryMove(dir){
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

    // 押し先が床のみOK
    // 押し先が床 or 穴ならOK
  if (bt === CELL.FLOOR || bt === CELL.HOLE) {
    pushHistory();
  
    if (bt === CELL.HOLE) {
      // 穴に落ちる → 床になる
      setTile(bx, by, CELL.FLOOR);
    } else {
      setTile(bx, by, CELL.BLOCK);
    }
  
    setTile(nx, ny, CELL.FLOOR);
  
    player.x = nx;
    player.y = ny;
  
    const landed = tileAt(player.x, player.y);
    const extra = (landed === CELL.SPIKE) ? SPIKE_EXTRA_COST : 0;
    consumeStep(extra);
  
    onEnterTile(player.x, player.y);
    checkGoalOrDead();
    render();
  }

    return;
  }

  // 通常移動
  if (!canEnter(nx, ny)) return;
  
  pushHistory();

  player.x = nx; player.y = ny;

  const extra = (t === CELL.SPIKE) ? SPIKE_EXTRA_COST : 0;
  consumeStep(extra);

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

// 起動
loadStage(0);


















