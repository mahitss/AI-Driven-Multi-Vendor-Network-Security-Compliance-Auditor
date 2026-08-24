"use client";

import React, { useEffect, useRef } from "react";

/**
 * TopographicScene
 * 
 * High-performance 3D topological security surface that occupies the lower ~45-50%
 * of the hero viewport. Creates a receding perspective landscape with a soft horizon fade
 * below the hero text and CTAs.
 *
 * Visual semantics:
 * - Emerald nodes: Deterministic Security Facts
 * - Cyan nodes: Grounded AI Advisory
 * - Receding Wireframe Contours: Normalized Security Topography
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
    const rows = 30; // Depth slices (Z)
    const cols = 44; // Width slices (X)
    const spacingX = 48;
    const spacingZ = 36;

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

    // Topological Security Node Intersections
    const nodes: {
      r: number;
      c: number;
      pulseOffset: number;
      type: "deterministic" | "ai";
      travelSpeed: number;
    }[] = [];

    for (let n = 0; n < 32; n++) {
      nodes.push({
        r: Math.floor(4 + ((n * 7) % (rows - 6))),
        c: Math.floor(4 + ((n * 13) % (cols - 8))),
        pulseOffset: (n * 0.4) % (Math.PI * 2),
        type: n % 3 === 0 ? "ai" : "deterministic",
        travelSpeed: 0.2 + (n % 4) * 0.1,
      });
    }

    let time = 0;

    // 3D Perspective Projection to Lower Floor
    const project3D = (
      gx: number,
      elevation: number,
      gz: number,
      width: number,
      height: number
    ) => {
      const fov = 360;
      const cameraZ = 220;
      const horizonY = height * 0.44; // Horizon starts right below hero text / CTAs
      const cameraHeight = 160 + targetCameraY * 18;
      const cameraX = targetCameraX * 35;

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
        time += 0.011;
        targetCameraX += (mouseX - targetCameraX) * 0.035;
        targetCameraY += (mouseY - targetCameraY) * 0.035;
      }

      ctx.clearRect(0, 0, width, height);

      // Radial atmosphere in the lower landscape
      const floorGlow = ctx.createRadialGradient(
        width / 2,
        height * 0.72,
        40,
        width / 2,
        height * 0.75,
        width * 0.65
      );
      floorGlow.addColorStop(0, "rgba(6, 182, 212, 0.035)");
      floorGlow.addColorStop(0.5, "rgba(16, 185, 129, 0.015)");
      floorGlow.addColorStop(1, "rgba(10, 12, 16, 0)");
      ctx.fillStyle = floorGlow;
      ctx.fillRect(0, height * 0.4, width, height * 0.6);

      // Compute grid points matrix
      const grid3D: ({ x: number; y: number; scale: number; pz: number } | null)[][] = [];

      for (let r = 0; r < rows; r++) {
        grid3D[r] = [];
        // Z extends from horizon (far) to foreground (near)
        const gz = r * spacingZ + 60;

        for (let c = 0; c < cols; c++) {
          const gx = (c - cols / 2) * spacingX;

          // Undulating landscape waves
          let elevation = 0;
          if (!prefersReducedMotion) {
            const wave1 = Math.sin(gz * 0.012 - time * 1.6) * 18;
            const wave2 = Math.cos(gx * 0.009 + time * 0.7) * Math.sin(gz * 0.007) * 14;
            const mouseEffect =
              Math.exp(-((gx - targetCameraX * 180) ** 2 + (gz - 300) ** 2) / 45000) * 22;
            elevation = wave1 + wave2 + mouseEffect;
          } else {
            elevation = Math.sin(gz * 0.012) * 15;
          }

          const pt = project3D(gx, elevation, gz, width, height);
          grid3D[r][c] = pt;
        }
      }

      // Draw Topographic Contour Lines (Latitude & Longitude)
      ctx.lineWidth = 0.85;

      for (let r = 0; r < rows; r++) {
        // Depth-based opacity: Fades out completely near horizon (r=0), bright near bottom (r=rows-1)
        const depthRatio = r / (rows - 1);
        const lineAlpha = Math.pow(depthRatio, 1.4) * 0.32; // Smooth exponential horizon fade

        if (lineAlpha < 0.01) continue;

        // 1. Draw horizontal contour line (latitude)
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

        // 2. Draw vertical depth grid lines (longitude)
        for (let c = 0; c < cols; c += 2) {
          const curr = grid3D[r][c];
          const next = r + 1 < rows ? grid3D[r + 1][c] : null;
          if (curr && next) {
            ctx.beginPath();
            ctx.moveTo(curr.x, curr.y);
            ctx.lineTo(next.x, next.y);
            ctx.strokeStyle = `rgba(16, 185, 129, ${lineAlpha * 0.75})`;
            ctx.stroke();
          }
        }
      }

      // Render Topological Network Nodes along contours
      for (const node of nodes) {
        const pt = grid3D[node.r]?.[node.c];
        if (!pt) continue;

        const depthRatio = node.r / (rows - 1);
        if (depthRatio < 0.15) continue; // Don't render far-horizon clutter

        const pulse = prefersReducedMotion
          ? 1
          : 0.6 + 0.4 * Math.sin(time * 2.8 + node.pulseOffset);

        const nodeAlpha = Math.min(0.9, Math.pow(depthRatio, 1.2) * 0.95 * pulse);
        const radius = Math.max(1.5, 2.8 * pt.scale * pulse);

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);

        if (node.type === "deterministic") {
          // Emerald: Deterministic Security Fact Node
          ctx.fillStyle = `rgba(16, 185, 129, ${nodeAlpha})`;
          ctx.shadowColor = "rgba(16, 185, 129, 0.65)";
          ctx.shadowBlur = 6 * pt.scale;
          ctx.fill();
        } else {
          // Cyan: AI Semantic Node
          ctx.fillStyle = `rgba(6, 182, 212, ${nodeAlpha})`;
          ctx.shadowColor = "rgba(6, 182, 212, 0.75)";
          ctx.shadowBlur = 8 * pt.scale;
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      }

      // Occasional gentle scanning pulse line traveling toward viewer
      if (!prefersReducedMotion) {
        const pulseProgress = (time * 0.4) % 1; // 0 to 1
        const pulseRow = Math.floor(pulseProgress * (rows - 2));
        if (pulseRow >= 2 && grid3D[pulseRow]) {
          ctx.beginPath();
          let firstPt = true;
          for (let c = 0; c < cols; c++) {
            const pt = grid3D[pulseRow][c];
            if (!pt) continue;
            if (firstPt) {
              ctx.moveTo(pt.x, pt.y);
              firstPt = false;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          }
          const pulseAlpha = Math.sin(pulseProgress * Math.PI) * 0.28;
          ctx.lineWidth = 1.6;
          ctx.strokeStyle = `rgba(0, 217, 255, ${pulseAlpha})`;
          ctx.shadowColor = "rgba(0, 217, 255, 0.8)";
          ctx.shadowBlur = 10;
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.lineWidth = 0.85;
        }
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
        className="w-full h-full block opacity-85 transition-opacity duration-1000"
      />
    </div>
  );
}
