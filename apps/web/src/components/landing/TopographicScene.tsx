"use client";

import React, { useEffect, useRef } from "react";

/**
 * TopographicScene
 * 
 * Large 3D Topographical Security Model with Dominant Mountain Peak:
 * - Large 1100x920 3D spatial coordinate domain occupying ~61% of the hero
 * - Dominant pyramidal mountain peak with concentric elevation contour rings & surrounding ridges
 * - Apex core beacon node at the dominant mountain summit ("SECURITY ENGINE / CORE")
 * - 8 elevated security telemetry nodes with vertical pin connectors & NetVigil concept HUD chips
 * - 6 curved glowing network routes with animated traveling light packets
 * - True 3D perspective projection with 3-4 degree interactive mouse rotation matrix
 * - Atmospheric depth fog fading seamlessly into #030609
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

    // HiDPI Canvas Resizing
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.parentElement?.clientWidth || 900;
      const height = canvas.parentElement?.clientHeight || 800;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Large 3D Terrain Grid Resolution
    const gridCols = 46; // X axis resolution
    const gridRows = 38; // Z axis resolution
    const gridWidth = 1080;
    const gridDepth = 900;

    // Mouse Tracking for Restrained 3D Tilt (3-4 degrees max)
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
      { id: "core", x: 120, z: -30, type: "core" as const, label: "SECURITY ENGINE / CORE", color: "#00C8F5", isApex: true },
      { id: "cisco", x: -260, z: -70, type: "deterministic" as const, label: "CISCO IOS → AST → USM", color: "#00D6A3", isApex: false },
      { id: "junos", x: -100, z: -180, type: "ai" as const, label: "JUNOS → AST → USM", color: "#00C8F5", isApex: false },
      { id: "fortinet", x: 300, z: -140, type: "ai" as const, label: "FORTIOS → AST → USM", color: "#00C8F5", isApex: false },
      { id: "cis", x: -60, z: 120, type: "deterministic" as const, label: "CIS-1.2.1 / FAIL", color: "#00C8F5", isApex: false },
      { id: "evidence", x: -320, z: 150, type: "deterministic" as const, label: "EVIDENCE: [LINE 17]", color: "#00D6A3", isApex: false },
      { id: "advisory", x: 260, z: 180, type: "ai" as const, label: "AI_ADVISORY: READ_ONLY", color: "#00C8F5", isApex: false },
      { id: "zero_push", x: 40, z: 280, type: "deterministic" as const, label: "REMOTE_PUSH: ABSENT", color: "#00D6A3", isApex: false },
    ];

    // 6 Inter-Node Network Connection Routes (from Node index -> to Node index)
    const connections = [
      { from: 1, to: 0, speed: 0.008, offset: 0 },
      { from: 2, to: 0, speed: 0.007, offset: 0.25 },
      { from: 3, to: 0, speed: 0.009, offset: 0.5 },
      { from: 0, to: 4, speed: 0.007, offset: 0.1 },
      { from: 4, to: 5, speed: 0.006, offset: 0.4 },
      { from: 4, to: 7, speed: 0.008, offset: 0.7 },
      { from: 0, to: 6, speed: 0.007, offset: 0.35 },
    ];

    let time = 0;

    // Multi-Peak 3D Topographical Elevation Function with Dominant Pyramid Mountain Peak
    const getElevation = (x: number, z: number, t: number) => {
      // Dominant Pyramidal Mountain Peak (Center-Right Apex)
      const distApexSq = Math.pow(x - 120, 2) + Math.pow(z + 30, 2);
      const dominantPeak = 210 * Math.exp(-distApexSq / 42000);

      // Surrounding Ridge 1: Left Vendor Ingestion Mountain
      const ridge1 = 135 * Math.exp(-Math.pow((x + 260) / 160, 2) - Math.pow((z + 70) / 140, 2));

      // Surrounding Ridge 2: Front Telemetry Formation
      const ridge2 = 110 * Math.exp(-Math.pow((x + 60) / 150, 2) - Math.pow((z - 200) / 140, 2));

      // Surrounding Ridge 3: Rear Compliance Plateau
      const ridge3 = 130 * Math.exp(-Math.pow((x - 300) / 170, 2) - Math.pow((z - 140) / 150, 2));

      if (prefersReducedMotion) {
        return -(dominantPeak + ridge1 + ridge2 + ridge3);
      }

      // Gentle organic wave ripples (14-18s period)
      const wave = 14 * Math.sin(x * 0.01 - t * 0.38) * Math.cos(z * 0.009 + t * 0.32) + 8 * Math.sin((x + z) * 0.007 + t * 0.22);
      return -(dominantPeak + ridge1 + ridge2 + ridge3 + wave);
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

      // Camera perspective divide
      const fov = 620;
      const cameraDist = 760;
      const pz = z2 + cameraDist;

      if (pz <= 10) return null;

      const scale = fov / pz;
      const screenX = width * 0.52 + x1 * scale;
      const screenY = height * 0.52 + y2 * scale;

      return { x: screenX, y: screenY, scale, pz, rawX: x1, rawY: y2, rawZ: z2 };
    };

    const render = () => {
      const width = canvas.parentElement?.clientWidth || 900;
      const height = canvas.parentElement?.clientHeight || 800;

      if (!prefersReducedMotion) {
        time += 0.006;
        // Smooth mouse rotation damping (3-4 degree limit)
        targetRotX += (0.48 + mouseY * 0.045 - targetRotX) * 0.04;
        targetRotY += (-0.22 + mouseX * 0.06 - targetRotY) * 0.04;
      } else {
        targetRotX = 0.48;
        targetRotY = -0.22;
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Soft Ambient Radial Illumination Glow
      const centerGlow = ctx.createRadialGradient(
        width * 0.54,
        height * 0.50,
        30,
        width * 0.54,
        height * 0.54,
        width * 0.70
      );
      centerGlow.addColorStop(0, "rgba(0, 200, 245, 0.09)");
      centerGlow.addColorStop(0.45, "rgba(0, 214, 163, 0.03)");
      centerGlow.addColorStop(1, "rgba(3, 6, 9, 0)");
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
        // Depth-based Opacity: Distant (0.05-0.09), Midground (0.15-0.24), Foreground (0.28-0.42)
        const lineAlpha = 0.05 + Math.pow(depthRatio, 1.32) * 0.37;

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

        // Luminescent highlight on dominant mountain ridges
        const isPeakRow = r === 10 || r === 18 || r === 26 || r === gridRows - 1;
        if (isPeakRow && depthRatio > 0.3) {
          ctx.shadowColor = "rgba(0, 200, 245, 0.5)";
          ctx.shadowBlur = 7;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.strokeStyle = `rgba(0, 200, 245, ${lineAlpha})`;
        ctx.lineWidth = 0.85 + depthRatio * 0.65;
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
        const ribAlpha = 0.04 + (1 - colDepth) * 0.055;
        ctx.strokeStyle = `rgba(0, 214, 163, ${ribAlpha})`;
        ctx.lineWidth = 0.7;
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
        const basePt = project3D(n.x, 25, n.z, width, height, targetRotX, targetRotY);

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

        // Draw curved 3D network spline
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        const midX = (n1.x + n2.x) / 2;
        const midY = Math.min(n1.y, n2.y) - 24;
        ctx.quadraticCurveTo(midX, midY, n2.x, n2.y);

        ctx.strokeStyle = "rgba(0, 200, 245, 0.24)";
        ctx.lineWidth = 1.0;
        ctx.setLineDash([3, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Animate Traveling Light Telemetry Packet
        if (!prefersReducedMotion) {
          const packetT = (time * conn.speed * 40 + conn.offset) % 1;
          const px = Math.pow(1 - packetT, 2) * n1.x + 2 * (1 - packetT) * packetT * midX + Math.pow(packetT, 2) * n2.x;
          const py = Math.pow(1 - packetT, 2) * n1.y + 2 * (1 - packetT) * packetT * midY + Math.pow(packetT, 2) * n2.y;

          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = "#00C8F5";
          ctx.shadowColor = "#00C8F5";
          ctx.shadowBlur = 9;
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
        ctx.strokeStyle = `rgba(0, 200, 245, ${0.28 * pn.scale})`;
        ctx.lineWidth = 0.85;
        ctx.stroke();

        // B. Ground footprint anchor
        ctx.beginPath();
        ctx.arc(pn.baseX, pn.baseY, 2.2 * pn.scale, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 214, 163, 0.45)";
        ctx.fill();

        // C. Glowing Apex / Node Core & Halo
        const baseRadius = pn.node.isApex ? 3.6 : 2.4;
        const nodeRadius = Math.max(2.2, baseRadius * pn.scale * pn.pulse);
        ctx.beginPath();
        ctx.arc(pn.x, pn.y, nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = pn.node.color;
        ctx.shadowColor = pn.node.color;
        ctx.shadowBlur = (pn.node.isApex ? 16 : 10) * pn.scale;
        ctx.fill();
        ctx.shadowBlur = 0;

        // D. Architectural Concept Tag Label (Crisp micro annotation)
        if (pn.scale > 0.6) {
          const fontSize = Math.max(9.5, Math.floor(11 * pn.scale));
          ctx.font = `600 ${fontSize}px ui-monospace, monospace`;

          // Label background chip
          const textMetrics = ctx.measureText(pn.node.label);
          const chipW = textMetrics.width + 12;
          const chipH = fontSize + 7;
          const chipX = pn.x + 9;
          const chipY = pn.y - chipH / 2 - 2;

          ctx.fillStyle = "rgba(11, 15, 25, 0.90)";
          ctx.fillRect(chipX, chipY, chipW, chipH);
          ctx.strokeStyle = "rgba(0, 200, 245, 0.25)";
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
          "radial-gradient(ellipse 92% 90% at 52% 50%, black 55%, rgba(0,0,0,0.6) 80%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 92% 90% at 52% 50%, black 55%, rgba(0,0,0,0.6) 80%, transparent 100%)",
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block opacity-95 transition-opacity duration-1000"
      />
    </div>
  );
}
