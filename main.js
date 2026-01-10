// ====== 設定 ======
const START_HP = 18; // 手数＝体力
const SPIKE_EXTRA_COST = 1; // スパイクは追加で-1（合計-2になる）
const CELL = {
  WALL: "0",
  FLOOR: "1",
  PLAYER: "P",
  GOAL: "G",
  BLOCK: "B",
  KEY: "K",
  DOOR: "D",
  SPIKE: "^",
};

// ====== ステージデータ ======
const STAGES = [
[
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
];

// ====== 状態 ======
let stageIndex = 0;
let grid = [];               // 文字の2次元配列
let w = 0, h = 0;
let player = { x: 1, y: 1 };
let goal = { x: 1, y: 1 };
let hp = START_HP;
let steps = 0;
let status = "探索中";
let hasKey = false;

const elBoard = document.getElementById("board");
const elHp = document.getElementById("hp");
const elSteps = document.getElementById("steps");
const elStatus = document.getElementById("status");

function setStatus(text){ status = text; elStatus.textContent = text; }

function parseStage(lines){
  h = lines.length;
  w = lines[0].length;

  grid = lines.map(row => row.split(""));

  hasKey = false;

  for (let y=0; y<h; y++){
    for (let x=0; x<w; x++){
      const c = grid[y][x];
      if (c === CELL.PLAYER){
        player = { x, y };
        grid[y][x] = CELL.FLOOR;
      }
      if (c === CELL.GOAL){
        goal = { x, y };
        // Gは床として扱って描画で表示する
        grid[y][x] = CELL.FLOOR;
      }
    }
  }
}

function loadStage(i){
  stageIndex = i;
  parseStage(STAGES[stageIndex]);

  hp = START_HP;
  steps = 0;
  setStatus(`探索中 (STAGE ${stageIndex+1})`);
  render();
}

function inBounds(x,y){ return y>=0 && y<h && x>=0 && x<w; }
function tileAt(x,y){ return inBounds(x,y) ? grid[y][x] : CELL.WALL; }
function setTile(x,y,v){ if (inBounds(x,y)) grid[y][x] = v; }

function canEnter(x,y){
  const t = tileAt(x,y);
  if (t === CELL.WALL) return false;
  if (t === CELL.DOOR && !hasKey) return false;
  return true;
}

function consumeStep(extra=0){
  steps += 1;
  hp -= (1 + extra);
  if (hp < 0) hp = 0;
}

function tryMove(dir){
  if (!status.startsWith("探索中")) return;
  if (hp <= 0) { setStatus("力尽きた…"); render(); return; }

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
  if (t === CELL.DOOR && !hasKey) return;

  // ブロック：押せるなら押して進む
  if (t === CELL.BLOCK) {
    const bx = nx + delta.dx;
    const by = ny + delta.dy;
    const bt = tileAt(bx, by);

    // 押し先が床（or ゴール位置）で、壁/ドア/ブロックじゃなければOK
    if (bt === CELL.FLOOR) {
      setTile(bx, by, CELL.BLOCK);
      setTile(nx, ny, CELL.FLOOR);

      // 移動（1手消費）
      player.x = nx; player.y = ny;

      // スパイク判定（押し移動の着地点がスパイクの場合）
      const landed = tileAt(player.x, player.y);
      const extra = (landed === CELL.SPIKE) ? SPIKE_EXTRA_COST : 0;
      consumeStep(extra);

      // アイテム取得
      onEnterTile(player.x, player.y);

      // クリア判定
      checkGoalOrDead();
      render();
      return;
    }
    // 押せないなら動けない
    return;
  }

  // 通常移動できるタイルか？
  if (!canEnter(nx, ny)) return;

  // 移動
  player.x = nx; player.y = ny;

  // スパイク追加コスト
  const extra = (t === CELL.SPIKE) ? SPIKE_EXTRA_COST : 0;
  consumeStep(extra);

  // タイル効果
  onEnterTile(nx, ny);

  // クリア/死亡
  checkGoalOrDead();
  render();
}

function onEnterTile(x,y){
  const t = tileAt(x,y);

  if (t === CELL.KEY) {
    hasKey = true;
    setTile(x,y, CELL.FLOOR);
  }
  if (t === CELL.DOOR && hasKey) {
    // ドアは開けたら床にしてもOK（ヘルテイカーっぽく）
    setTile(x,y, CELL.FLOOR);
  }
}

function checkGoalOrDead(){
  if (player.x === goal.x && player.y === goal.y) {
    setStatus(`クリア！ (STAGE ${stageIndex+1})`);
    return;
  }
  if (hp <= 0) {
    setStatus("力尽きた…");
  }
}

function render(){
  elHp.textContent = String(hp);
  elSteps.textContent = String(steps);
  elStatus.textContent = hasKey ? `${status} 🔑` : status;

  elBoard.style.setProperty("--w", w);
  elBoard.style.setProperty("--h", h);

  elBoard.innerHTML = "";
  for (let y=0; y<h; y++){
    for (let x=0; x<w; x++){
      const cell = document.createElement("div");
      const base = tileAt(x,y);

      cell.className = "cell " + (base === CELL.WALL ? "wall" : "floor");
      cell.textContent = "";

      // タイルの表示
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
      }

      // プレイヤーは最前面
      if (x === player.x && y === player.y) {
        cell.className = "cell player";
        cell.textContent = "P";
      }

      // 死亡表示
      if (status === "力尽きた…" && x === player.x && y === player.y){
        cell.className = "cell dead";
        cell.textContent = "X";
      }

      elBoard.appendChild(cell);
    }
  }
}

// ====== 操作（clickのみ） ======
document.querySelectorAll("[data-move]").forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    tryMove(btn.dataset.move);
  });
});

window.addEventListener("keydown", (e)=>{
  const map = { ArrowUp:"up", ArrowDown:"down", ArrowLeft:"left", ArrowRight:"right" };
  const dir = map[e.key];
  if (dir) { e.preventDefault(); tryMove(dir); }
});

document.getElementById("restart").addEventListener("click", ()=>loadStage(stageIndex));
document.getElementById("new").addEventListener("click", ()=>{
  const next = (stageIndex + 1) % STAGES.length;
  loadStage(next);
});

// 起動
loadStage(0);




