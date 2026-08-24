"use client";

import React, { useEffect, useRef } from "react";

/**
 * TopographicScene
 * 
 * Large Environmental 3D Topographic Security Terrain:
 * - Occupies the right 55-65% of the hero viewport
 * - Low-angle perspective camera looking across a 3D cybersecurity landscape
 * - True 3D depth with 32 curved contour paths, dual elevation ridges & valleys
 * - Seamless atmospheric edge fade into #050709 (zero rectangular boundary)
 * - 8 traveling security telemetry nodes with architectural NetVigil concept tags
 * - 4 subtle curved network connection links
 * - Ultra-smooth 14-18s continuous wave deformation + restrained 2-4% mouse parallax
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
      const width = canvas.parentElement?.clientWidth || window.innerWidth * 0.6;
      const height = canvas.parentElement?.clientHeight || 800;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // 3D Grid & Contour Parameters
    const numContours = 32; // 32 depth contour slices
    const pointsPerContour = 56; // Horizontal curve resolution
    const contourZStart = 30;
    const contourZEnd = 680;

    // Restrained Camera Parallax (2-4% max influence)
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

    // 8 Telemetry Nodes with Real NetVigil Concepts
    const nodes: {
      contourIndex: number;
      xRatio: number;
      speed: number;
      pulseOffset: number;
      type: "deterministic" | "ai";
      label: string;
    }[] = [
      { contourIndex: 6, xRatio: 0.24, speed: 0.0005, pulseOffset: 0.2, type: "deterministic", label: "CISCO IOS → AST → USM" },
      { contourIndex: 11, xRatio: 0.78, speed: -0.0004, pulseOffset: 1.4, type: "ai", label: "JUNOS → AST → USM" },
      { contourIndex: 15, xRatio: 0.38, speed: 0.0006, pulseOffset: 2.8, type: "deterministic", label: "CIS-1.2.1 / FAIL" },
      { contourIndex: 19, xRatio: 0.65, speed: -0.0007, pulseOffset: 3.5, type: "ai", label: "FORTIOS → AST → USM" },
      { contourIndex: 25, xRatio: 0.28, speed: 0.0004, pulseOffset: 4.6, type: "deterministic", label: "EVIDENCE:[LINE 17]" },
      { contourIndex: 17, xRatio: 0.86, speed: -0.0005, pulseOffset: 5.1, type: "ai", label: "AI_ADVISORY:READ_ONLY" },
      { contourIndex: 27, xRatio: 0.54, speed: 0.0004, pulseOffset: 1.9, type: "deterministic", label: "REMOTE_PUSH:ABSENT" },
      { contourIndex: 13, xRatio: 0.16, speed: -0.0003, pulseOffset: 3.9, type: "deterministic", label: "SECURITY ENGINE / CORE" },
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
        const r1 = Math.exp(-Math.pow((x + 200) / 220, 2)) * 52;
        const r2 = Math.exp(-Math.pow((x - 260) / 230, 2)) * 62;
        return r1 + r2 + Math.sin(x * 0.005) * 12;
      }

      // Left Ridge Peak
      const ridge1 =
        Math.exp(-Math.pow((x + 180) / 210, 2)) *
        (56 + Math.sin(z * 0.006 + t * 0.45) * 16);

      // Right Ridge Peak
      const ridge2 =
        Math.exp(-Math.pow((x - 240) / 220, 2)) *
        (66 + Math.cos(z * 0.005 + t * 0.4) * 20);

      // Valley curvature and gentle undulating terrain ripples (14-18s period)
      const valleyWave = Math.sin(x * 0.005 + t * 0.3) * Math.cos(z * 0.004 - t * 0.25) * 18;
      const fineDetail = Math.sin((x * 0.009 + z * 0.007) + t * 0.5) * 8;

      // Mouse interactive elevation warp (subtle 2-4%)
      const mouseDistSq = Math.pow(x - targetCameraX * 180, 2) + Math.pow(z - 280, 2);
      const mouseElevation = Math.exp(-mouseDistSq / 50000) * 14;

      return ridge1 + ridge2 + valleyWave + fineDetail + mouseElevation;
    };

    // 3D Perspective Projection Function (Low-Angle Camera)
    const project3D = (
      gx: number,
      elevation: number,
      gz: number,
      width: number,
      height: number
    ) => {
      const fov = 440;
      const cameraZ = 140;
      // Horizon located around 46% down the hero height
      const horizonY = height * 0.46;
      const cameraHeight = 150 + targetCameraY * 14;
      const cameraX = targetCameraX * 28;

      const px = gx - cameraX;
      const py = cameraHeight - elevation;
      const pz = gz + cameraZ;

      if (pz <= 10) return null;

      const scale = fov / pz;
      const screenX = width * 0.5 + px * scale;
      const screenY = horizonY + py * scale;

      return { x: screenX, y: screenY, scale, pz, elevation };
    };

    const render = () => {
      const width = canvas.parentElement?.clientWidth || window.innerWidth * 0.6;
      const height = canvas.parentElement?.clientHeight || 800;

      if (!prefersReducedMotion) {
        // Continuous, graceful 14-18s wave deformation rate
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

      // 1. Ambient Central Atmospheric Glow (Cyan/Teal)
      const centerGlow = ctx.createRadialGradient(
        width * 0.52,
        height * 0.58,
        30,
        width * 0.52,
        height * 0.62,
        width * 0.65
      );
      centerGlow.addColorStop(0, "rgba(0, 217, 255, 0.07)");
      centerGlow.addColorStop(0.5, "rgba(0, 201, 139, 0.02)");
      centerGlow.addColorStop(1, "rgba(5, 7, 9, 0)");
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, width, height);

      // 2. Generate 3D Contour Point Matrix
      const contourPoints: ({ x: number; y: number; scale: number; pz: number } | null)[][] = [];

      for (let ci = 0; ci < numContours; ci++) {
        contourPoints[ci] = [];
        const zFraction = ci / (numContours - 1);
        const gz = contourZStart + Math.pow(zFraction, 1.22) * (contourZEnd - contourZStart);
        const spanX = 580 + zFraction * 520; // Perspective expansion toward foreground

        for (let pi = 0; pi < pointsPerContour; pi++) {
          const xFraction = pi / (pointsPerContour - 1);
          const gx = (xFraction - 0.5) * 2 * spanX;
          const elevation = getElevation(gx, gz, time);

          const pt = project3D(gx, elevation, gz, width, height);
          contourPoints[ci][pi] = pt;
        }
      }

      // 3. Render 3D Curved Contour Lines (32 Paths) with Depth Scaling
      for (let ci = 0; ci < numContours; ci++) {
        const depthRatio = ci / (numContours - 1);

        // 3-Depth Plane Opacity Gradient:
        // Distant: 0.05 - 0.09 | Midground: 0.12 - 0.18 | Foreground: 0.22 - 0.32
        let alpha: number;
        let lineWidth: number;

        if (depthRatio < 0.3) {
          alpha = 0.05 + depthRatio * 0.13;
          lineWidth = 0.75;
        } else if (depthRatio < 0.7) {
          alpha = 0.12 + (depthRatio - 0.3) * 0.16;
          lineWidth = 0.95;
        } else {
          alpha = 0.20 + (depthRatio - 0.7) * 0.38;
          lineWidth = 1.3;
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

      // 4. Subtle Longitudinal Structural Ties (Secondary Emerald Lines)
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

        const ribAlpha = 0.035 + (pi / pointsPerContour) * 0.035;
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
        if (i % 2 === 0 && nodePos.scale > 0.6) {
          ctx.font = `${Math.floor(9.5 * nodePos.scale)}px monospace`;
          ctx.fillStyle = `rgba(148, 163, 184, ${0.28 * nodeAlpha})`;
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
    <div
      className="w-full h-full relative overflow-hidden pointer-events-none select-none"
      style={{
        maskImage:
          "radial-gradient(ellipse 90% 85% at 55% 55%, black 45%, rgba(0,0,0,0.6) 70%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 90% 85% at 55% 55%, black 45%, rgba(0,0,0,0.6) 70%, transparent 100%)",
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block opacity-95 transition-opacity duration-1000"
      />
    </div>
  );
}
