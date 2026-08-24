"use client";

import React, { useEffect, useRef } from "react";

/**
 * TopographicScene
 * 
 * Authentic 3D Topographic Security Surface featuring:
 * - Organic dual-ridge elevation field (ridges, valleys, curved non-parallel contours)
 * - Vanishing depth perspective with horizon at ~56% of hero height
 * - 3-depth plane hierarchy (0.06 distant, 0.15 midground, 0.26 foreground)
 * - 8 traveling security telemetry nodes following 3D contour curves
 * - 4 subtle inter-node network connection links
 * - Ultra-smooth 12-20s continuous deformation cycle
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
    const numContours = 26; // 26 distinct curved depth slices
    const pointsPerContour = 52; // Horizontal resolution for organic curves
    const contourZStart = 40;
    const contourZEnd = 620;

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
      xRatio: number; // 0 (left) to 1 (right)
      speed: number;
      pulseOffset: number;
      type: "deterministic" | "ai";
      label: string;
    }[] = [
      { contourIndex: 6, xRatio: 0.18, speed: 0.0008, pulseOffset: 0.2, type: "deterministic", label: "NODE.CISCO-01" },
      { contourIndex: 10, xRatio: 0.78, speed: -0.0006, pulseOffset: 1.4, type: "ai", label: "NODE.JUNOS-CORE" },
      { contourIndex: 14, xRatio: 0.32, speed: 0.0007, pulseOffset: 2.8, type: "deterministic", label: "NODE.USM-ROUTER" },
      { contourIndex: 18, xRatio: 0.65, speed: -0.0009, pulseOffset: 3.5, type: "ai", label: "NODE.FORTINET-GW" },
      { contourIndex: 22, xRatio: 0.22, speed: 0.0005, pulseOffset: 4.6, type: "deterministic", label: "NODE.EVIDENCE-L17" },
      { contourIndex: 16, xRatio: 0.85, speed: -0.0007, pulseOffset: 5.1, type: "ai", label: "NODE.ADVISORY-L0" },
      { contourIndex: 24, xRatio: 0.48, speed: 0.0006, pulseOffset: 1.9, type: "deterministic", label: "NODE.ZERO-PUSH" },
      { contourIndex: 12, xRatio: 0.12, speed: -0.0005, pulseOffset: 3.9, type: "deterministic", label: "NODE.AST-NORM" },
    ];

    // 4 Inter-Node Network Connection Pairs (indices into nodes array)
    const nodeConnections = [
      [0, 2], // Left flank ridge link
      [2, 6], // Center valley link
      [1, 3], // Right flank ridge link
      [3, 5], // Right perimeter link
    ];

    let time = 0;

    // Organic 3D Topographic Elevation Model: Dual Ridges + Center Valley
    const getElevation = (x: number, z: number, t: number) => {
      if (prefersReducedMotion) {
        const r1 = Math.exp(-Math.pow((x + 280) / 220, 2)) * 48;
        const r2 = Math.exp(-Math.pow((x - 300) / 240, 2)) * 56;
        return r1 + r2 + Math.sin(x * 0.006) * 12;
      }

      // Left Ridge elevation peak
      const ridge1 =
        Math.exp(-Math.pow((x + 260) / 220, 2)) *
        (52 + Math.sin(z * 0.007 + t * 0.5) * 14);

      // Right Ridge elevation peak
      const ridge2 =
        Math.exp(-Math.pow((x - 280) / 240, 2)) *
        (60 + Math.cos(z * 0.006 + t * 0.45) * 16);

      // Valley curvature and gentle undulating terrain ripples (12-20s period)
      const valleyWave = Math.sin(x * 0.005 + t * 0.35) * Math.cos(z * 0.005 - t * 0.3) * 16;
      const fineDetail = Math.sin((x * 0.009 + z * 0.007) + t * 0.6) * 8;

      // Cursor gentle elevation warp
      const mouseDistSq = Math.pow(x - targetCameraX * 220, 2) + Math.pow(z - 280, 2);
      const mouseElevation = Math.exp(-mouseDistSq / 50000) * 18;

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
      const fov = 400;
      const cameraZ = 160;
      // Horizon located at 56% of hero height (below headline)
      const horizonY = height * 0.56;
      const cameraHeight = 135 + targetCameraY * 18;
      const cameraX = targetCameraX * 35;

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
        // Controlled slow cycle rate (~16s full deformation period)
        time += 0.0065;
        targetCameraX += (mouseX - targetCameraX) * 0.03;
        targetCameraY += (mouseY - targetCameraY) * 0.03;

        // Advance nodes along contour curves
        for (const node of nodes) {
          node.xRatio += node.speed;
          if (node.xRatio > 0.92) node.xRatio = 0.08;
          if (node.xRatio < 0.08) node.xRatio = 0.92;
        }
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Subtle Cyan Horizon Line & Atmospheric Glow
      const horizonY = height * 0.56;
      const horizonGlow = ctx.createRadialGradient(
        width / 2,
        horizonY + 30,
        10,
        width / 2,
        horizonY + 40,
        width * 0.65
      );
      horizonGlow.addColorStop(0, "rgba(0, 217, 255, 0.045)");
      horizonGlow.addColorStop(0.5, "rgba(0, 200, 150, 0.015)");
      horizonGlow.addColorStop(1, "rgba(5, 7, 9, 0)");
      ctx.fillStyle = horizonGlow;
      ctx.fillRect(0, horizonY - 10, width, height - horizonY + 10);

      // Horizon line itself (thin, soft glowing cyan)
      ctx.beginPath();
      ctx.moveTo(width * 0.15, horizonY);
      ctx.lineTo(width * 0.85, horizonY);
      ctx.strokeStyle = "rgba(0, 217, 255, 0.07)";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // 2. Generate 3D Contour Point Matrix
      const contourPoints: ({ x: number; y: number; scale: number; pz: number } | null)[][] = [];

      for (let ci = 0; ci < numContours; ci++) {
        contourPoints[ci] = [];
        const zFraction = ci / (numContours - 1);
        // Exponential depth distribution for natural perspective foreshortening
        const gz = contourZStart + Math.pow(zFraction, 1.3) * (contourZEnd - contourZStart);
        const spanX = 680 + zFraction * 440; // Wider span in foreground

        for (let pi = 0; pi < pointsPerContour; pi++) {
          const xFraction = pi / (pointsPerContour - 1);
          const gx = (xFraction - 0.5) * 2 * spanX;
          const elevation = getElevation(gx, gz, time);

          const pt = project3D(gx, elevation, gz, width, height);
          contourPoints[ci][pi] = pt;
        }
      }

      // 3. Render 3D Curved Contour Lines (26 Paths)
      for (let ci = 0; ci < numContours; ci++) {
        const depthRatio = ci / (numContours - 1);

        // 3-Depth Plane Opacity Gradient:
        // Distant: 0.06 - 0.10 | Midground: 0.12 - 0.18 | Foreground: 0.20 - 0.28
        let alpha: number;
        let lineWidth: number;

        if (depthRatio < 0.3) {
          alpha = 0.06 + depthRatio * 0.13;
          lineWidth = 0.75;
        } else if (depthRatio < 0.7) {
          alpha = 0.12 + (depthRatio - 0.3) * 0.15;
          lineWidth = 0.95;
        } else {
          alpha = 0.18 + (depthRatio - 0.7) * 0.3;
          lineWidth = 1.25;
        }

        // Draw organic smooth curved path
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
            // Smooth curve segment
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
          ctx.shadowColor = "rgba(0, 217, 255, 0.35)";
          ctx.shadowBlur = 5;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.strokeStyle = `rgba(0, 217, 255, ${alpha})`;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }

      ctx.shadowBlur = 0;

      // 4. Render Subtle Longitudinal Structural Ribs (Interconnecting Depth Lines)
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

        const ribAlpha = 0.045 + (pi / pointsPerContour) * 0.035;
        ctx.strokeStyle = `rgba(0, 200, 150, ${ribAlpha})`; // Secondary technical emerald
        ctx.lineWidth = 0.65;
        ctx.stroke();
      }

      // 5. Compute Node Screen Positions
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
          : 0.75 + 0.25 * Math.sin(time * 2.2 + node.pulseOffset);

        nodeScreenPositions.push({ x: sx, y: sy, scale, pulse, type: node.type });
      }

      // 6. Render 4 Network Connection Paths Linking Selected Nodes
      for (const [idxA, idxB] of nodeConnections) {
        const nodeA = nodeScreenPositions[idxA];
        const nodeB = nodeScreenPositions[idxB];
        if (!nodeA || !nodeB) continue;

        ctx.beginPath();
        ctx.moveTo(nodeA.x, nodeA.y);
        // Gentle curved path following terrain curvature
        const midX = (nodeA.x + nodeB.x) / 2;
        const midY = Math.min(nodeA.y, nodeB.y) - 12;
        ctx.quadraticCurveTo(midX, midY, nodeB.x, nodeB.y);

        ctx.strokeStyle = "rgba(0, 217, 255, 0.16)";
        ctx.lineWidth = 0.85;
        ctx.setLineDash([3, 5]);
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash
      }

      // 7. Render 8 Telemetry Nodes (Small, focused, technical)
      for (let i = 0; i < nodeScreenPositions.length; i++) {
        const nodePos = nodeScreenPositions[i];
        if (!nodePos) continue;

        const radius = Math.max(1.8, 3.2 * nodePos.scale * nodePos.pulse);
        const nodeAlpha = Math.min(0.65, 0.3 + 0.35 * nodePos.pulse);

        ctx.beginPath();
        ctx.arc(nodePos.x, nodePos.y, radius, 0, Math.PI * 2);

        if (nodePos.type === "deterministic") {
          // Technical Emerald Fact Node
          ctx.fillStyle = `rgba(0, 200, 150, ${nodeAlpha})`;
          ctx.shadowColor = "rgba(0, 200, 150, 0.7)";
          ctx.shadowBlur = 6 * nodePos.scale;
          ctx.fill();
        } else {
          // Technical Cyan AI Node
          ctx.fillStyle = `rgba(0, 217, 255, ${nodeAlpha})`;
          ctx.shadowColor = "rgba(0, 217, 255, 0.8)";
          ctx.shadowBlur = 8 * nodePos.scale;
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
