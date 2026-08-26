import { useRef, useEffect } from 'react';

const CONFIG = {
  ROWS: 5,
  COLS: 5,
  DOT_RADIUS: 28,
  GAP: 14,
  COLORS: ['#ea6b6b', '#ffa8a8', '#8b9bff', '#6ba89b'] as const,
  TOUCH_RADIUS_MULTIPLIER: 1.6,
  MAX_PARTICLES: 300,
};

const SCORING: Record<number, number> = {
  2: -300,
  3: 50,
  4: 70,
  5: 90,
  6: 110,
  7: 130,
  8: 150,
  9: 170,
};

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface Dot {
  color: number;
  y: number;
}

interface Cell {
  r: number;
  c: number;
}

interface Pos {
  x: number;
  y: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  g: number;
  b: number;
  life: number;
  size: number;
}

interface GameInternals {
  grid: Dot[][];
  chain: Cell[];
  chainSet: Set<string>;
  dragging: boolean;
  lastPos: Pos | null;
  score: number;
  layoutCache: Pos[][];
  particles: Particle[];
  animationId: number;
  random: () => number;
  colorRGB: Record<string, number[]>;
}

// Safe accessors for noUncheckedIndexedAccess
function gridAt(s: GameInternals, r: number, c: number): Dot {
  return s.grid[r]![c]!;
}

function posAt(s: GameInternals, r: number, c: number): Pos {
  return s.layoutCache[r]![c]!;
}

interface Props {
  seed: number;
  onScoreChange: (score: number) => void;
  disabled: boolean;
}

export function DotonCanvas({ seed, onScoreChange, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameInternals>({
    grid: [],
    chain: [],
    chainSet: new Set(),
    dragging: false,
    lastPos: null,
    score: 0,
    layoutCache: [],
    particles: [],
    animationId: 0,
    random: seededRandom(seed),
    colorRGB: {},
  });
  const disabledRef = useRef(disabled);
  const onScoreChangeRef = useRef(onScoreChange);

  disabledRef.current = disabled;
  onScoreChangeRef.current = onScoreChange;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const s = stateRef.current;
    s.random = seededRandom(seed);
    s.score = 0;
    s.chain = [];
    s.chainSet.clear();
    s.particles = [];
    s.dragging = false;
    s.lastPos = null;

    CONFIG.COLORS.forEach(color => {
      const v = parseInt(color.slice(1), 16);
      s.colorRGB[color] = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
    });

    resizeCanvas(canvas, s);
    fillGrid(s);

    const loop = () => {
      draw(canvas, s);
      s.animationId = requestAnimationFrame(loop);
    };
    s.animationId = requestAnimationFrame(loop);

    const getPos = (e: MouseEvent | TouchEvent): Pos => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      if ('touches' in e) {
        const touch = e.touches[0];
        if (!touch) return { x: 0, y: 0 };
        return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
      }
      return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    };

    const nearestCell = (p: Pos, isTouch = false): Cell | null => {
      let nearest: Cell | null = null;
      let minDist = Infinity;
      const hitRadius = isTouch ? CONFIG.DOT_RADIUS * CONFIG.TOUCH_RADIUS_MULTIPLIER : CONFIG.DOT_RADIUS;
      for (let r = 0; r < CONFIG.ROWS; r++) {
        for (let c = 0; c < CONFIG.COLS; c++) {
          const cp = posAt(s, r, c);
          const dot = gridAt(s, r, c);
          const d = Math.hypot(p.x - cp.x, p.y - (cp.y + dot.y));
          if (d < hitRadius && d < minDist) {
            minDist = d;
            nearest = { r, c };
          }
        }
      }
      return nearest;
    };

    const neighbors = (a: Cell, b: Cell) =>
      Math.abs(a.r - b.r) <= 1 && Math.abs(a.c - b.c) <= 1 && !(a.r === b.r && a.c === b.c);

    const onStart = (e: MouseEvent | TouchEvent) => {
      if (disabledRef.current) return;
      e.preventDefault();
      s.dragging = true;
      s.chain = [];
      s.chainSet.clear();
      const p = getPos(e);
      const isTouch = 'touches' in e;
      const cell = nearestCell(p, isTouch);
      if (cell) {
        s.chain.push(cell);
        s.chainSet.add(`${cell.r},${cell.c}`);
        if (isTouch && navigator.vibrate) navigator.vibrate(4);
      }
      s.lastPos = p;
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!s.dragging || disabledRef.current) return;
      e.preventDefault();
      const p = getPos(e);
      s.lastPos = p;
      const isTouch = 'touches' in e;
      const cell = nearestCell(p, isTouch);
      if (cell && s.chain.length > 0) {
        const last = s.chain[s.chain.length - 1];
        if (
          last &&
          neighbors(last, cell) &&
          gridAt(s, cell.r, cell.c).color === gridAt(s, last.r, last.c).color &&
          !s.chainSet.has(`${cell.r},${cell.c}`)
        ) {
          s.chain.push(cell);
          s.chainSet.add(`${cell.r},${cell.c}`);
          if (isTouch && navigator.vibrate) navigator.vibrate(3);
        }
      }
    };

    const onEnd = () => {
      if (!s.dragging || disabledRef.current) return;
      s.dragging = false;
      s.lastPos = null;
      if (s.chain.length >= 2) {
        processChain(s, onScoreChangeRef.current);
      }
      s.chain = [];
      s.chainSet.clear();
    };

    canvas.addEventListener('mousedown', onStart);
    canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    const handleResize = () => resizeCanvas(canvas, s);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(s.animationId);
      canvas.removeEventListener('mousedown', onStart);
      canvas.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('resize', handleResize);
    };
  }, [seed]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        touchAction: 'none',
        borderRadius: 24,
        background: '#12182b',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 80px rgba(107,123,247,0.1)',
        cursor: disabled ? 'default' : 'crosshair',
        maxWidth: '100%',
        width: '100%',
      }}
    />
  );
}

function resizeCanvas(canvas: HTMLCanvasElement, s: GameInternals) {
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    const maxSize = Math.min(window.innerWidth - 24, window.innerHeight - 200, 500);
    canvas.width = maxSize;
    canvas.height = maxSize;
  } else {
    const gridSize = CONFIG.COLS * CONFIG.DOT_RADIUS * 2 + (CONFIG.COLS - 1) * CONFIG.GAP;
    const canvasSize = Math.min(gridSize + (CONFIG.DOT_RADIUS + 10) * 2, 500);
    canvas.width = canvasSize;
    canvas.height = canvasSize;
  }

  const totalWidth = CONFIG.COLS * CONFIG.DOT_RADIUS * 2 + (CONFIG.COLS - 1) * CONFIG.GAP;
  const startX = (canvas.width - totalWidth) / 2 + CONFIG.DOT_RADIUS;
  const startY = (canvas.height - totalWidth) / 2 + CONFIG.DOT_RADIUS;

  s.layoutCache = [];
  for (let r = 0; r < CONFIG.ROWS; r++) {
    const row: Pos[] = [];
    for (let c = 0; c < CONFIG.COLS; c++) {
      row.push({
        x: startX + c * (CONFIG.DOT_RADIUS * 2 + CONFIG.GAP),
        y: startY + r * (CONFIG.DOT_RADIUS * 2 + CONFIG.GAP),
      });
    }
    s.layoutCache.push(row);
  }
}

function fillGrid(s: GameInternals) {
  const hasPair = (): boolean => {
    for (let r = 0; r < CONFIG.ROWS; r++) {
      for (let c = 0; c < CONFIG.COLS; c++) {
        const col = gridAt(s, r, c).color;
        if (r + 1 < CONFIG.ROWS && gridAt(s, r + 1, c).color === col) return true;
        if (c + 1 < CONFIG.COLS && gridAt(s, r, c + 1).color === col) return true;
        if (r + 1 < CONFIG.ROWS && c + 1 < CONFIG.COLS && gridAt(s, r + 1, c + 1).color === col) return true;
        if (r + 1 < CONFIG.ROWS && c - 1 >= 0 && gridAt(s, r + 1, c - 1).color === col) return true;
      }
    }
    return false;
  };

  let attempts = 0;
  do {
    if (attempts++ > 100) break;
    s.grid = [];
    for (let r = 0; r < CONFIG.ROWS; r++) {
      const row: Dot[] = [];
      for (let c = 0; c < CONFIG.COLS; c++) {
        row.push({ color: Math.floor(s.random() * CONFIG.COLORS.length), y: 0 });
      }
      s.grid.push(row);
    }
  } while (!hasPair());
}

function processChain(s: GameInternals, onScoreChange: (score: number) => void) {
  const chainLength = s.chain.length;
  let points: number;
  let explosion = false;

  if (chainLength < 10) {
    points = SCORING[chainLength] ?? 70;
  } else {
    points = 200 + (chainLength - 10) * 20;
    explosion = true;
  }

  if (navigator.vibrate) {
    if (chainLength >= 10) navigator.vibrate([40, 20, 40, 20, 30]);
    else if (chainLength >= 7) navigator.vibrate([15, 8, 15]);
    else if (chainLength >= 4) navigator.vibrate(10);
    else navigator.vibrate(5);
  }

  for (const c of s.chain) {
    const p = posAt(s, c.r, c.c);
    const colorStr = CONFIG.COLORS[gridAt(s, c.r, c.c).color];
    if (!colorStr) continue;
    const rgb = s.colorRGB[colorStr];
    if (!rgb) continue;
    const count = Math.min(chainLength + 5, 15);
    for (let i = 0; i < count; i++) {
      s.particles.push({
        x: p.x + (Math.random() - 0.5) * CONFIG.DOT_RADIUS,
        y: p.y + (Math.random() - 0.5) * CONFIG.DOT_RADIUS,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3 - 1,
        r: rgb[0] ?? 0, g: rgb[1] ?? 0, b: rgb[2] ?? 0,
        life: 1,
        size: Math.random() * 3 + 2,
      });
    }
  }

  if (s.particles.length > CONFIG.MAX_PARTICLES) {
    s.particles = s.particles.slice(-CONFIG.MAX_PARTICLES);
  }

  if (explosion) {
    for (let r = 0; r < CONFIG.ROWS; r++) {
      for (let c = 0; c < CONFIG.COLS; c++) {
        const p = posAt(s, r, c);
        const colorStr = CONFIG.COLORS[gridAt(s, r, c).color];
        if (!colorStr) continue;
        const rgb = s.colorRGB[colorStr];
        if (!rgb) continue;
        for (let i = 0; i < 5; i++) {
          s.particles.push({
            x: p.x + (Math.random() - 0.5) * CONFIG.DOT_RADIUS,
            y: p.y + (Math.random() - 0.5) * CONFIG.DOT_RADIUS,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4 - 1,
            r: rgb[0] ?? 0, g: rgb[1] ?? 0, b: rgb[2] ?? 0,
            life: 1,
            size: Math.random() * 3 + 2,
          });
        }
      }
    }
    fillGrid(s);
  } else {
    for (const c of s.chain) {
      gridAt(s, c.r, c.c).color = Math.floor(s.random() * CONFIG.COLORS.length);
    }
  }

  s.score = Math.max(0, s.score + points);
  onScoreChange(s.score);
}

function draw(canvas: HTMLCanvasElement, s: GameInternals) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx || !s.layoutCache.length || !s.grid.length) return;

  ctx.fillStyle = '#12182b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Chain line
  if (s.chain.length > 0) {
    const firstCell = s.chain[0]!;
    const firstColor = CONFIG.COLORS[gridAt(s, firstCell.r, firstCell.c).color] ?? '#fff';
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = firstColor;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 20;
    ctx.shadowColor = firstColor;
    ctx.beginPath();
    for (let i = 0; i < s.chain.length; i++) {
      const cell = s.chain[i]!;
      const p = posAt(s, cell.r, cell.c);
      const dot = gridAt(s, cell.r, cell.c);
      if (i === 0) ctx.moveTo(p.x, p.y + dot.y);
      else ctx.lineTo(p.x, p.y + dot.y);
    }
    if (s.lastPos) ctx.lineTo(s.lastPos.x, s.lastPos.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  // Dot shadows
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  for (let r = 0; r < CONFIG.ROWS; r++) {
    for (let c = 0; c < CONFIG.COLS; c++) {
      const p = posAt(s, r, c);
      const dot = gridAt(s, r, c);
      ctx.moveTo(p.x + 2 + CONFIG.DOT_RADIUS, p.y + dot.y + 3);
      ctx.arc(p.x + 2, p.y + dot.y + 3, CONFIG.DOT_RADIUS, 0, Math.PI * 2);
    }
  }
  ctx.fill();

  // Dots
  for (let r = 0; r < CONFIG.ROWS; r++) {
    for (let c = 0; c < CONFIG.COLS; c++) {
      const d = gridAt(s, r, c);
      const p = posAt(s, r, c);
      ctx.fillStyle = CONFIG.COLORS[d.color] ?? '#fff';
      ctx.beginPath();
      ctx.arc(p.x, p.y + d.y, CONFIG.DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Selection rings
  if (s.chainSet.size > 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    s.chainSet.forEach(key => {
      const parts = key.split(',');
      const r = Number(parts[0]);
      const c = Number(parts[1]);
      if (r >= CONFIG.ROWS || c >= CONFIG.COLS) return;
      const p = posAt(s, r, c);
      const dot = gridAt(s, r, c);
      ctx.moveTo(p.x + CONFIG.DOT_RADIUS + 5, p.y + dot.y);
      ctx.arc(p.x, p.y + dot.y, CONFIG.DOT_RADIUS + 5, 0, Math.PI * 2);
    });
    ctx.stroke();
  }

  // Particles
  s.particles = s.particles.filter(pt => {
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.vy += 0.15;
    pt.life -= 0.02;
    pt.size *= 0.98;
    return pt.life > 0;
  });

  if (s.particles.length > 0) {
    for (const pt of s.particles) {
      ctx.globalAlpha = pt.life;
      ctx.fillStyle = `rgb(${pt.r},${pt.g},${pt.b})`;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;
  }
}
