"use client";

import React, { useEffect, useRef } from "react";

/**
 * TopographicScene
 * 
 * Refined 3D Topographic Security Surface:
 * - Horizon positioned at ~59% of hero height (underneath headline & description)
 * - Organic dual-ridge elevation field with center focal depth
 * - Subtle horizontal system scan wave (10-12s cycle, ultra-low opacity)
 * - 8 smooth traveling security telemetry nodes following 3D contour curves
 * - 4 subtle inter-node network connection links
 * - 12-20s continuous slow deformation cycle
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

    // Grid & Contour Parameters
    const numContours = 24; // 24 distinct curved depth slices
    const pointsPerContour = 52; // Horizontal resolution for organic curves
    const contourZStart = 40;
    const contourZEnd = 580;

    // Smooth Camera Parallax
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

    // 8 Telemetry Nodes bound to 3D Topographic Coordinates
    const nodes: {
      contourIndex: number;
      xRatio: number;
      speed: number;
      pulseOffset: number;
      type: "deterministic" | "ai";
    }[] = [
      { contourIndex: 5, xRatio: 0.2, speed: 0.0007, pulseOffset: 0.2, type: "deterministic" },
      { contourIndex: 9, xRatio: 0.76, speed: -0.0005, pulseOffset: 1.4, type: "ai" },
      { contourIndex: 13, xRatio: 0.34, speed: 0.0006, pulseOffset: 2.8, type: "deterministic" },
      { contourIndex: 17, xRatio: 0.64, speed: -0.0008, pulseOffset: 3.5, type: "ai" },
      { contourIndex: 21, xRatio: 0.24, speed: 0.0005, pulseOffset: 4.6, type: "deterministic" },
      { contourIndex: 15, xRatio: 0.82, speed: -0.0006, pulseOffset: 5.1, type: "ai" },
      { contourIndex: 22, xRatio: 0.5, speed: 0.0005, pulseOffset: 1.9, type: "deterministic" },
      { contourIndex: 11, xRatio: 0.14, speed: -0.0004, pulseOffset: 3.9, type: "deterministic" },
    ];

    // 4 Inter-Node Network Connection Pairs
    const nodeConnections = [
      [0, 2],
      [2, 6],
      [1, 3],
      [3, 5],
    ];

    let time = 0;

    // Organic 3D Topographic Elevation Model: Dual Ridges + Center Valley
    const getElevation = (x: number, z: number, t: number) => {
      if (prefersReducedMotion) {
        const r1 = Math.exp(-Math.pow((x + 260) / 210, 2)) * 44;
        const r2 = Math.exp(-Math.pow((x - 270) / 220, 2)) * 50;
        return r1 + r2 + Math.sin(x * 0.006) * 10;
      }

      // Left Ridge
      const ridge1 =
        Math.exp(-Math.pow((x + 250) / 210, 2)) *
        (46 + Math.sin(z * 0.007 + t * 0.45) * 12);

      // Right Ridge
      const ridge2 =
        Math.exp(-Math.pow((x - 260) / 220, 2)) *
        (52 + Math.cos(z * 0.006 + t * 0.4) * 14);

      // Valley curvature and gentle undulating terrain ripples (14-18s period)
      const valleyWave = Math.sin(x * 0.005 + t * 0.3) * Math.cos(z * 0.005 - t * 0.25) * 14;
      const fineDetail = Math.sin((x * 0.009 + z * 0.007) + t * 0.5) * 7;

      // Cursor gentle elevation warp
      const mouseDistSq = Math.pow(x - targetCameraX * 200, 2) + Math.pow(z - 260, 2);
      const mouseElevation = Math.exp(-mouseDistSq / 50000) * 15;

      return ridge1 + ridge2 + valleyWave + fineDetail + mouseElevation;
    };

    // 3D Perspective Projection Function
    const project3D = (
      gx: number,
      elevation: number,
      gz: number,
      width: number,
      height: number
    ) => {
      const fov = 390;
      const cameraZ = 160;
      // Horizon located at 59% of hero height (safely underneath text & copy)
      const horizonY = height * 0.59;
      const cameraHeight = 125 + targetCameraY * 16;
      const cameraX = targetCameraX * 30;

      const px = gx - cameraX;
      const py = cameraHeight - elevation;
      const pz = gz + cameraZ;

      if (pz <= 10) return null;

      const scale = fov / pz;
      const screenX = width / 2 + px * scale;
      const screenY = horizonY + py * scale;

      return { x: screenX, y: screenY, scale, pz, elevation };
    };

    const render = () => {
      const width = canvas.parentElement?.clientWidth || window.innerWidth;
      const height = canvas.parentElement?.clientHeight || window.innerHeight;

      if (!prefersReducedMotion) {
        // Slow 14-18s continuous wave cycle
        time += 0.006;
        targetCameraX += (mouseX - targetCameraX) * 0.025;
        targetCameraY += (mouseY - targetCameraY) * 0.025;

        // Advance nodes along contour curves
        for (const node of nodes) {
          node.xRatio += node.speed;
          if (node.xRatio > 0.92) node.xRatio = 0.08;
          if (node.xRatio < 0.08) node.xRatio = 0.92;
        }
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Subtle Cyan Horizon Glow
      const horizonY = height * 0.59;
      const horizonGlow = ctx.createRadialGradient(
        width / 2,
        horizonY + 25,
        10,
        width / 2,
        horizonY + 35,
        width * 0.6
      );
      horizonGlow.addColorStop(0, "rgba(0, 217, 255, 0.035)");
      horizonGlow.addColorStop(0.5, "rgba(0, 201, 139, 0.012)");
      horizonGlow.addColorStop(1, "rgba(5, 7, 9, 0)");
      ctx.fillStyle = horizonGlow;
      ctx.fillRect(0, horizonY - 10, width, height - horizonY + 10);

      // Horizon line itself (thin, soft glowing cyan)
      ctx.beginPath();
      ctx.moveTo(width * 0.18, horizonY);
      ctx.lineTo(width * 0.82, horizonY);
      ctx.strokeStyle = "rgba(0, 217, 255, 0.06)";
      ctx.lineWidth = 0.75;
      ctx.stroke();

      // 2. Generate 3D Contour Point Matrix
      const contourPoints: ({ x: number; y: number; scale: number; pz: number } | null)[][] = [];

      for (let ci = 0; ci < numContours; ci++) {
        contourPoints[ci] = [];
        const zFraction = ci / (numContours - 1);
        const gz = contourZStart + Math.pow(zFraction, 1.25) * (contourZEnd - contourZStart);
        const spanX = 640 + zFraction * 400;

        for (let pi = 0; pi < pointsPerContour; pi++) {
          const xFraction = pi / (pointsPerContour - 1);
          const gx = (xFraction - 0.5) * 2 * spanX;
          const elevation = getElevation(gx, gz, time);

          const pt = project3D(gx, elevation, gz, width, height);
          contourPoints[ci][pi] = pt;
        }
      }

      // 3. Render 3D Curved Contour Lines (24 Paths) with Focal Center Attenuation
      for (let ci = 0; ci < numContours; ci++) {
        const depthRatio = ci / (numContours - 1);

        // Depth-based Opacity Curve:
        // Distant: 0.05 - 0.08 | Midground: 0.10 - 0.16 | Foreground: 0.18 - 0.24
        let baseAlpha: number;
        let lineWidth: number;

        if (depthRatio < 0.3) {
          baseAlpha = 0.05 + depthRatio * 0.1;
          lineWidth = 0.7;
        } else if (depthRatio < 0.7) {
          baseAlpha = 0.1 + (depthRatio - 0.3) * 0.14;
          lineWidth = 0.85;
        } else {
          baseAlpha = 0.16 + (depthRatio - 0.7) * 0.22;
          lineWidth = 1.1;
        }

        const pts = contourPoints[ci];
        if (!pts || pts.length < 2) continue;

        ctx.beginPath();
        let started = false;

        for (let pi = 0; pi < pts.length; pi++) {
          const pt = pts[pi];
          if (!pt) continue;

          if (!started) {
            ctx.moveTo(pt.x, pt.y);
            started = true;
          } else {
            const prev = pts[pi - 1];
            if (prev) {
              const midX = (prev.x + pt.x) / 2;
              const midY = (prev.y + pt.y) / 2;
              ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
            }
          }
        }

        // Subtle luminescence on primary ridge contours
        const isRidgeContour = ci % 3 === 0 || ci === numContours - 1;
        if (isRidgeContour && depthRatio > 0.35) {
          ctx.shadowColor = "rgba(0, 217, 255, 0.25)";
          ctx.shadowBlur = 4;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.strokeStyle = `rgba(0, 217, 255, ${baseAlpha})`;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }

      ctx.shadowBlur = 0;

      // 4. Subtle Longitudinal Structural Ties
      for (let pi = 4; pi < pointsPerContour - 4; pi += 4) {
        ctx.beginPath();
        let started = false;

        for (let ci = 0; ci < numContours; ci++) {
          const pt = contourPoints[ci]?.[pi];
          if (!pt) continue;

          if (!started) {
            ctx.moveTo(pt.x, pt.y);
            started = true;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }

        const ribAlpha = 0.035 + (pi / pointsPerContour) * 0.03;
        ctx.strokeStyle = `rgba(0, 201, 139, ${ribAlpha})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // 5. System Horizontal Scan Wave (10s continuous subtle telemetry sweep)
      if (!prefersReducedMotion) {
        const scanProgress = (time * 0.1) % 1; // 0 to 1
        const scanX = width * 0.15 + scanProgress * width * 0.7;
        const scanGrad = ctx.createRadialGradient(
          scanX,
          height * 0.78,
          5,
          scanX,
          height * 0.78,
          180
        );
        scanGrad.addColorStop(0, "rgba(0, 217, 255, 0.06)");
        scanGrad.addColorStop(0.5, "rgba(0, 201, 139, 0.02)");
        scanGrad.addColorStop(1, "rgba(5, 7, 9, 0)");
        ctx.fillStyle = scanGrad;
        ctx.fillRect(scanX - 180, horizonY, 360, height - horizonY);
      }

      // 6. Compute Node Screen Positions
      const nodeScreenPositions: { x: number; y: number; scale: number; pulse: number; type: string }[] = [];

      for (const node of nodes) {
        const pts = contourPoints[node.contourIndex];
        if (!pts) continue;

        const exactIndex = node.xRatio * (pointsPerContour - 1);
        const i1 = Math.floor(exactIndex);
        const i2 = Math.min(pointsPerContour - 1, i1 + 1);
        const frac = exactIndex - i1;

        const p1 = pts[i1];
        const p2 = pts[i2];
        if (!p1 || !p2) continue;

        const sx = p1.x + (p2.x - p1.x) * frac;
        const sy = p1.y + (p2.y - p1.y) * frac;
        const scale = p1.scale + (p2.scale - p1.scale) * frac;

        const pulse = prefersReducedMotion
          ? 1
          : 0.8 + 0.2 * Math.sin(time * 2.0 + node.pulseOffset);

        nodeScreenPositions.push({ x: sx, y: sy, scale, pulse, type: node.type });
      }

      // 7. Render 4 Network Connection Paths Linking Selected Nodes
      for (const [idxA, idxB] of nodeConnections) {
        const nodeA = nodeScreenPositions[idxA];
        const nodeB = nodeScreenPositions[idxB];
        if (!nodeA || !nodeB) continue;

        ctx.beginPath();
        ctx.moveTo(nodeA.x, nodeA.y);
        const midX = (nodeA.x + nodeB.x) / 2;
        const midY = Math.min(nodeA.y, nodeB.y) - 10;
        ctx.quadraticCurveTo(midX, midY, nodeB.x, nodeB.y);

        ctx.strokeStyle = "rgba(0, 217, 255, 0.12)";
        ctx.lineWidth = 0.75;
        ctx.setLineDash([3, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 8. Render 8 Telemetry Nodes (Small, restrained, focused)
      for (let i = 0; i < nodeScreenPositions.length; i++) {
        const nodePos = nodeScreenPositions[i];
        if (!nodePos) continue;

        const radius = Math.max(1.6, 2.8 * nodePos.scale * nodePos.pulse);
        const nodeAlpha = Math.min(0.5, 0.25 + 0.25 * nodePos.pulse);

        ctx.beginPath();
        ctx.arc(nodePos.x, nodePos.y, radius, 0, Math.PI * 2);

        if (nodePos.type === "deterministic") {
          ctx.fillStyle = `rgba(0, 201, 139, ${nodeAlpha})`;
          ctx.shadowColor = "rgba(0, 201, 139, 0.5)";
          ctx.shadowBlur = 5 * nodePos.scale;
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(0, 217, 255, ${nodeAlpha})`;
          ctx.shadowColor = "rgba(0, 217, 255, 0.6)";
          ctx.shadowBlur = 6 * nodePos.scale;
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
