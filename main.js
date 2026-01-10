// ====== 設定 ======
const SIZE = { w: 13, h: 17 };
const START_HP = 20;

// 0=床, 1=壁
function generateMaze(w, h) {
  // まず全部壁
  const g = Array.from({ length: h }, () => Array(w).fill(1));

  // 迷路生成（簡易：穴掘り法の雰囲気）
  // 奇数座標を通路にして、2マスずつ掘る
  function inBounds(x, y) { return x > 0 && y > 0 && x < w - 1 && y < h - 1; }
  function shuffle(a){ for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

  const sx = 1, sy = 1;
  g[sy][sx] = 0;

  const stack = [{ x: sx, y: sy }];
  const dirs = [
    { dx: 0, dy: -2 }, { dx: 2, dy: 0 }, { dx: 0, dy: 2 }, { dx: -2, dy: 0 }
  ];

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const candidates = shuffle(dirs.slice()).filter(d => {
      const nx = cur.x + d.dx, ny = cur.y + d.dy;
      return inBounds(nx, ny) && g[ny][nx] === 1;
    });

    if (!candidates.length) { stack.pop(); continue; }
    const d = candidates[0];
    const nx = cur.x + d.dx, ny = cur.y + d.dy;
    // 間の壁を壊す
    g[cur.y + d.dy/2][cur.x + d.dx/2] = 0;
    g[ny][nx] = 0;
    stack.push({ x: nx, y: ny });
  }

  // ちょっとだけランダムに穴を増やして遊びやすく
  for (let i=0;i<Math.floor((w*h)*0.04);i++){
    const x = 1 + Math.floor(Math.random()*(w-2));
    const y = 1 + Math.floor(Math.random()*(h-2));
    g[y][x] = 0;
  }

  return g;
}

// ====== 状態 ======
let maze, player, goal, hp, steps, status;

const elBoard = document.getElementById("board");
const elHp = document.getElementById("hp");
const elSteps = document.getElementById("steps");
const elStatus = document.getElementById("status");

function setStatus(text){ status = text; elStatus.textContent = text; }

function init(newMap=false){
  if (!maze || newMap) maze = generateMaze(SIZE.w, SIZE.h);

  player = { x: 1, y: 1 };
  goal = { x: SIZE.w - 2, y: SIZE.h - 2 };

  // ゴールが壁なら床に
  maze[goal.y][goal.x] = 0;
  maze[player.y][player.x] = 0;

  hp = START_HP;
  steps = 0;
  setStatus("探索中");
  render();
}

function canMove(x,y){
  return maze[y] && maze[y][x] === 0;
}

function tryMove(dir){
  if (status !== "探索中") return;

  const delta = {
    up:    {dx:0, dy:-1},
    down:  {dx:0, dy: 1},
    left:  {dx:-1,dy: 0},
    right: {dx: 1,dy: 0},
  }[dir];
  if (!delta) return;

  const nx = player.x + delta.dx;
  const ny = player.y + delta.dy;

  if (!canMove(nx, ny)) return; // 壁

  player.x = nx; player.y = ny;
  steps += 1;
  hp -= 1;

  if (player.x === goal.x && player.y === goal.y) {
    setStatus("クリア！");
  } else if (hp <= 0) {
    hp = 0;
    setStatus("力尽きた…");
  }

  render();
}

function render(){
  elHp.textContent = String(hp);
  elSteps.textContent = String(steps);

  elBoard.style.setProperty("--w", SIZE.w);
  elBoard.style.setProperty("--h", SIZE.h);

  // DOMを作り直す（最小実装）
  elBoard.innerHTML = "";
  for (let y=0;y<SIZE.h;y++){
    for (let x=0;x<SIZE.w;x++){
      const cell = document.createElement("div");
      cell.className = "cell " + (maze[y][x] === 1 ? "wall" : "floor");

      if (x === goal.x && y === goal.y) {
        cell.className = "cell goal";
        cell.textContent = "G";
      }
      if (x === player.x && y === player.y) {
        cell.className = "cell player";
        cell.textContent = "P";
      }
      if (status === "力尽きた…" && x === player.x && y === player.y){
        cell.className = "cell dead";
        cell.textContent = "X";
      }

      elBoard.appendChild(cell);
    }
  }
}

// ====== 操作 ======
document.querySelectorAll("[data-move]").forEach(btn=>{
  btn.addEventListener("click", () => tryMove(btn.dataset.move));
});

// キーボード（PCでも一応）
window.addEventListener("keydown", (e)=>{
  const map = { ArrowUp:"up", ArrowDown:"down", ArrowLeft:"left", ArrowRight:"right" };
  const dir = map[e.key];
  if (dir) { e.preventDefault(); tryMove(dir); }
});

// スワイプ（スマホ）
let touchStart = null;
window.addEventListener("touchstart", (e)=>{
  if (!e.touches?.length) return;
  const t = e.touches[0];
  touchStart = { x: t.clientX, y: t.clientY };
}, { passive: true });

window.addEventListener("touchend", (e)=>{
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  touchStart = null;

  const absX = Math.abs(dx), absY = Math.abs(dy);
  if (Math.max(absX, absY) < 24) return; // ちょいスワイプ無視

  if (absX > absY) tryMove(dx > 0 ? "right" : "left");
  else tryMove(dy > 0 ? "down" : "up");
}, { passive: true });

// ボタン
document.getElementById("restart").addEventListener("click", ()=>init(false));
document.getElementById("new").addEventListener("click", ()=>init(true));

// 起動
init(true);
