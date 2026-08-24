"use client";

import React, { useEffect, useRef } from "react";

/**
 * TopographicScene
 * 
 * High-performance 3D topological security landscape that resides exclusively in the
 * lower floor (~bottom 35-40%) of the hero section, completely below the headline and CTAs.
 * Features a soft atmospheric horizon fade and ultra-slow continuous movement.
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

    // Handle HiDPI Canvas Scaling
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

    // Landscape Grid Dimensions
    const rows = 24; // Depth slices (Z)
    const cols = 40; // Width slices (X)
    const spacingX = 52;
    const spacingZ = 34;

    // Mouse tracking for gentle perspective parallax
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

    // Subtle Sparse Topological Security Nodes (10 max)
    const nodes: {
      r: number;
      c: number;
      pulseOffset: number;
      type: "deterministic" | "ai";
    }[] = [
      { r: 7, c: 8, pulseOffset: 0.2, type: "deterministic" },
      { r: 11, c: 14, pulseOffset: 1.4, type: "ai" },
      { r: 15, c: 22, pulseOffset: 2.1, type: "deterministic" },
      { r: 9, c: 29, pulseOffset: 3.5, type: "ai" },
      { r: 18, c: 33, pulseOffset: 0.8, type: "deterministic" },
      { r: 13, c: 6, pulseOffset: 4.2, type: "deterministic" },
      { r: 20, c: 18, pulseOffset: 5.1, type: "ai" },
      { r: 16, c: 27, pulseOffset: 2.9, type: "deterministic" },
      { r: 22, c: 11, pulseOffset: 1.8, type: "deterministic" },
      { r: 21, c: 35, pulseOffset: 3.8, type: "ai" },
    ];

    let time = 0;

    // 3D Perspective Projection: Floor begins well below headline/CTAs
    const project3D = (
      gx: number,
      elevation: number,
      gz: number,
      width: number,
      height: number
    ) => {
      const fov = 340;
      const cameraZ = 190;
      // Horizon placed at ~68% of hero height (safely below buttons)
      const horizonY = height * 0.68;
      const cameraHeight = 110 + targetCameraY * 12;
      const cameraX = targetCameraX * 25;

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
        // Ultra-slow continuous organic motion (rate reduced 4x)
        time += 0.0035;
        targetCameraX += (mouseX - targetCameraX) * 0.025;
        targetCameraY += (mouseY - targetCameraY) * 0.025;
      }

      ctx.clearRect(0, 0, width, height);

      // Subtle atmospheric floor glow in the lower quadrant only
      const floorGlow = ctx.createRadialGradient(
        width / 2,
        height * 0.88,
        30,
        width / 2,
        height * 0.9,
        width * 0.55
      );
      floorGlow.addColorStop(0, "rgba(6, 182, 212, 0.025)");
      floorGlow.addColorStop(0.5, "rgba(16, 185, 129, 0.01)");
      floorGlow.addColorStop(1, "rgba(10, 12, 16, 0)");
      ctx.fillStyle = floorGlow;
      ctx.fillRect(0, height * 0.65, width, height * 0.35);

      // Compute grid points matrix
      const grid3D: ({ x: number; y: number; scale: number; pz: number } | null)[][] = [];

      for (let r = 0; r < rows; r++) {
        grid3D[r] = [];
        const gz = r * spacingZ + 50;

        for (let c = 0; c < cols; c++) {
          const gx = (c - cols / 2) * spacingX;

          // Low-amplitude, extremely gentle elevation waves
          let elevation = 0;
          if (!prefersReducedMotion) {
            const wave1 = Math.sin(gz * 0.01 - time * 0.8) * 9;
            const wave2 = Math.cos(gx * 0.008 + time * 0.4) * Math.sin(gz * 0.006) * 7;
            const mouseEffect =
              Math.exp(-((gx - targetCameraX * 140) ** 2 + (gz - 260) ** 2) / 50000) * 12;
            elevation = wave1 + wave2 + mouseEffect;
          } else {
            elevation = Math.sin(gz * 0.01) * 8;
          }

          const pt = project3D(gx, elevation, gz, width, height);
          grid3D[r][c] = pt;
        }
      }

      // Draw Topographic Contour Lines with strict exponential horizon fade
      ctx.lineWidth = 0.75;

      for (let r = 0; r < rows; r++) {
        const depthRatio = r / (rows - 1);
        // Base contour line opacity: 0.08 - 0.14
        const lineAlpha = Math.pow(depthRatio, 2.2) * 0.16;

        if (lineAlpha < 0.01) continue;

        // 1. Horizontal contour line (latitude)
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
        ctx.strokeStyle = `rgba(6, 182, 212, ${lineAlpha})`;
        ctx.stroke();

        // 2. Vertical depth grid lines (secondary: opacity 0.03 - 0.07)
        for (let c = 0; c < cols; c += 2) {
          const curr = grid3D[r][c];
          const next = r + 1 < rows ? grid3D[r + 1][c] : null;
          if (curr && next) {
            ctx.beginPath();
            ctx.moveTo(curr.x, curr.y);
            ctx.lineTo(next.x, next.y);
            ctx.strokeStyle = `rgba(16, 185, 129, ${lineAlpha * 0.45})`;
            ctx.stroke();
          }
        }
      }

      // Render Topological Network Nodes (Sparse, muted opacity 0.15 - 0.35)
      for (const node of nodes) {
        const pt = grid3D[node.r]?.[node.c];
        if (!pt) continue;

        const depthRatio = node.r / (rows - 1);
        if (depthRatio < 0.25) continue; // Keep horizon clean

        const pulse = prefersReducedMotion
          ? 1
          : 0.7 + 0.3 * Math.sin(time * 1.5 + node.pulseOffset);

        const nodeAlpha = Math.min(0.35, Math.pow(depthRatio, 1.5) * 0.38 * pulse);
        const radius = Math.max(1.2, 2.0 * pt.scale * pulse);

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);

        if (node.type === "deterministic") {
          ctx.fillStyle = `rgba(16, 185, 129, ${nodeAlpha})`;
          ctx.shadowColor = "rgba(16, 185, 129, 0.4)";
          ctx.shadowBlur = 4 * pt.scale;
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(6, 182, 212, ${nodeAlpha})`;
          ctx.shadowColor = "rgba(6, 182, 212, 0.4)";
          ctx.shadowBlur = 4 * pt.scale;
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
          "linear-gradient(to bottom, transparent 0%, transparent 60%, rgba(0,0,0,0.5) 75%, rgba(0,0,0,1) 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, transparent 60%, rgba(0,0,0,0.5) 75%, rgba(0,0,0,1) 100%)",
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block transition-opacity duration-1000"
      />
    </div>
  );
}
