"use client";

import React, { useEffect, useRef } from "react";

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
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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

    // Grid properties
    const rows = 36;
    const cols = 48;
    const spacing = 38;

    // Mouse parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetCameraX = 0;
    let targetCameraY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      mouseX = (e.clientX - halfW) / halfW;
      mouseY = (e.clientY - halfH) / halfH;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // Deterministic Network Topology Nodes
    const nodeCount = 24;
    const nodes: { r: number; c: number; pulseOffset: number; active: boolean }[] = [];
    for (let n = 0; n < nodeCount; n++) {
      nodes.push({
        r: Math.floor(6 + ((n * 13) % (rows - 12))),
        c: Math.floor(6 + ((n * 19) % (cols - 12))),
        pulseOffset: (n * 0.4) % Math.PI,
        active: n % 4 === 0,
      });
    }

    let time = 0;

    // 3D Perspective Projection Function
    const project3D = (
      gx: number,
      gy: number,
      gz: number,
      width: number,
      height: number
    ) => {
      const fov = 420;
      const cameraZ = 340;
      const cameraY = -120 + targetCameraY * 25;
      const cameraX = targetCameraX * 35;

      const px = gx - cameraX;
      const py = gy - cameraY;
      const pz = gz + cameraZ;

      if (pz <= 10) return null;

      const scale = fov / pz;
      const screenX = width / 2 + px * scale;
      const screenY = height / 2 + py * scale;

      return { x: screenX, y: screenY, scale, pz };
    };

    const render = () => {
      const width = canvas.parentElement?.clientWidth || window.innerWidth;
      const height = canvas.parentElement?.clientHeight || window.innerHeight;

      if (!prefersReducedMotion) {
        time += 0.016;
        targetCameraX += (mouseX - targetCameraX) * 0.05;
        targetCameraY += (mouseY - targetCameraY) * 0.05;
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Calculate Grid Vertices with Sinusoidal Elevation
      const gridPoints: ({ x: number; y: number; scale: number; pz: number; elev: number } | null)[][] = [];

      for (let r = 0; r < rows; r++) {
        gridPoints[r] = [];
        for (let c = 0; c < cols; c++) {
          const worldX = (c - cols / 2) * spacing;
          const worldZ = r * spacing * 1.35;

          // Mathematical Elevation Function
          const distFromCenter = Math.sqrt(
            Math.pow((c - cols / 2) / (cols / 2), 2) +
            Math.pow((r - rows / 2) / (rows / 2), 2)
          );

          const wave1 = Math.sin(c * 0.28 + time * 0.6) * Math.cos(r * 0.28 + time * 0.6) * 32;
          const wave2 = Math.sin(c * 0.12 - time * 0.3 + r * 0.14) * 24;
          const falloff = Math.max(0, 1 - distFromCenter * 0.85);

          const elevation = (wave1 + wave2) * falloff;
          const worldY = 65 - elevation;

          const proj = project3D(worldX, worldY, worldZ, width, height);
          if (proj) {
            gridPoints[r][c] = { ...proj, elev: elevation };
          } else {
            gridPoints[r][c] = null;
          }
        }
      }

      // 2. Render Topographic Contour Lines
      for (let r = 0; r < rows; r++) {
        ctx.beginPath();
        let started = false;

        const isMajorContour = r % 4 === 0;
        ctx.strokeStyle = isMajorContour ? "rgba(0, 217, 255, 0.16)" : "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = isMajorContour ? 1.0 : 0.6;

        for (let c = 0; c < cols; c++) {
          const pt = gridPoints[r][c];
          if (!pt) {
            started = false;
            continue;
          }

          if (!started) {
            ctx.moveTo(pt.x, pt.y);
            started = true;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }
        ctx.stroke();
      }

      // Vertical longitudinal contour links
      for (let c = 0; c < cols; c += 2) {
        ctx.beginPath();
        let started = false;
        ctx.strokeStyle = "rgba(0, 217, 255, 0.04)";
        ctx.lineWidth = 0.5;

        for (let r = 0; r < rows; r++) {
          const pt = gridPoints[r][c];
          if (!pt) {
            started = false;
            continue;
          }
          if (!started) {
            ctx.moveTo(pt.x, pt.y);
            started = true;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }
        ctx.stroke();
      }

      // 3. Render Radial Scanning Wave
      const scanRadius = (time * 80) % 750;
      const scanCenterX = width / 2;
      const scanCenterY = height * 0.65;

      const gradient = ctx.createRadialGradient(
        scanCenterX,
        scanCenterY,
        Math.max(0, scanRadius - 60),
        scanCenterX,
        scanCenterY,
        scanRadius
      );
      gradient.addColorStop(0, "rgba(0, 217, 255, 0)");
      gradient.addColorStop(0.8, "rgba(0, 217, 255, 0.06)");
      gradient.addColorStop(1, "rgba(0, 217, 255, 0)");

      ctx.save();
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(scanCenterX, scanCenterY, scanRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 4. Render Network Topology Nodes & Connections
      const nodeScreenPositions: { x: number; y: number; active: boolean; pulse: number }[] = [];

      nodes.forEach((n) => {
        const pt = gridPoints[n.r]?.[n.c];
        if (pt) {
          const pulse = Math.sin(time * 3.0 + n.pulseOffset) * 0.5 + 0.5;
          nodeScreenPositions.push({ x: pt.x, y: pt.y, active: n.active, pulse });
        }
      });

      // Draw node links
      ctx.strokeStyle = "rgba(0, 217, 255, 0.18)";
      ctx.lineWidth = 0.75;
      for (let i = 0; i < nodeScreenPositions.length; i++) {
        for (let j = i + 1; j < nodeScreenPositions.length; j++) {
          const n1 = nodeScreenPositions[i];
          const n2 = nodeScreenPositions[j];
          const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();

            // Animated packet signal along active link
            if (!prefersReducedMotion && (i + j) % 3 === 0) {
              const progress = (time * 0.8 + (i * 0.3)) % 1.0;
              const px = n1.x + (n2.x - n1.x) * progress;
              const py = n1.y + (n2.y - n1.y) * progress;
              ctx.fillStyle = "#00D9FF";
              ctx.beginPath();
              ctx.arc(px, py, 1.4, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      // Draw node points
      nodeScreenPositions.forEach((n) => {
        ctx.fillStyle = n.active ? "#00D9FF" : "#8B5CF6";
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.active ? 2.5 + n.pulse * 1.5 : 2.0, 0, Math.PI * 2);
        ctx.fill();

        // Node halo
        if (n.active) {
          ctx.strokeStyle = `rgba(0, 217, 255, ${0.4 * (1 - n.pulse)})`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, 4.0 + n.pulse * 6.0, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0"
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ background: "#050505" }}
      />
      {/* Deep vignette gradients for optimal contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/40 via-transparent to-[#050505] pointer-events-none" />
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none opacity-80" />
    </div>
  );
}
