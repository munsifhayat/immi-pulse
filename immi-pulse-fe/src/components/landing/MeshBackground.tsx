"use client";

import { useEffect, useRef, useCallback } from "react";

type Variant = "hero" | "fullscreen";

interface Building {
  x: number;
  width: number;
  height: number;
  baseHeight: number;
  swayOffset: number;
  swaySpeed: number;
  windows: WindowPane[];
}

interface WindowPane {
  row: number;
  col: number;
  brightness: number;
  targetBrightness: number;
  baseBrightness: number;
  speed: number;
  delay: number;
  hue: number;
  pulsePhase: number;
  screenX: number;
  screenY: number;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateBuildings(canvasWidth: number, canvasHeight: number): Building[] {
  const rand = mulberry32(42);
  const buildings: Building[] = [];
  const maxH = canvasHeight * 0.52;
  const minH = canvasHeight * 0.1;

  let x = -20;
  while (x < canvasWidth + 20) {
    const width = 40 + rand() * 65;

    const centerDist = Math.abs((x + width / 2) / canvasWidth - 0.5) * 2;
    const envelope = 1 - centerDist * centerDist * 0.55;

    const isTall = rand() > 0.45;
    const baseHeight = isTall
      ? minH + rand() * (maxH - minH)
      : minH + rand() * (maxH * 0.45 - minH);
    const height = baseHeight * envelope;

    const windowCols = Math.max(1, Math.floor((width - 12) / 15));
    const windowRows = Math.max(1, Math.floor((height - 16) / 18));

    const windows: WindowPane[] = [];
    for (let row = 0; row < windowRows; row++) {
      for (let col = 0; col < windowCols; col++) {
        const isLit = rand() > 0.25;
        const base = isLit ? 0.12 + rand() * 0.5 : 0;
        windows.push({
          row,
          col,
          brightness: isLit ? 0.08 + rand() * 0.4 : 0,
          targetBrightness: base,
          baseBrightness: base,
          speed: 0.003 + rand() * 0.014,
          delay: rand() * 500,
          hue: rand() > 0.6 ? 1 : 0,
          pulsePhase: rand() * Math.PI * 2,
          screenX: 0,
          screenY: 0,
        });
      }
    }

    buildings.push({
      x,
      width,
      height,
      baseHeight: height,
      swayOffset: rand() * Math.PI * 2,
      swaySpeed: 0.3 + rand() * 0.4,
      windows,
    });
    x += width + 1 + rand() * 5;
  }

  return buildings;
}

const MOUSE_RADIUS = 180;

function drawScene(
  ctx: CanvasRenderingContext2D,
  buildings: Building[],
  w: number,
  h: number,
  time: number,
  variant: Variant,
  mouseX: number,
  mouseY: number
) {
  ctx.clearRect(0, 0, w, h);

  const baseY = h;
  const isHero = variant === "hero";
  const hasMouse = mouseX >= 0 && mouseY >= 0;
  const timeSec = time * 0.001;

  // Atmospheric glow
  const glow = ctx.createRadialGradient(w * 0.5, h * 0.78, 0, w * 0.5, h * 0.78, w * 0.5);
  glow.addColorStop(0, "rgba(45, 212, 191, 0.05)");
  glow.addColorStop(0.5, "rgba(45, 212, 191, 0.015)");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Mouse cursor glow
  if (hasMouse && mouseY > h * 0.4) {
    const r = MOUSE_RADIUS * 1.6;
    const cursorGlow = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, r);
    cursorGlow.addColorStop(0, "rgba(45, 212, 191, 0.06)");
    cursorGlow.addColorStop(0.4, "rgba(45, 212, 191, 0.025)");
    cursorGlow.addColorStop(1, "transparent");
    ctx.fillStyle = cursorGlow;
    ctx.fillRect(mouseX - r, mouseY - r, r * 2, r * 2);
  }

  // Layers
  const layers = [
    { scale: 0.6, offsetY: 25, offsetX: 30, dimming: 0.18 },
    { scale: 1, offsetY: 0, offsetX: 0, dimming: 1 },
  ];

  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li];
    const isFront = li === 1;

    for (const building of buildings) {
      // Gentle breathing sway on building height
      const breathe = Math.sin(timeSec * building.swaySpeed + building.swayOffset) * 0.012;
      const animHeight = building.baseHeight * (1 + breathe);

      const bx = building.x * layer.scale + layer.offsetX;
      const bw = building.width * layer.scale;
      const bh = animHeight * layer.scale;
      const by = baseY - bh - layer.offsetY;

      // Check if mouse is near this building for edge glow
      const buildingCenterX = bx + bw / 2;
      const buildingCenterY = by + bh / 2;
      let buildingMouseProximity = 0;
      if (hasMouse && isFront) {
        const dx = buildingCenterX - mouseX;
        const dy = buildingCenterY - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS * 1.5) {
          buildingMouseProximity = 1 - dist / (MOUSE_RADIUS * 1.5);
        }
      }

      // Building body
      if (!isFront) {
        ctx.fillStyle = `rgba(8, 28, 26, ${layer.dimming})`;
      } else {
        const grad = ctx.createLinearGradient(bx, by, bx, baseY);
        const topBright = Math.min(38 + buildingMouseProximity * 15, 55);
        const topGreen = Math.min(35 + buildingMouseProximity * 12, 50);
        grad.addColorStop(0, `rgba(${Math.round(14 + buildingMouseProximity * 6)}, ${Math.round(topBright)}, ${Math.round(topGreen)}, 0.95)`);
        grad.addColorStop(1, "rgba(6, 20, 18, 0.98)");
        ctx.fillStyle = grad;
      }

      ctx.beginPath();
      ctx.moveTo(bx, baseY);
      ctx.lineTo(bx, by + 2);
      ctx.lineTo(bx + 1.5, by);
      ctx.lineTo(bx + bw - 1.5, by);
      ctx.lineTo(bx + bw, by + 2);
      ctx.lineTo(bx + bw, baseY);
      ctx.closePath();
      ctx.fill();

      // Edge highlight
      if (isFront) {
        const edgeAlpha = 0.05 + buildingMouseProximity * 0.12;
        ctx.strokeStyle = `rgba(45, 212, 191, ${edgeAlpha})`;
        ctx.lineWidth = 0.5 + buildingMouseProximity * 0.5;
        ctx.beginPath();
        ctx.moveTo(bx, baseY);
        ctx.lineTo(bx, by + 2);
        ctx.lineTo(bx + 1.5, by);
        ctx.lineTo(bx + bw - 1.5, by);
        ctx.lineTo(bx + bw, by + 2);
        ctx.stroke();
      }

      if (!isFront) continue;

      // Windows
      const winW = 8;
      const winH = 11;
      const spacingX = 15;
      const spacingY = 18;
      const cols = Math.max(1, Math.floor((bw - 12) / spacingX));
      const startX = bx + (bw - (cols * spacingX - (spacingX - winW))) / 2;
      const startY = by + 12;

      for (const win of building.windows) {
        const wx = startX + win.col * spacingX;
        const wy = startY + win.row * spacingY;

        win.screenX = wx + winW / 2;
        win.screenY = wy + winH / 2;

        if (wy + winH > baseY - 3) continue;

        // Mouse proximity boost
        let mouseBoost = 0;
        if (hasMouse) {
          const dx = win.screenX - mouseX;
          const dy = win.screenY - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MOUSE_RADIUS) {
            const proximity = 1 - dist / MOUSE_RADIUS;
            mouseBoost = proximity * proximity * 1.0;
          }
        }

        // Ambient pulse: windows gently breathe even without mouse
        const pulse = Math.sin(timeSec * 0.8 + win.pulsePhase) * 0.5 + 0.5;
        const ambientPulse = win.baseBrightness * (0.7 + pulse * 0.3);

        // Occasional toggle
        const elapsed = time - win.delay;
        if (elapsed > 0) {
          const wave = Math.sin(elapsed * win.speed * 0.001 + win.col * 2.1 + win.row * 3.7);
          if (wave > 0.94) {
            win.baseBrightness = win.baseBrightness > 0.08 ? 0 : 0.2 + Math.random() * 0.5;
            if (win.baseBrightness > 0) {
              win.hue = Math.random() > 0.6 ? 1 : 0;
              win.pulsePhase = Math.random() * Math.PI * 2;
            }
          }
        }

        win.targetBrightness = Math.max(ambientPulse, mouseBoost);

        const lerpSpeed = win.targetBrightness > win.brightness ? 0.1 : 0.03;
        win.brightness += (win.targetBrightness - win.brightness) * lerpSpeed;

        if (win.brightness < 0.015) continue;

        const alpha = win.brightness * (isHero ? 0.75 : 0.6);

        let r: number, g: number, b: number;
        if (mouseBoost > 0.2 && mouseBoost >= ambientPulse) {
          r = 45; g = 212; b = 191;
        } else if (win.hue > 0.5) {
          r = 45; g = 212; b = 191;
        } else {
          r = 255; g = 195; b = 90;
        }

        // Glow
        const gs = 3 + win.brightness * 5;
        const wGlow = ctx.createRadialGradient(
          wx + winW / 2, wy + winH / 2, 0,
          wx + winW / 2, wy + winH / 2, gs + winW
        );
        wGlow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.35})`);
        wGlow.addColorStop(1, "transparent");
        ctx.fillStyle = wGlow;
        ctx.fillRect(wx - gs, wy - gs, winW + gs * 2, winH + gs * 2);

        // Pane
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fillRect(wx, wy, winW, winH);
      }
    }
  }

  // Ground glow
  const groundGlow = ctx.createLinearGradient(0, baseY - 2, 0, baseY);
  groundGlow.addColorStop(0, "rgba(45, 212, 191, 0.07)");
  groundGlow.addColorStop(1, "transparent");
  ctx.fillStyle = groundGlow;
  ctx.fillRect(0, baseY - 2, w, 2);
}

type Props = { variant?: Variant };

export function MeshBackground({ variant = "fullscreen" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buildingsRef = useRef<Building[]>([]);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const mouseRef = useRef<{ x: number; y: number }>({ x: -1, y: -1 });

  const setup = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);

    buildingsRef.current = generateBuildings(rect.width, rect.height);
  }, []);

  useEffect(() => {
    setup();
    startTimeRef.current = performance.now();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();

    function animate() {
      const time = performance.now() - startTimeRef.current;
      const { x: mx, y: my } = mouseRef.current;
      drawScene(ctx!, buildingsRef.current, rect.width, rect.height, time, variant, mx, my);
      animFrameRef.current = requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => setup();
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [variant, setup]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1, y: -1 };
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const isHero = variant === "hero";

  return (
    <div className="pointer-events-none absolute inset-0 h-full w-full">
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ display: "block" }}
      />
      {isHero ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_95%_75%_at_50%_18%,rgba(3,15,14,0)_0%,rgba(3,15,14,0.35)_55%,rgba(3,15,14,0.65)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#030f0e]/35" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_50%_35%,transparent_0%,#030f0e_78%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#030f0e]/20 via-transparent to-[#030f0e]/95" />
        </>
      )}
    </div>
  );
}
