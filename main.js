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
};

// ====== ステージ ======
// editor.html の出力は map: [ "....", "...." ] をそのまま貼れる
const STAGES = [
  {
    name: "STAGE 1",
    hp: 18,
    map: [
      "1111111111",
      "1P00000001",
      "1011111101",
      "1000000001",
      "1011111101",
      "1000000001",
      "1011111101",
      "10000000G1",
      "1011111101",
      "1111111111",
    ],
  },
  // ここに editor の出力をどんどん追加
];

// ====== 状態 ======
let stageIndex = 0;

let grid = [];
let w = 0, h = 0;
let player = { x: 1, y: 1 };
let goal = { x: 1, y: 1 };

let hp = 0;
let steps = 0;
let status = "探索中";
let hasKey = false;

// ====== DOM ======
const elBoard = document.getElementById("board");
const elHp = document.getElementById("hp");
const elSteps = document.getElementById("steps");
const elStatus = document.getElementById("status");

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
  hasKey = false;

  // P/G を探して床に置換
  let foundP = false, foundG = false;

  for (let y=0; y<h; y++){
    for (let x=0; x<w; x++){
      const c = grid[y][x];
      if (c === CELL.PLAYER){
        player = { x, y };
        grid[y][x] = CELL.FLOOR;
        foundP = true;
      }
      if (c === CELL.GOAL){
        goal = { x, y };
        grid[y][x] = CELL.FLOOR; // ゴールは床として扱い、描画だけGにする
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

  parseStage(stage);

  hp = stage.hp;
  steps = 0;
  setStatus(`探索中: ${stage.name}`);
  render();
}

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

function onEnterTile(x,y){
  const t = tileAt(x,y);

  if (t === CELL.KEY) {
    hasKey = true;
    setTile(x,y, CELL.FLOOR);
  }
  if (t === CELL.DOOR && hasKey) {
    setTile(x,y, CELL.FLOOR); // 開けたら床に
  }
}

function checkGoalOrDead(){
  if (player.x === goal.x && player.y === goal.y) {
    setStatus(`クリア！: ${STAGES[stageIndex].name}  (Nで次へ)`);
    return;
  }
  if (hp <= 0) {
    setStatus(`力尽きた…: ${STAGES[stageIndex].name}  (Rで再挑戦)`);
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
  if (t === CELL.DOOR && !hasKey) return;

  // ブロック：押せるなら押して進む
  if (t === CELL.BLOCK) {
    const bx = nx + delta.dx;
    const by = ny + delta.dy;
    const bt = tileAt(bx, by);

    // 押し先が床のみOK
    if (bt === CELL.FLOOR) {
      setTile(bx, by, CELL.BLOCK);
      setTile(nx, ny, CELL.FLOOR);

      player.x = nx; player.y = ny;

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
  elStatus.textContent = hasKey ? `${status} 🔑` : status;

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
});

// 既存ボタン
document.getElementById("restart").addEventListener("click", ()=>loadStage(stageIndex));
document.getElementById("new").addEventListener("click", ()=>loadStage(stageIndex + 1));

// 起動
loadStage(0);
