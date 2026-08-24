"use client";

import React, { useEffect, useRef } from "react";

/**
 * TopographicScene
 * 
 * High-visibility 3D topological security landscape occupying Y = 48% -> 100%
 * of the hero viewport. Features three distinct depth planes (0.08 distant,
 * 0.16 midground, 0.26 foreground), subtle cyan technical glow (#00D9FF),
 * smooth continuous 8-16s undulating waves, and sparse traveling nodes.
 */
export default function TopographicScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // HiDPI Canvas Scaling
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.parentElement?.clientWidth || window.innerWidth;
      const height = canvas.parentElement?.clientHeight || window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // 3D Grid Parameters
    const rows = 28; // Depth slices (Z)
    const cols = 48; // Width slices (X)
    const spacingX = 46;
    const spacingZ = 34;

    // Smooth Camera & Cursor Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetCameraX = 0;
    let targetCameraY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (prefersReducedMotion) return;
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      mouseX = (e.clientX - halfW) / halfW;
      mouseY = (e.clientY - halfH) / halfH;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // Sparse Traveling Network Nodes (10 max, clearly visible)
    const nodes: {
      r: number;
      colProgress: number;
      speed: number;
      pulseOffset: number;
      type: "deterministic" | "ai";
    }[] = [
      { r: 7, colProgress: 6, speed: 0.016, pulseOffset: 0.3, type: "deterministic" },
      { r: 11, colProgress: 14, speed: 0.022, pulseOffset: 1.5, type: "ai" },
      { r: 16, colProgress: 24, speed: 0.018, pulseOffset: 2.4, type: "deterministic" },
      { r: 9, colProgress: 32, speed: 0.014, pulseOffset: 3.7, type: "ai" },
      { r: 21, colProgress: 8, speed: 0.024, pulseOffset: 0.9, type: "deterministic" },
      { r: 14, colProgress: 38, speed: 0.017, pulseOffset: 4.3, type: "deterministic" },
      { r: 23, colProgress: 20, speed: 0.026, pulseOffset: 5.2, type: "ai" },
      { r: 18, colProgress: 28, speed: 0.02, pulseOffset: 3.1, type: "deterministic" },
      { r: 25, colProgress: 12, speed: 0.025, pulseOffset: 1.9, type: "deterministic" },
      { r: 24, colProgress: 34, speed: 0.019, pulseOffset: 4.0, type: "ai" },
    ];

    let time = 0;

    // 3D Perspective Projection
    const project3D = (
      gx: number,
      elevation: number,
      gz: number,
      width: number,
      height: number
    ) => {
      const fov = 380;
      const cameraZ = 200;
      // Horizon starts around Y = 48% of the hero
      const horizonY = height * 0.48;
      const cameraHeight = 140 + targetCameraY * 16;
      const cameraX = targetCameraX * 30;

      const px = gx - cameraX;
      const py = cameraHeight - elevation;
      const pz = gz + cameraZ;

      if (pz <= 10) return null;

      const scale = fov / pz;
      const screenX = width / 2 + px * scale;
      const screenY = horizonY + py * scale;

      return { x: screenX, y: screenY, scale, pz };
    };

    const render = () => {
      const width = canvas.parentElement?.clientWidth || window.innerWidth;
      const height = canvas.parentElement?.clientHeight || window.innerHeight;

      if (!prefersReducedMotion) {
        // Continuous, visible 8-16s movement cycle
        time += 0.009;
        targetCameraX += (mouseX - targetCameraX) * 0.035;
        targetCameraY += (mouseY - targetCameraY) * 0.035;

        // Advance traveling nodes along contour paths
        for (const node of nodes) {
          node.colProgress = (node.colProgress + node.speed) % (cols - 2);
        }
      }

      ctx.clearRect(0, 0, width, height);

      // Subtle technical atmospheric floor glow in the lower quadrant
      const floorAura = ctx.createRadialGradient(
        width / 2,
        height * 0.78,
        40,
        width / 2,
        height * 0.82,
        width * 0.65
      );
      floorAura.addColorStop(0, "rgba(6, 182, 212, 0.05)");
      floorAura.addColorStop(0.6, "rgba(16, 185, 129, 0.02)");
      floorAura.addColorStop(1, "rgba(10, 12, 16, 0)");
      ctx.fillStyle = floorAura;
      ctx.fillRect(0, height * 0.42, width, height * 0.58);

      // Compute grid points matrix
      const grid3D: ({ x: number; y: number; scale: number; pz: number } | null)[][] = [];

      for (let r = 0; r < rows; r++) {
        grid3D[r] = [];
        const gz = r * spacingZ + 55;

        for (let c = 0; c < cols; c++) {
          const gx = (c - cols / 2) * spacingX;

          // Multi-harmonic gentle organic terrain elevation waves
          let elevation = 0;
          if (!prefersReducedMotion) {
            const wave1 = Math.sin(gz * 0.013 - time * 1.2) * 16;
            const wave2 = Math.cos(gx * 0.009 + time * 0.7) * Math.sin(gz * 0.008) * 12;
            const wave3 = Math.sin((gx + gz) * 0.007 + time * 0.5) * 8;
            const mouseEffect =
              Math.exp(-((gx - targetCameraX * 160) ** 2 + (gz - 280) ** 2) / 45000) * 18;
            elevation = wave1 + wave2 + wave3 + mouseEffect;
          } else {
            elevation = Math.sin(gz * 0.013) * 12;
          }

          const pt = project3D(gx, elevation, gz, width, height);
          grid3D[r][c] = pt;
        }
      }

      // Draw Topographic Contours across 3 Depth Planes:
      // Background (r < 8): 0.08 - 0.12
      // Midground (8 <= r < 18): 0.14 - 0.20
      // Foreground (r >= 18): 0.20 - 0.28
      ctx.lineWidth = 0.95;

      for (let r = 0; r < rows; r++) {
        const depthRatio = r / (rows - 1);
        
        let lineAlpha: number;
        if (depthRatio < 0.3) {
          // Distant plane: 0.08 - 0.12
          lineAlpha = 0.08 + depthRatio * 0.13;
        } else if (depthRatio < 0.65) {
          // Midground plane: 0.14 - 0.20
          lineAlpha = 0.14 + (depthRatio - 0.3) * 0.17;
        } else {
          // Foreground plane: 0.20 - 0.28
          lineAlpha = 0.20 + (depthRatio - 0.65) * 0.23;
        }

        // Selected contours have soft technical cyan glow (#00D9FF)
        const hasGlow = r % 4 === 0 || r === rows - 1;
        if (hasGlow) {
          ctx.shadowColor = "rgba(0, 217, 255, 0.4)";
          ctx.shadowBlur = 6;
        } else {
          ctx.shadowBlur = 0;
        }

        // 1. Horizontal contour lines (Latitude)
        ctx.beginPath();
        let first = true;
        for (let c = 0; c < cols; c++) {
          const pt = grid3D[r][c];
          if (!pt) continue;

          if (first) {
            ctx.moveTo(pt.x, pt.y);
            first = false;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }
        ctx.strokeStyle = `rgba(0, 217, 255, ${lineAlpha})`;
        ctx.stroke();

        // 2. Vertical depth ties (Longitude: opacity ~0.06 - 0.14)
        for (let c = 0; c < cols; c += 2) {
          const curr = grid3D[r][c];
          const next = r + 1 < rows ? grid3D[r + 1][c] : null;
          if (curr && next) {
            const tieAlpha = lineAlpha * 0.55;
            ctx.beginPath();
            ctx.moveTo(curr.x, curr.y);
            ctx.lineTo(next.x, next.y);
            ctx.strokeStyle = `rgba(16, 185, 129, ${tieAlpha})`;
            ctx.stroke();
          }
        }
      }

      ctx.shadowBlur = 0;

      // Render Traveling Topological Security Nodes (8-12 nodes, opacity 0.25 - 0.55)
      for (const node of nodes) {
        const colIdx = Math.floor(node.colProgress);
        const colFrac = node.colProgress - colIdx;
        
        const pt1 = grid3D[node.r]?.[colIdx];
        const pt2 = grid3D[node.r]?.[colIdx + 1];
        if (!pt1 || !pt2) continue;

        const screenX = pt1.x + (pt2.x - pt1.x) * colFrac;
        const screenY = pt1.y + (pt2.y - pt1.y) * colFrac;
        const scale = pt1.scale + (pt2.scale - pt1.scale) * colFrac;

        const depthRatio = node.r / (rows - 1);
        const pulse = prefersReducedMotion
          ? 1
          : 0.75 + 0.25 * Math.sin(time * 2.5 + node.pulseOffset);

        // Node opacity: 0.25 - 0.55
        const nodeAlpha = Math.min(0.55, (0.22 + Math.pow(depthRatio, 1.1) * 0.33) * pulse);
        const radius = Math.max(1.6, 2.8 * scale * pulse);

        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);

        if (node.type === "deterministic") {
          ctx.fillStyle = `rgba(16, 185, 129, ${nodeAlpha})`;
          ctx.shadowColor = "rgba(16, 185, 129, 0.6)";
          ctx.shadowBlur = 6 * scale;
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(0, 217, 255, ${nodeAlpha})`;
          ctx.shadowColor = "rgba(0, 217, 255, 0.7)";
          ctx.shadowBlur = 8 * scale;
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full block opacity-95 transition-opacity duration-1000"
      />
    </div>
  );
}
