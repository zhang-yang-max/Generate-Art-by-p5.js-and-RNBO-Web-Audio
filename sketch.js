// ====== RNBO/Audio 基础 ======
let audioCtx = null;
let device = null;

const hudState = () => document.getElementById('state');
const hudX = () => document.getElementById('vx');
const hudY = () => document.getElementById('vy');
const hudIn = () => document.getElementById('vin');

function setState(text, cls='warn'){
  const el = hudState(); el.textContent = text;
  el.className = cls;
}

async function initAudioAndRNBO() {
  // 1) 解锁 AudioContext
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state !== 'running') await audioCtx.resume();

  // 2) 检查运行时
  if (!window.RNBO) {
    setState('未加载 rnbo.min.js', 'bad');
    console.warn('[RNBO] runtime 未加载');
    return;
  }

  try {
    // 3) 载入 patch
    const res = await fetch('audio/patch.export.json', { cache: 'no-store' });
    if (!res.ok) { setState('找不到 patch.export.json', 'bad'); return; }
    const patcher = await res.json();

    // 4) 创建设备并连到输出
    device = await RNBO.createDevice({ context: audioCtx, patcher });
    device.node.connect(audioCtx.destination);

    // 5) 状态 OK
    setState('设备就绪', 'ok');
    console.log('[RNBO] ok. parameters:', Array.from(device.parameters).map(p => p.id));

  } catch (err) {
    setState('设备创建失败', 'bad');
    console.error('[RNBO] 初始化失败：', err);
  }
}

// ====== p5 交互：可拖拽小球，映射到 x1/y1，按住= in1 1 / 松开=0 ======
let ball = { x: 0.5, y: 0.5, r: 28, down: false, dragging:false };

function setup() {
  createCanvas(window.innerWidth, window.innerHeight);
  noStroke(); textFont('system-ui'); textSize(12);
  // 启动门
  document.getElementById('btnStart').addEventListener('pointerdown', async () => {
    await initAudioAndRNBO();
    document.getElementById('gate').style.display = 'none';
  }, {passive:true});
}

function windowResized(){ resizeCanvas(window.innerWidth, window.innerHeight); }

function draw() {
  background(20);

  // 画背景格
  push();
  stroke(35); strokeWeight(1);
  for (let i=0;i<width;i+=Math.max(40, width/12)) line(i,0,i,height);
  for (let j=0;j<height;j+=Math.max(40, height/12)) line(0,j,width,j);
  pop();

  // 画小球
  const cx = ball.x * width;
  const cy = ball.y * height;
  fill(ball.down ? '#ffd34d' : '#66a7ff');
  circle(cx, cy, ball.r*2);

  // HUD 数值
  hudX().textContent = ball.x.toFixed(2);
  hudY().textContent = ball.y.toFixed(2);
  hudIn().textContent = ball.down ? '1' : '0';

  // 把坐标写到 RNBO 参数（若存在）
  if (device) {
    const setParam = (id, v) => {
      const p = device.parametersById.get(id);
      if (p) p.value = v;
    };
    setParam('x1', ball.x);
    setParam('y1', ball.y);
  }
}

// 命中检测
function hitBall(px, py){
  const dx = px - ball.x * width;
  const dy = py - ball.y * height;
  return Math.hypot(dx, dy) <= ball.r;
}

// 统一指针事件——鼠标
function mousePressed(e){
  const hit = hitBall(mouseX, mouseY);
  ball.down = hit; ball.dragging = hit;
  if (hit) sendIn1(1);
}
function mouseDragged(e){
  if (!ball.dragging) return;
  ball.x = constrain(mouseX / width, 0, 1);
  ball.y = constrain(mouseY / height, 0, 1);
}
function mouseReleased(e){
  ball.down = false; ball.dragging = false;
  sendIn1(0);
}

// 统一指针事件——触摸
function touchStarted(e){
  const t = e.touches?.[0] || e.changedTouches?.[0];
  if (!t) return false;
  const x = t.clientX, y = t.clientY;
  const hit = hitBall(x, y);
  ball.down = hit; ball.dragging = hit;
  if (hit) sendIn1(1);
  return false;
}
function touchMoved(e){
  const t = e.touches?.[0];
  if (!t || !ball.dragging) return false;
  ball.x = constrain(t.clientX / width, 0, 1);
  ball.y = constrain(t.clientY / height, 0, 1);
  return false;
}
function touchEnded(e){
  ball.down = false; ball.dragging = false;
  sendIn1(0);
  return false;
}

// 向 RNBO inlet "in1" 发送开关（1/0）
function sendIn1(v){
  if (!device || !window.RNBO) return;
  // 用 RNBO.MessageEvent 构造一条消息事件，并调度出去
  const when = audioCtx ? audioCtx.currentTime : 0;   // 也可以用 device.context.currentTime
  const evt = new RNBO.MessageEvent(when, "in1", [Number(v)]);
  device.scheduleEvent(evt);
}

