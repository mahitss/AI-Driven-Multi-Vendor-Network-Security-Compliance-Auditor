"use client";

import React, { useEffect, useRef } from "react";

/**
 * TopographicScene
 * Full-screen interactive WebGL / Canvas2D wireframe terrain representing
 * raw configuration complexity converging into normalized security semantics.
 *
 * Visual semantics:
 * - Green/Emerald particles & nodes: Deterministic Security Facts
 * - Cyan particles & nodes: Grounded AI Advisory & Syntax Interpretation
 * - Topographic Wireframe Mesh: Multi-Vendor AST Normalization Field
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

    // Mesh Grid parameters
    const rows = 32;
    const cols = 44;
    const spacing = 42;

    // Interactive mouse tracking for gentle camera parallax
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

    // Deterministic & AI Particle Nodes
    const nodes: {
      r: number;
      c: number;
      pulseOffset: number;
      type: "deterministic" | "ai";
    }[] = [];

    for (let n = 0; n < 28; n++) {
      nodes.push({
        r: Math.floor(4 + ((n * 11) % (rows - 8))),
        c: Math.floor(4 + ((n * 17) % (cols - 8))),
        pulseOffset: (n * 0.45) % (Math.PI * 2),
        type: n % 3 === 0 ? "ai" : "deterministic",
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
      const fov = 440;
      const cameraZ = 360;
      const cameraY = -130 + targetCameraY * 20;
      const cameraX = targetCameraX * 30;

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
        time += 0.012;
        // Smooth camera damping
        targetCameraX += (mouseX - targetCameraX) * 0.04;
        targetCameraY += (mouseY - targetCameraY) * 0.04;
      }

      ctx.clearRect(0, 0, width, height);

      // Deep subtle technical background vignette
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height * 0.4,
        50,
        width / 2,
        height * 0.5,
        width * 0.7
      );
      bgGrad.addColorStop(0, "rgba(6, 182, 212, 0.03)"); // Cyan aura
      bgGrad.addColorStop(0.5, "rgba(16, 185, 129, 0.015)"); // Emerald aura
      bgGrad.addColorStop(1, "rgba(5, 5, 5, 0)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Compute grid elevation matrix
      const grid3D: { x: number; y: number; scale: number; pz: number }[][] = [];

      for (let r = 0; r < rows; r++) {
        grid3D[r] = [];
        for (let c = 0; c < cols; c++) {
          const gx = (c - cols / 2) * spacing;
          const gz = (r - rows / 2) * spacing;

          // Normalized undulating topological mathematical equation
          const dist = Math.sqrt(gx * gx + gz * gz) * 0.003;
          let elevation = 0;

          if (!prefersReducedMotion) {
            const wave1 = Math.sin(dist * 5 - time * 1.5) * 22;
            const wave2 = Math.cos(gx * 0.008 + time) * Math.sin(gz * 0.008 - time * 0.8) * 18;
            const mouseInteraction =
              Math.exp(-((gx - targetCameraX * 200) ** 2 + (gz - targetCameraY * 200) ** 2) / 35000) * 28;
            elevation = wave1 + wave2 + mouseInteraction;
          } else {
            elevation = Math.sin(dist * 5) * 18;
          }

          const pt = project3D(gx, elevation, gz, width, height);
          if (pt) {
            grid3D[r][c] = pt;
          }
        }
      }

      // Draw subtle technical wireframe mesh lines
      ctx.lineWidth = 0.75;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const curr = grid3D[r]?.[c];
          if (!curr) continue;

          // Depth-based opacity fading
          const depthAlpha = Math.max(0.04, Math.min(0.24, 1.0 - curr.pz / 750));

          // Draw horizontal connection
          if (c + 1 < cols && grid3D[r]?.[c + 1]) {
            const next = grid3D[r][c + 1];
            ctx.beginPath();
            ctx.moveTo(curr.x, curr.y);
            ctx.lineTo(next.x, next.y);
            ctx.strokeStyle = `rgba(16, 185, 129, ${depthAlpha * 0.7})`;
            ctx.stroke();
          }

          // Draw vertical connection
          if (r + 1 < rows && grid3D[r + 1]?.[c]) {
            const next = grid3D[r + 1][c];
            ctx.beginPath();
            ctx.moveTo(curr.x, curr.y);
            ctx.lineTo(next.x, next.y);
            ctx.strokeStyle = `rgba(6, 182, 212, ${depthAlpha * 0.8})`;
            ctx.stroke();
          }
        }
      }

      // Render Topological Security Nodes
      for (const node of nodes) {
        const pt = grid3D[node.r]?.[node.c];
        if (!pt) continue;

        const pulse = prefersReducedMotion
          ? 1
          : 0.6 + 0.4 * Math.sin(time * 3 + node.pulseOffset);
        const radius = Math.max(1.5, 2.5 * pt.scale * pulse);

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);

        if (node.type === "deterministic") {
          // Emerald Green: Deterministic Fact
          ctx.fillStyle = `rgba(16, 185, 129, ${0.75 * pulse})`;
          ctx.shadowColor = "rgba(16, 185, 129, 0.6)";
          ctx.shadowBlur = 6;
          ctx.fill();
        } else {
          // Cyan: AI Semantic Fact
          ctx.fillStyle = `rgba(6, 182, 212, ${0.85 * pulse})`;
          ctx.shadowColor = "rgba(6, 182, 212, 0.7)";
          ctx.shadowBlur = 8;
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
        className="w-full h-full block opacity-75 transition-opacity duration-1000"
      />
    </div>
  );
}
