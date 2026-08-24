"use client";

import React, { useEffect, useRef } from "react";

/**
 * TopographicScene
 * 
 * Continuous, controlled 3D topological security landscape occupying the lower
 * 35-45% of the hero section. Begins softly under "TRUST EVERY DECISION." and
 * expands down with rich curved cyan/emerald contours, gentle undulating elevation
 * waves (8-20s period), and sparse traveling security nodes.
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
    const cols = 46; // Width slices (X)
    const spacingX = 46;
    const spacingZ = 32;

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

    // Sparse Traveling Network Nodes (10 max)
    const nodes: {
      r: number;
      colProgress: number;
      speed: number;
      pulseOffset: number;
      type: "deterministic" | "ai";
    }[] = [
      { r: 8, colProgress: 6, speed: 0.015, pulseOffset: 0.3, type: "deterministic" },
      { r: 12, colProgress: 14, speed: 0.02, pulseOffset: 1.5, type: "ai" },
      { r: 16, colProgress: 24, speed: 0.018, pulseOffset: 2.4, type: "deterministic" },
      { r: 10, colProgress: 32, speed: 0.012, pulseOffset: 3.7, type: "ai" },
      { r: 20, colProgress: 8, speed: 0.022, pulseOffset: 0.9, type: "deterministic" },
      { r: 14, colProgress: 38, speed: 0.016, pulseOffset: 4.3, type: "deterministic" },
      { r: 22, colProgress: 20, speed: 0.025, pulseOffset: 5.2, type: "ai" },
      { r: 18, colProgress: 28, speed: 0.019, pulseOffset: 3.1, type: "deterministic" },
      { r: 24, colProgress: 12, speed: 0.023, pulseOffset: 1.9, type: "deterministic" },
      { r: 23, colProgress: 34, speed: 0.017, pulseOffset: 4.0, type: "ai" },
    ];

    let time = 0;

    // 3D Perspective Projection Function
    const project3D = (
      gx: number,
      elevation: number,
      gz: number,
      width: number,
      height: number
    ) => {
      const fov = 380;
      const cameraZ = 200;
      // Horizon begins softly in the lower half of the hero (~48% of hero height)
      const horizonY = height * 0.48;
      const cameraHeight = 145 + targetCameraY * 16;
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
        // Continuous, graceful 8-16s wave progression rate
        time += 0.0075;
        targetCameraX += (mouseX - targetCameraX) * 0.03;
        targetCameraY += (mouseY - targetCameraY) * 0.03;

        // Advance traveling nodes along grid paths
        for (const node of nodes) {
          node.colProgress = (node.colProgress + node.speed) % (cols - 2);
        }
      }

      ctx.clearRect(0, 0, width, height);

      // Deep subtle technical atmosphere in lower half
      const floorAura = ctx.createRadialGradient(
        width / 2,
        height * 0.78,
        30,
        width / 2,
        height * 0.82,
        width * 0.65
      );
      floorAura.addColorStop(0, "rgba(6, 182, 212, 0.03)");
      floorAura.addColorStop(0.6, "rgba(16, 185, 129, 0.012)");
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

          // Multi-harmonic gentle organic terrain waves
          let elevation = 0;
          if (!prefersReducedMotion) {
            const wave1 = Math.sin(gz * 0.012 - time * 1.1) * 14;
            const wave2 = Math.cos(gx * 0.009 + time * 0.6) * Math.sin(gz * 0.008) * 11;
            const wave3 = Math.sin((gx + gz) * 0.007 + time * 0.4) * 6;
            const mouseEffect =
              Math.exp(-((gx - targetCameraX * 160) ** 2 + (gz - 280) ** 2) / 45000) * 16;
            elevation = wave1 + wave2 + wave3 + mouseEffect;
          } else {
            elevation = Math.sin(gz * 0.012) * 10;
          }

          const pt = project3D(gx, elevation, gz, width, height);
          grid3D[r][c] = pt;
        }
      }

      // Draw Topographic Contours with Soft Depth Scaling (0.02 Top -> 0.18 Bottom)
      ctx.lineWidth = 0.8;

      for (let r = 0; r < rows; r++) {
        const depthRatio = r / (rows - 1);
        
        // Depth-based opacity curve matching exact target:
        // Top: 0.02 - 0.04 | Middle: 0.07 - 0.12 | Bottom: 0.12 - 0.18
        const baseAlpha = 0.02 + Math.pow(depthRatio, 1.3) * 0.16;

        if (baseAlpha < 0.02) continue;

        // 1. Horizontal contour lines (Latitude)
        ctx.beginPath();
        let first = true;
        for (let c = 0; c < cols; c++) {
          const pt = grid3D[r][c];
          if (!pt) continue;
          
          // Soft horizontal center mask around upper typography
          let pointAlpha = baseAlpha;
          if (depthRatio < 0.45) {
            const centerDist = Math.abs(pt.x - width / 2) / (width / 2);
            // Attenuate slightly in middle of upper horizon to keep text clean
            pointAlpha *= (0.35 + 0.65 * Math.min(1, centerDist * 1.6));
          }

          if (first) {
            ctx.moveTo(pt.x, pt.y);
            first = false;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }
        ctx.strokeStyle = `rgba(6, 182, 212, ${baseAlpha})`;
        ctx.stroke();

        // 2. Vertical depth ties (Longitude: opacity ~0.03 - 0.08)
        for (let c = 0; c < cols; c += 2) {
          const curr = grid3D[r][c];
          const next = r + 1 < rows ? grid3D[r + 1][c] : null;
          if (curr && next) {
            const tieAlpha = baseAlpha * 0.48;
            ctx.beginPath();
            ctx.moveTo(curr.x, curr.y);
            ctx.lineTo(next.x, next.y);
            ctx.strokeStyle = `rgba(16, 185, 129, ${tieAlpha})`;
            ctx.stroke();
          }
        }
      }

      // Render Traveling Topological Security Nodes (8-12 nodes, opacity 0.15 - 0.35)
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
        if (depthRatio < 0.2) continue; // Keep far upper horizon uncluttered

        const pulse = prefersReducedMotion
          ? 1
          : 0.75 + 0.25 * Math.sin(time * 2.2 + node.pulseOffset);

        const nodeAlpha = Math.min(0.35, (0.12 + Math.pow(depthRatio, 1.2) * 0.23) * pulse);
        const radius = Math.max(1.4, 2.4 * scale * pulse);

        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);

        if (node.type === "deterministic") {
          ctx.fillStyle = `rgba(16, 185, 129, ${nodeAlpha})`;
          ctx.shadowColor = "rgba(16, 185, 129, 0.4)";
          ctx.shadowBlur = 4 * scale;
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(6, 182, 212, ${nodeAlpha})`;
          ctx.shadowColor = "rgba(6, 182, 212, 0.45)";
          ctx.shadowBlur = 5 * scale;
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
    <div
      className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent 0%, transparent 42%, rgba(0,0,0,0.4) 52%, rgba(0,0,0,0.85) 68%, rgba(0,0,0,1) 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, transparent 42%, rgba(0,0,0,0.4) 52%, rgba(0,0,0,0.85) 68%, rgba(0,0,0,1) 100%)",
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block transition-opacity duration-1000"
      />
    </div>
  );
}
