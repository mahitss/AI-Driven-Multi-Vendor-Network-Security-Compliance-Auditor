"use client";

import React, { useEffect, useRef } from "react";

/**
 * TopographicScene
 * 
 * Large 3D Cybersecurity Intelligence Terrain Model for the Right Hero Column:
 * - Multi-peak raised wireframe mountain terrain (Core Peak, AST Ridge, Compliance Plateau)
 * - Scaled 1.4x for large visual dominance across the right half of the hero
 * - True 3D perspective projection with 3-5 degree interactive mouse rotation matrix
 * - Elevated contour rings and longitudinal perspective lines
 * - 8 glowing security telemetry nodes with vertical pin connectors & NetVigil concept labels
 * - 5 curved network connection paths with animated traveling light packets
 * - Atmospheric depth fog fading seamlessly into #05080B
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

    // HiDPI Canvas Resizing to Parent Container
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.parentElement?.clientWidth || 800;
      const height = canvas.parentElement?.clientHeight || 800;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Large 3D Terrain Grid Dimensions
    const gridCols = 44; // X axis resolution
    const gridRows = 36; // Z axis resolution
    const gridWidth = 960;
    const gridDepth = 820;

    // Mouse Tracking for Restrained 3D Tilt (3-5 degrees max)
    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (prefersReducedMotion) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left - rect.width / 2;
      const clientY = e.clientY - rect.top - rect.height / 2;
      mouseX = (clientX / (rect.width / 2));
      mouseY = (clientY / (rect.height / 2));
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // 8 Telemetry Nodes with Real NetVigil Architectural Concepts
    const nodes = [
      { id: "cisco", x: -180, z: -50, type: "deterministic" as const, label: "CISCO IOS → AST → USM", color: "#00C98B" },
      { id: "junos", x: 230, z: -30, type: "ai" as const, label: "JUNOS → AST → USM", color: "#00D9FF" },
      { id: "fortinet", x: 80, z: 150, type: "ai" as const, label: "FORTIOS → AST → USM", color: "#00D9FF" },
      { id: "cis", x: -90, z: 100, type: "deterministic" as const, label: "CIS-1.2.1 / FAIL", color: "#00D9FF" },
      { id: "evidence", x: -280, z: 130, type: "deterministic" as const, label: "EVIDENCE: [LINE 17]", color: "#00C98B" },
      { id: "advisory", x: 200, z: 180, type: "ai" as const, label: "AI_ADVISORY: READ_ONLY", color: "#00D9FF" },
      { id: "zero_push", x: 0, z: 250, type: "deterministic" as const, label: "REMOTE_PUSH: ABSENT", color: "#00C98B" },
      { id: "core", x: -50, z: -200, type: "deterministic" as const, label: "SECURITY ENGINE / CORE", color: "#00C98B" },
    ];

    // 5 Inter-Node Network Connection Links (from Node index -> to Node index)
    const connections = [
      { from: 0, to: 3, speed: 0.008, offset: 0 },
      { from: 1, to: 2, speed: 0.007, offset: 0.3 },
      { from: 2, to: 5, speed: 0.009, offset: 0.6 },
      { from: 3, to: 4, speed: 0.006, offset: 0.2 },
      { from: 3, to: 6, speed: 0.008, offset: 0.8 },
      { from: 7, to: 0, speed: 0.007, offset: 0.5 },
      { from: 7, to: 1, speed: 0.006, offset: 0.1 },
    ];

    let time = 0;

    // Multi-Peak 3D Elevation Function
    const getElevation = (x: number, z: number, t: number) => {
      // Peak 1: Left Core Peak
      const p1 = 125 * Math.exp(-Math.pow((x + 130) / 160, 2) - Math.pow((z + 50) / 140, 2));
      // Peak 2: Right Vendor Normalization Ridge
      const p2 = 145 * Math.exp(-Math.pow((x - 220) / 170, 2) - Math.pow((z - 30) / 160, 2));
      // Peak 3: Rear Plateau
      const p3 = 90 * Math.exp(-Math.pow((x + 30) / 180, 2) - Math.pow((z + 200) / 150, 2));
      // Peak 4: Front Secondary Ridge
      const p4 = 85 * Math.exp(-Math.pow((x - 80) / 150, 2) - Math.pow((z - 160) / 130, 2));

      if (prefersReducedMotion) {
        return -(p1 + p2 + p3 + p4);
      }

      // Gentle undulating cybernetic wave ripples (14-18s cycle)
      const wave = 12 * Math.sin(x * 0.012 - t * 0.4) * Math.cos(z * 0.01 + t * 0.35) + 8 * Math.sin((x + z) * 0.008 + t * 0.25);
      return -(p1 + p2 + p3 + p4 + wave);
    };

    // 3D Perspective Rotation & Projection Math
    const project3D = (
      x: number,
      y: number,
      z: number,
      width: number,
      height: number,
      rotX: number,
      rotY: number
    ) => {
      // Rotate around Y axis
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;

      // Rotate around X axis
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const y2 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;

      // Camera focal distance & perspective divide
      const fov = 580;
      const cameraDist = 720;
      const pz = z2 + cameraDist;

      if (pz <= 10) return null;

      const scale = fov / pz;
      const screenX = width * 0.5 + x1 * scale;
      const screenY = height * 0.53 + y2 * scale;

      return { x: screenX, y: screenY, scale, pz, rawX: x1, rawY: y2, rawZ: z2 };
    };

    const render = () => {
      const width = canvas.parentElement?.clientWidth || 800;
      const height = canvas.parentElement?.clientHeight || 800;

      if (!prefersReducedMotion) {
        time += 0.0065;
        // Smooth mouse rotation damping (3-5 degree limit)
        targetRotX += (0.50 + mouseY * 0.05 - targetRotX) * 0.04;
        targetRotY += (-0.26 + mouseX * 0.07 - targetRotY) * 0.04;
      } else {
        targetRotX = 0.50;
        targetRotY = -0.26;
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Soft Ambient Radial Illumination Glow
      const centerGlow = ctx.createRadialGradient(
        width * 0.5,
        height * 0.52,
        25,
        width * 0.5,
        height * 0.55,
        width * 0.68
      );
      centerGlow.addColorStop(0, "rgba(0, 217, 255, 0.08)");
      centerGlow.addColorStop(0.45, "rgba(0, 201, 139, 0.03)");
      centerGlow.addColorStop(1, "rgba(5, 8, 11, 0)");
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, width, height);

      // 2. Generate 3D Mountain Mesh Matrix
      const mesh: ({ x: number; y: number; scale: number; pz: number; rawY: number } | null)[][] = [];

      for (let r = 0; r < gridRows; r++) {
        mesh[r] = [];
        const zFraction = r / (gridRows - 1);
        const z = -gridDepth / 2 + zFraction * gridDepth;

        for (let c = 0; c < gridCols; c++) {
          const xFraction = c / (gridCols - 1);
          const x = -gridWidth / 2 + xFraction * gridWidth;
          const y = getElevation(x, z, time);

          mesh[r][c] = project3D(x, y, z, width, height, targetRotX, targetRotY);
        }
      }

      // 3. Render 3D Wireframe Contours (Latitudinal Elevation Lines)
      for (let r = 0; r < gridRows; r++) {
        const depthRatio = r / (gridRows - 1);
        // Depth-based Opacity: Distant (0.05-0.09), Midground (0.14-0.22), Foreground (0.28-0.40)
        const lineAlpha = 0.05 + Math.pow(depthRatio, 1.35) * 0.35;

        ctx.beginPath();
        let started = false;

        for (let c = 0; c < gridCols; c++) {
          const pt = mesh[r][c];
          if (!pt) continue;

          if (!started) {
            ctx.moveTo(pt.x, pt.y);
            started = true;
          } else {
            const prev = mesh[r][c - 1];
            if (prev) {
              const midX = (prev.x + pt.x) / 2;
              const midY = (prev.y + pt.y) / 2;
              ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
            }
          }
        }

        // Luminescent highlight on mountain ridges
        const isPeakRow = r === 9 || r === 16 || r === 25 || r === gridRows - 1;
        if (isPeakRow && depthRatio > 0.3) {
          ctx.shadowColor = "rgba(0, 217, 255, 0.45)";
          ctx.shadowBlur = 6;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.strokeStyle = `rgba(0, 217, 255, ${lineAlpha})`;
        ctx.lineWidth = 0.8 + depthRatio * 0.6;
        ctx.stroke();
      }

      ctx.shadowBlur = 0;

      // 4. Render Longitudinal Structural Grid Ribs
      for (let c = 2; c < gridCols - 2; c += 3) {
        ctx.beginPath();
        let started = false;

        for (let r = 0; r < gridRows; r++) {
          const pt = mesh[r][c];
          if (!pt) continue;

          if (!started) {
            ctx.moveTo(pt.x, pt.y);
            started = true;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }

        const colDepth = Math.abs(c - gridCols / 2) / (gridCols / 2);
        const ribAlpha = (0.04 + (1 - colDepth) * 0.05);
        ctx.strokeStyle = `rgba(0, 201, 139, ${ribAlpha})`;
        ctx.lineWidth = 0.65;
        ctx.stroke();
      }

      // 5. Compute 3D Positions for the 8 Security Telemetry Nodes
      const projectedNodes: ({
        x: number;
        y: number;
        baseX: number;
        baseY: number;
        scale: number;
        pulse: number;
        node: typeof nodes[0];
      } | null)[] = [];

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const eleY = getElevation(n.x, n.z, time);
        const pt = project3D(n.x, eleY, n.z, width, height, targetRotX, targetRotY);
        // Ground anchor point for vertical connector pin
        const basePt = project3D(n.x, 20, n.z, width, height, targetRotX, targetRotY);

        if (!pt || !basePt) {
          projectedNodes.push(null);
          continue;
        }

        const pulse = prefersReducedMotion
          ? 1
          : 0.75 + 0.25 * Math.sin(time * 2.2 + i * 0.8);

        projectedNodes.push({
          x: pt.x,
          y: pt.y,
          baseX: basePt.x,
          baseY: basePt.y,
          scale: pt.scale,
          pulse,
          node: n,
        });
      }

      // 6. Render Network Paths & Traveling Light Packets
      for (const conn of connections) {
        const n1 = projectedNodes[conn.from];
        const n2 = projectedNodes[conn.to];
        if (!n1 || !n2) continue;

        // Draw curved network spline
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        const midX = (n1.x + n2.x) / 2;
        const midY = Math.min(n1.y, n2.y) - 20;
        ctx.quadraticCurveTo(midX, midY, n2.x, n2.y);

        ctx.strokeStyle = "rgba(0, 217, 255, 0.22)";
        ctx.lineWidth = 0.95;
        ctx.setLineDash([3, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Animate Traveling Light Telemetry Packet
        if (!prefersReducedMotion) {
          const packetT = (time * conn.speed * 40 + conn.offset) % 1;
          const px = Math.pow(1 - packetT, 2) * n1.x + 2 * (1 - packetT) * packetT * midX + Math.pow(packetT, 2) * n2.x;
          const py = Math.pow(1 - packetT, 2) * n1.y + 2 * (1 - packetT) * packetT * midY + Math.pow(packetT, 2) * n2.y;

          ctx.beginPath();
          ctx.arc(px, py, 2.4, 0, Math.PI * 2);
          ctx.fillStyle = "#00D9FF";
          ctx.shadowColor = "#00D9FF";
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // 7. Render 8 Security Nodes, Vertical Connector Pins & Architectural Labels
      for (let i = 0; i < projectedNodes.length; i++) {
        const pn = projectedNodes[i];
        if (!pn) continue;

        // A. Vertical Connector Pin (Dropping from elevated node to terrain base)
        ctx.beginPath();
        ctx.moveTo(pn.x, pn.y);
        ctx.lineTo(pn.baseX, pn.baseY);
        ctx.strokeStyle = `rgba(0, 217, 255, ${0.25 * pn.scale})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // B. Ground footprint anchor
        ctx.beginPath();
        ctx.arc(pn.baseX, pn.baseY, 2.0 * pn.scale, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 201, 139, 0.45)";
        ctx.fill();

        // C. Glowing Node Core & Halo
        const nodeRadius = Math.max(2.4, 4.0 * pn.scale * pn.pulse);
        ctx.beginPath();
        ctx.arc(pn.x, pn.y, nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = pn.node.color;
        ctx.shadowColor = pn.node.color;
        ctx.shadowBlur = 10 * pn.scale;
        ctx.fill();
        ctx.shadowBlur = 0;

        // D. Architectural Concept Tag Label (Crisp micro annotation)
        if (pn.scale > 0.62) {
          const fontSize = Math.max(9.5, Math.floor(11 * pn.scale));
          ctx.font = `600 ${fontSize}px ui-monospace, monospace`;

          // Label background chip
          const textMetrics = ctx.measureText(pn.node.label);
          const chipW = textMetrics.width + 12;
          const chipH = fontSize + 7;
          const chipX = pn.x + 8;
          const chipY = pn.y - chipH / 2 - 2;

          ctx.fillStyle = "rgba(11, 15, 25, 0.88)";
          ctx.fillRect(chipX, chipY, chipW, chipH);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.09)";
          ctx.lineWidth = 0.75;
          ctx.strokeRect(chipX, chipY, chipW, chipH);

          // Label text
          ctx.fillStyle = pn.node.color;
          ctx.fillText(pn.node.label, chipX + 6, chipY + fontSize - 1);
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
          "radial-gradient(ellipse 90% 88% at 50% 50%, black 52%, rgba(0,0,0,0.6) 78%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 90% 88% at 50% 50%, black 52%, rgba(0,0,0,0.6) 78%, transparent 100%)",
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block opacity-95 transition-opacity duration-1000"
      />
    </div>
  );
}
