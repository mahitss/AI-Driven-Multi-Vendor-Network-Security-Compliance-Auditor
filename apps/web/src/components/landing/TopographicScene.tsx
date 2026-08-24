"use client";

import React, { useEffect, useRef } from "react";

/**
 * TopographicScene
 * 
 * Interactive 3D Topographic Security Terrain for the Two-Column Hero layout:
 * - Rendered on the right side (occupying ~54% width on desktop)
 * - True 3D perspective landscape with dual ridges, valleys, and non-parallel curved contours
 * - 8 traveling security telemetry nodes with architectural NetVigil concept labels
 * - 4 subtle inter-node network connection paths
 * - Smooth interactive cursor parallax and continuous 12-20s wave deformation cycle
 * - Atmospheric perimeter fade to blend seamlessly into #050709
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

    // HiDPI Canvas Scaling based on container dimensions
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.parentElement?.clientWidth || window.innerWidth / 2;
      const height = canvas.parentElement?.clientHeight || 600;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // 3D Grid & Contour Parameters
    const numContours = 28; // 28 depth slices from horizon to foreground
    const pointsPerContour = 54; // Horizontal curve resolution
    const contourZStart = 30;
    const contourZEnd = 620;

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

    // 8 Telemetry Nodes with Real NetVigil Architectural Concepts
    const nodes: {
      contourIndex: number;
      xRatio: number;
      speed: number;
      pulseOffset: number;
      type: "deterministic" | "ai";
      label: string;
    }[] = [
      { contourIndex: 5, xRatio: 0.22, speed: 0.0006, pulseOffset: 0.2, type: "deterministic", label: "CISCO IOS → AST → USM" },
      { contourIndex: 9, xRatio: 0.78, speed: -0.0005, pulseOffset: 1.4, type: "ai", label: "JUNOS → AST → USM" },
      { contourIndex: 13, xRatio: 0.35, speed: 0.0007, pulseOffset: 2.8, type: "deterministic", label: "CIS-1.2.1 / FAIL" },
      { contourIndex: 17, xRatio: 0.65, speed: -0.0008, pulseOffset: 3.5, type: "ai", label: "FORTIOS → AST → USM" },
      { contourIndex: 21, xRatio: 0.25, speed: 0.0005, pulseOffset: 4.6, type: "deterministic", label: "EVIDENCE:[LINE 17]" },
      { contourIndex: 15, xRatio: 0.84, speed: -0.0006, pulseOffset: 5.1, type: "ai", label: "AI_ADVISORY:READ_ONLY" },
      { contourIndex: 23, xRatio: 0.52, speed: 0.0005, pulseOffset: 1.9, type: "deterministic", label: "REMOTE_PUSH:ABSENT" },
      { contourIndex: 11, xRatio: 0.15, speed: -0.0004, pulseOffset: 3.9, type: "deterministic", label: "SECURITY ENGINE / CORE" },
    ];

    // 4 Inter-Node Network Connection Pairs
    const nodeConnections = [
      [0, 2],
      [2, 6],
      [1, 3],
      [3, 5],
    ];

    let time = 0;

    // Organic 3D Topographic Elevation Model
    const getElevation = (x: number, z: number, t: number) => {
      if (prefersReducedMotion) {
        const r1 = Math.exp(-Math.pow((x + 220) / 200, 2)) * 48;
        const r2 = Math.exp(-Math.pow((x - 240) / 210, 2)) * 56;
        return r1 + r2 + Math.sin(x * 0.006) * 12;
      }

      // Left Ridge Peak
      const ridge1 =
        Math.exp(-Math.pow((x + 200) / 190, 2)) *
        (54 + Math.sin(z * 0.007 + t * 0.5) * 15);

      // Right Ridge Peak
      const ridge2 =
        Math.exp(-Math.pow((x - 220) / 200, 2)) *
        (62 + Math.cos(z * 0.006 + t * 0.45) * 18);

      // Valley curvature and gentle undulating terrain ripples (14-18s period)
      const valleyWave = Math.sin(x * 0.006 + t * 0.35) * Math.cos(z * 0.005 - t * 0.3) * 16;
      const fineDetail = Math.sin((x * 0.01 + z * 0.008) + t * 0.55) * 8;

      // Mouse interactive elevation warp
      const mouseDistSq = Math.pow(x - targetCameraX * 200, 2) + Math.pow(z - 260, 2);
      const mouseElevation = Math.exp(-mouseDistSq / 45000) * 18;

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
      const fov = 420;
      const cameraZ = 150;
      // Horizon located in upper-middle of right visual area
      const horizonY = height * 0.28;
      const cameraHeight = 145 + targetCameraY * 18;
      const cameraX = targetCameraX * 35;

      const px = gx - cameraX;
      const py = cameraHeight - elevation;
      const pz = gz + cameraZ;

      if (pz <= 10) return null;

      const scale = fov / pz;
      const screenX = width * 0.52 + px * scale;
      const screenY = horizonY + py * scale;

      return { x: screenX, y: screenY, scale, pz, elevation };
    };

    const render = () => {
      const width = canvas.parentElement?.clientWidth || window.innerWidth / 2;
      const height = canvas.parentElement?.clientHeight || 600;

      if (!prefersReducedMotion) {
        // Continuous, graceful 14-18s wave deformation rate
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

      // 1. Ambient Central Atmosphere Glow
      const centerGlow = ctx.createRadialGradient(
        width * 0.52,
        height * 0.55,
        20,
        width * 0.52,
        height * 0.58,
        width * 0.65
      );
      centerGlow.addColorStop(0, "rgba(0, 217, 255, 0.06)");
      centerGlow.addColorStop(0.5, "rgba(0, 201, 139, 0.02)");
      centerGlow.addColorStop(1, "rgba(5, 7, 9, 0)");
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, width, height);

      // 2. Generate 3D Contour Point Matrix
      const contourPoints: ({ x: number; y: number; scale: number; pz: number } | null)[][] = [];

      for (let ci = 0; ci < numContours; ci++) {
        contourPoints[ci] = [];
        const zFraction = ci / (numContours - 1);
        const gz = contourZStart + Math.pow(zFraction, 1.25) * (contourZEnd - contourZStart);
        const spanX = 520 + zFraction * 460; // Wider perspective in foreground

        for (let pi = 0; pi < pointsPerContour; pi++) {
          const xFraction = pi / (pointsPerContour - 1);
          const gx = (xFraction - 0.5) * 2 * spanX;
          const elevation = getElevation(gx, gz, time);

          const pt = project3D(gx, elevation, gz, width, height);
          contourPoints[ci][pi] = pt;
        }
      }

      // 3. Render 3D Curved Contour Lines (28 Paths) with Perspective Foreshortening
      for (let ci = 0; ci < numContours; ci++) {
        const depthRatio = ci / (numContours - 1);

        // 3-Depth Plane Opacity Gradient:
        // Distant: 0.06 - 0.10 | Midground: 0.12 - 0.18 | Foreground: 0.20 - 0.30
        let alpha: number;
        let lineWidth: number;

        if (depthRatio < 0.3) {
          alpha = 0.06 + depthRatio * 0.14;
          lineWidth = 0.75;
        } else if (depthRatio < 0.7) {
          alpha = 0.12 + (depthRatio - 0.3) * 0.18;
          lineWidth = 0.95;
        } else {
          alpha = 0.20 + (depthRatio - 0.7) * 0.32;
          lineWidth = 1.25;
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

        // Soft luminescence on primary ridge contours
        const isRidgeContour = ci % 3 === 0 || ci === numContours - 1;
        if (isRidgeContour && depthRatio > 0.35) {
          ctx.shadowColor = "rgba(0, 217, 255, 0.4)";
          ctx.shadowBlur = 6;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.strokeStyle = `rgba(0, 217, 255, ${alpha})`;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }

      ctx.shadowBlur = 0;

      // 4. Subtle Longitudinal Structural Ribs (Secondary Emerald Grid Lines)
      for (let pi = 3; pi < pointsPerContour - 3; pi += 4) {
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

        const ribAlpha = 0.04 + (pi / pointsPerContour) * 0.035;
        ctx.strokeStyle = `rgba(0, 201, 139, ${ribAlpha})`;
        ctx.lineWidth = 0.65;
        ctx.stroke();
      }

      // 5. Compute Node Screen Positions
      const nodeScreenPositions: {
        x: number;
        y: number;
        scale: number;
        pulse: number;
        type: string;
        label: string;
      }[] = [];

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
          : 0.8 + 0.2 * Math.sin(time * 2.2 + node.pulseOffset);

        nodeScreenPositions.push({
          x: sx,
          y: sy,
          scale,
          pulse,
          type: node.type,
          label: node.label,
        });
      }

      // 6. Render 4 Network Connection Paths Linking Selected Nodes
      for (const [idxA, idxB] of nodeConnections) {
        const nodeA = nodeScreenPositions[idxA];
        const nodeB = nodeScreenPositions[idxB];
        if (!nodeA || !nodeB) continue;

        ctx.beginPath();
        ctx.moveTo(nodeA.x, nodeA.y);
        const midX = (nodeA.x + nodeB.x) / 2;
        const midY = Math.min(nodeA.y, nodeB.y) - 12;
        ctx.quadraticCurveTo(midX, midY, nodeB.x, nodeB.y);

        ctx.strokeStyle = "rgba(0, 217, 255, 0.16)";
        ctx.lineWidth = 0.85;
        ctx.setLineDash([3, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 7. Render Telemetry Nodes and Architectural Micro-Labels
      for (let i = 0; i < nodeScreenPositions.length; i++) {
        const nodePos = nodeScreenPositions[i];
        if (!nodePos) continue;

        const radius = Math.max(1.8, 3.2 * nodePos.scale * nodePos.pulse);
        const nodeAlpha = Math.min(0.65, 0.3 + 0.35 * nodePos.pulse);

        // Node circle
        ctx.beginPath();
        ctx.arc(nodePos.x, nodePos.y, radius, 0, Math.PI * 2);

        if (nodePos.type === "deterministic") {
          ctx.fillStyle = `rgba(0, 201, 139, ${nodeAlpha})`;
          ctx.shadowColor = "rgba(0, 201, 139, 0.6)";
          ctx.shadowBlur = 6 * nodePos.scale;
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(0, 217, 255, ${nodeAlpha})`;
          ctx.shadowColor = "rgba(0, 217, 255, 0.7)";
          ctx.shadowBlur = 8 * nodePos.scale;
          ctx.fill();
        }

        ctx.shadowBlur = 0;

        // Architectural Telemetry Label (Micro annotation on key nodes)
        if (i % 2 === 0 && nodePos.scale > 0.65) {
          ctx.font = `${Math.floor(9 * nodePos.scale)}px monospace`;
          ctx.fillStyle = `rgba(148, 163, 184, ${0.35 * nodeAlpha})`;
          ctx.fillText(nodePos.label, nodePos.x + 8, nodePos.y - 4);
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
    <div className="w-full h-full relative overflow-hidden pointer-events-none select-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full block opacity-95 transition-opacity duration-1000"
      />
    </div>
  );
}
