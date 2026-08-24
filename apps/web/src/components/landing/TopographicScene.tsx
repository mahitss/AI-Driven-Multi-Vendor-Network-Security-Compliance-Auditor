"use client";

import React, { useEffect, useRef } from "react";

/**
 * TopographicScene
 * 
 * Exact 3D Cybersecurity Intelligence Terrain from Reference:
 * - Upper-Right Dominant Mountain Pyramid with glowing white-cyan apex beacon
 * - Lower-Center Concentric Elevation Contour Rings centered around "SECURITY ENGINE / CORE"
 * - 8 Telemetry Nodes with Vertical Connector Lines & HUD Chips:
 *   1. "JUNOS → AST → USM" (Top center, vertical line to upper ridge node)
 *   2. "FORTIOS → AST → USM" (Upper right, vertical line to right ridge node)
 *   3. "CISCO IOS → AST → USM" (Mid left, vertical line to left shoulder node)
 *   4. "CIS-1.2.1 / FAIL" (Red FAIL badge, vertical line from Security Engine)
 *   5. "EVIDENCE: [LINE 17]" (Lower left node)
 *   6. "REMOTE_PUSH: ABSENT" (Mid-right slope node)
 *   7. "AI_ADVISORY: READ_ONLY" (Lower-right slope node)
 *   8. "SECURITY ENGINE / CORE" (Center of concentric contour rings)
 * - Luminous curved cyan spline arcs connecting nodes with moving light pulses
 * - Fine 3D wireframe mesh with perspective depth and subtle interactive mouse parallax
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

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.parentElement?.clientWidth || 1000;
      const height = canvas.parentElement?.clientHeight || 800;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // 3D Grid Parameters
    const gridCols = 48;
    const gridRows = 38;
    const gridWidth = 1100;
    const gridDepth = 900;

    // Mouse Tracking (3-4 degree subtle parallax)
    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (prefersReducedMotion) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left - rect.width / 2;
      const clientY = e.clientY - rect.top - rect.height / 2;
      mouseX = clientX / (rect.width / 2);
      mouseY = clientY / (rect.height / 2);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // 8 Telemetry Nodes Matching Reference Exactly
    const nodes = [
      // 0: Apex Summit (Upper Mountain Peak)
      { id: "apex", x: 220, z: -80, label: "", color: "#FFFFFF", isApex: true, chipOffset: { x: 0, y: 0 }, lineUp: false },
      // 1: JunOS (Top Center)
      { id: "junos", x: 140, z: -160, label: "JUNOS → AST → USM", color: "#00D9FF", isApex: false, chipOffset: { x: 0, y: -44 }, lineUp: true },
      // 2: FortiOS (Upper Right)
      { id: "fortios", x: 380, z: -100, label: "FORTIOS → AST → USM", color: "#00D9FF", isApex: false, chipOffset: { x: 0, y: -42 }, lineUp: true },
      // 3: Cisco IOS (Mid Left Shoulder)
      { id: "cisco", x: -160, z: -40, label: "CISCO IOS → AST → USM", color: "#00D9FF", isApex: false, chipOffset: { x: 0, y: -42 }, lineUp: true },
      // 4: CIS-1.2.1 / FAIL (Center-Left Ridge)
      { id: "cis_fail", x: 60, z: 40, label: "CIS-1.2.1 / FAIL", color: "#00D9FF", isApex: false, chipOffset: { x: 0, y: -30 }, lineUp: true, isFail: true },
      // 5: Security Engine / Core (Foreground Concentric Center)
      { id: "core", x: 60, z: 180, label: "SECURITY ENGINE / CORE", color: "#00D9FF", isApex: false, chipOffset: { x: 0, y: 28 }, lineUp: false, isCore: true },
      // 6: Evidence Line 17 (Lower Left)
      { id: "evidence", x: -200, z: 120, label: "EVIDENCE: [LINE 17]", color: "#00D9FF", isApex: false, chipOffset: { x: 0, y: -26 }, lineUp: true },
      // 7: Remote Push Absent (Center-Right Slope)
      { id: "remote_push", x: 240, z: 60, label: "REMOTE_PUSH: ABSENT", color: "#00D9FF", isApex: false, chipOffset: { x: 0, y: -26 }, lineUp: true },
      // 8: AI Advisory Read Only (Lower Right Slope)
      { id: "ai_advisory", x: 360, z: 140, label: "AI_ADVISORY: READ_ONLY", color: "#00D9FF", isApex: false, chipOffset: { x: 0, y: -26 }, lineUp: true },
    ];

    // Curved Network Spline Connections
    const connections = [
      { from: 3, to: 0, speed: 0.007, offset: 0 },
      { from: 1, to: 0, speed: 0.008, offset: 0.2 },
      { from: 0, to: 2, speed: 0.007, offset: 0.4 },
      { from: 0, to: 4, speed: 0.009, offset: 0.6 },
      { from: 4, to: 5, speed: 0.008, offset: 0.1 },
      { from: 4, to: 6, speed: 0.006, offset: 0.3 },
      { from: 4, to: 7, speed: 0.008, offset: 0.5 },
      { from: 7, to: 8, speed: 0.007, offset: 0.75 },
      { from: 5, to: 7, speed: 0.006, offset: 0.35 },
    ];

    let time = 0;

    // 3D Topographical Elevation Function Matching Reference Image
    const getElevation = (x: number, z: number, t: number) => {
      // 1. Dominant Upper-Right Mountain Peak (Apex)
      const distApexSq = Math.pow(x - 220, 2) + Math.pow(z + 80, 2);
      const apexPeak = 240 * Math.exp(-distApexSq / 38000);

      // 2. JunOS Ridge (Top Center Shoulder)
      const junosRidge = 160 * Math.exp(-Math.pow((x - 140) / 130, 2) - Math.pow((z + 160) / 120, 2));

      // 3. FortiOS Ridge (Upper Right Flank)
      const fortiosRidge = 170 * Math.exp(-Math.pow((x - 380) / 140, 2) - Math.pow((z + 100) / 130, 2));

      // 4. Cisco Shoulder (Mid-Left Ridge)
      const ciscoRidge = 130 * Math.exp(-Math.pow((x + 160) / 150, 2) - Math.pow((z + 40) / 130, 2));

      // 5. Concentric Elevation Basin / Core Formation
      const distCoreSq = Math.pow(x - 60, 2) + Math.pow(z - 180, 2);
      const coreRipples = Math.cos(Math.sqrt(distCoreSq) * 0.05) * 12 * Math.exp(-distCoreSq / 60000);

      if (prefersReducedMotion) {
        return -(apexPeak + junosRidge + fortiosRidge + ciscoRidge + coreRipples);
      }

      // Gentle continuous organic wave undulation
      const wave = 10 * Math.sin(x * 0.009 - t * 0.35) * Math.cos(z * 0.008 + t * 0.3);
      return -(apexPeak + junosRidge + fortiosRidge + ciscoRidge + coreRipples + wave);
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
      // Y-axis Yaw Rotation
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;

      // X-axis Pitch Rotation
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const y2 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;

      const fov = 640;
      const cameraDist = 780;
      const pz = z2 + cameraDist;

      if (pz <= 10) return null;

      const scale = fov / pz;
      const screenX = width * 0.54 + x1 * scale;
      const screenY = height * 0.50 + y2 * scale;

      return { x: screenX, y: screenY, scale, pz, rawX: x1, rawY: y2, rawZ: z2 };
    };

    const render = () => {
      const width = canvas.parentElement?.clientWidth || 1000;
      const height = canvas.parentElement?.clientHeight || 800;

      if (!prefersReducedMotion) {
        time += 0.006;
        targetRotX += (0.46 + mouseY * 0.04 - targetRotX) * 0.04;
        targetRotY += (-0.20 + mouseX * 0.05 - targetRotY) * 0.04;
      } else {
        targetRotX = 0.46;
        targetRotY = -0.20;
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Soft Ambient Cyan/Teal Illumination Center
      const centerGlow = ctx.createRadialGradient(
        width * 0.65,
        height * 0.38,
        20,
        width * 0.65,
        height * 0.42,
        width * 0.65
      );
      centerGlow.addColorStop(0, "rgba(0, 217, 255, 0.10)");
      centerGlow.addColorStop(0.4, "rgba(0, 201, 139, 0.03)");
      centerGlow.addColorStop(1, "rgba(3, 7, 12, 0)");
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, width, height);

      // 2. Generate 3D Mountain Mesh Matrix
      const mesh: ({ x: number; y: number; scale: number; pz: number } | null)[][] = [];

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

      // 3. Render 3D Wireframe Latitudinal Contour Lines
      for (let r = 0; r < gridRows; r++) {
        const depthRatio = r / (gridRows - 1);
        const lineAlpha = 0.05 + Math.pow(depthRatio, 1.3) * 0.38;

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

        const isPeakRow = r === 8 || r === 14 || r === 22 || r === 30 || r === gridRows - 1;
        if (isPeakRow && depthRatio > 0.25) {
          ctx.shadowColor = "rgba(0, 217, 255, 0.55)";
          ctx.shadowBlur = 7;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.strokeStyle = `rgba(0, 217, 255, ${lineAlpha})`;
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
        const ribAlpha = 0.04 + (1 - colDepth) * 0.06;
        ctx.strokeStyle = `rgba(0, 201, 139, ${ribAlpha})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }

      // 5. Concentric Elevation Contour Rings Around Security Engine (Foreground)
      for (let radius = 25; radius <= 160; radius += 28) {
        ctx.beginPath();
        let ringStarted = false;
        const ringSegments = 36;

        for (let a = 0; a <= ringSegments; a++) {
          const angle = (a / ringSegments) * Math.PI * 2;
          const rx = 60 + Math.cos(angle) * radius * 1.5;
          const rz = 180 + Math.sin(angle) * radius * 0.9;
          const ry = getElevation(rx, rz, time) - 2;

          const pt = project3D(rx, ry, rz, width, height, targetRotX, targetRotY);
          if (!pt) continue;

          if (!ringStarted) {
            ctx.moveTo(pt.x, pt.y);
            ringStarted = true;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }

        ctx.strokeStyle = `rgba(0, 217, 255, ${0.12 + (160 - radius) * 0.0015})`;
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }

      // 6. Compute 3D Positions for Telemetry Nodes
      const projectedNodes: ({
        x: number;
        y: number;
        scale: number;
        pulse: number;
        node: typeof nodes[0];
      } | null)[] = [];

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const eleY = getElevation(n.x, n.z, time);
        const pt = project3D(n.x, eleY, n.z, width, height, targetRotX, targetRotY);

        if (!pt) {
          projectedNodes.push(null);
          continue;
        }

        const pulse = prefersReducedMotion
          ? 1
          : 0.8 + 0.2 * Math.sin(time * 2.5 + i * 0.9);

        projectedNodes.push({
          x: pt.x,
          y: pt.y,
          scale: pt.scale,
          pulse,
          node: n,
        });
      }

      // 7. Render Luminous Curved Network Splines & Traveling Light Packets
      for (const conn of connections) {
        const n1 = projectedNodes[conn.from];
        const n2 = projectedNodes[conn.to];
        if (!n1 || !n2) continue;

        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        const midX = (n1.x + n2.x) / 2;
        const midY = Math.min(n1.y, n2.y) - 22;
        ctx.quadraticCurveTo(midX, midY, n2.x, n2.y);

        ctx.strokeStyle = "rgba(0, 217, 255, 0.28)";
        ctx.lineWidth = 1.1;
        ctx.setLineDash([3, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Animate Traveling Light Telemetry Packet
        if (!prefersReducedMotion) {
          const packetT = (time * conn.speed * 40 + conn.offset) % 1;
          const px = Math.pow(1 - packetT, 2) * n1.x + 2 * (1 - packetT) * packetT * midX + Math.pow(packetT, 2) * n2.x;
          const py = Math.pow(1 - packetT, 2) * n1.y + 2 * (1 - packetT) * packetT * midY + Math.pow(packetT, 2) * n2.y;

          ctx.beginPath();
          ctx.arc(px, py, 2.6, 0, Math.PI * 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.shadowColor = "#00D9FF";
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // 8. Render Nodes, Vertical Connector Lines, and HUD Concept Chips
      for (let i = 0; i < projectedNodes.length; i++) {
        const pn = projectedNodes[i];
        if (!pn) continue;

        // A. Glowing Node Dot
        if (pn.node.isApex) {
          // Dominant Peak Radiant Apex Beacon
          ctx.beginPath();
          ctx.arc(pn.x, pn.y, 4.5 * pn.scale * pn.pulse, 0, Math.PI * 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.shadowColor = "#00D9FF";
          ctx.shadowBlur = 20;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.beginPath();
          ctx.arc(pn.x, pn.y, (pn.node.isCore ? 4.0 : 2.8) * pn.scale * pn.pulse, 0, Math.PI * 2);
          ctx.fillStyle = pn.node.color;
          ctx.shadowColor = pn.node.color;
          ctx.shadowBlur = 12 * pn.scale;
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // B. Vertical Connector Line to Floating Chip
        if (pn.node.label) {
          const chipX = pn.x + pn.node.chipOffset.x;
          const chipY = pn.y + pn.node.chipOffset.y;

          ctx.beginPath();
          ctx.moveTo(pn.x, pn.y);
          ctx.lineTo(chipX, chipY + (pn.node.lineUp ? 12 : -12));
          ctx.strokeStyle = "rgba(0, 217, 255, 0.45)";
          ctx.lineWidth = 0.85;
          ctx.stroke();

          // C. HUD Chip Container
          const fontSize = Math.max(9, Math.floor(10 * pn.scale));
          ctx.font = `600 ${fontSize}px ui-monospace, monospace`;

          const textMetrics = ctx.measureText(pn.node.label);
          const chipW = textMetrics.width + 14;
          const chipH = fontSize + 8;
          const rectX = chipX - chipW / 2;
          const rectY = chipY - chipH / 2;

          // Chip Background
          ctx.fillStyle = "rgba(5, 12, 22, 0.92)";
          ctx.fillRect(rectX, rectY, chipW, chipH);

          // Chip Border (Special highlight for FAIL vs normal)
          if (pn.node.isFail) {
            ctx.strokeStyle = "rgba(255, 77, 77, 0.45)";
          } else {
            ctx.strokeStyle = "rgba(0, 217, 255, 0.35)";
          }
          ctx.lineWidth = 0.85;
          ctx.strokeRect(rectX, rectY, chipW, chipH);

          // Chip Text
          if (pn.node.isFail) {
            ctx.fillStyle = "#00D9FF";
            ctx.fillText("CIS-1.2.1 / ", rectX + 7, rectY + fontSize);
            const prefixW = ctx.measureText("CIS-1.2.1 / ").width;
            ctx.fillStyle = "#FF4D4D";
            ctx.fillText("FAIL", rectX + 7 + prefixW, rectY + fontSize);
          } else {
            ctx.fillStyle = pn.node.color;
            ctx.fillText(pn.node.label, rectX + 7, rectY + fontSize);
          }
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
          "radial-gradient(ellipse 95% 92% at 55% 48%, black 60%, rgba(0,0,0,0.6) 82%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 95% 92% at 55% 48%, black 60%, rgba(0,0,0,0.6) 82%, transparent 100%)",
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block opacity-95 transition-opacity duration-1000"
      />
    </div>
  );
}
