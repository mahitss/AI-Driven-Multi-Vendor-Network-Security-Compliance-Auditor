"use client";

import React, { useEffect, useRef } from "react";

/**
 * TopographicScene
 * 
 * 1:1 Pixel-Accurate 3D Security Topography matching Reference 1:
 * - Foreground Mountain Cone with radiant beacon & concentric elevation contour rings
 * - Upper-Center JunOS Mountain Peak with vertical pin to floating chip
 * - Upper-Right FortiOS Mountain Peak with vertical pin to floating chip
 * - Left Cisco Shoulder Mountain with connector pin to floating chip
 * - Right Flank Slope Nodes: "CIS-1.2.1 / FAIL", "AI_ADVISORY:READ_ONLY", "REMOTE_PUSH:ABSENT"
 * - Luminous curved cyan spline arcs with moving white-cyan light packets
 * - Volumetric wireframe depth and subtle interactive mouse parallax
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
    const gridCols = 54;
    const gridRows = 44;
    const gridWidth = 1180;
    const gridDepth = 960;

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

    // 8 Telemetry Nodes Matching Reference 1
    const nodes = [
      // 0: Foreground Beacon Node (Center-Bottom Cone Apex)
      { id: "beacon", x: -30, z: 180, label: "", color: "#FFFFFF", isBeacon: true, chipOffset: { x: 0, y: 0 }, lineDir: "none" },
      // 1: JunOS Peak (Upper-Center Peak)
      { id: "junos", x: 40, z: -140, label: "JUNOS → AST → USM", color: "#00D9FF", isBeacon: false, chipOffset: { x: 0, y: -48 }, lineDir: "up" },
      // 2: FortiOS Peak (Upper-Right Flank Peak)
      { id: "fortios", x: 340, z: -80, label: "FORTIOS → AST → USM", color: "#00D9FF", isBeacon: false, chipOffset: { x: 0, y: -48 }, lineDir: "up" },
      // 3: Cisco IOS (Mid-Left Slope)
      { id: "cisco", x: -260, z: 20, label: "CISCO IOS → AST → USM", color: "#00D9FF", isBeacon: false, chipOffset: { x: -20, y: -38 }, lineDir: "up" },
      // 4: Midground Ridge Node (between Cisco and JunOS)
      { id: "mid_node", x: -100, z: -60, label: "", color: "#00D9FF", isBeacon: false, chipOffset: { x: 0, y: 0 }, lineDir: "none" },
      // 5: CIS-1.2.1 / FAIL (Right Flank Upper)
      { id: "cis_fail", x: 360, z: 30, label: "CIS-1.2.1 / FAIL", color: "#00D9FF", isBeacon: false, chipOffset: { x: 0, y: -34 }, lineDir: "up", isFail: true },
      // 6: AI Advisory (Right Flank Mid)
      { id: "ai_advisory", x: 340, z: 140, label: "AI_ADVISORY:READ_ONLY", color: "#00D9FF", isBeacon: false, chipOffset: { x: 0, y: -32 }, lineDir: "up" },
      // 7: Remote Push Absent (Right Flank Lower)
      { id: "remote_push", x: 340, z: 240, label: "REMOTE_PUSH:ABSENT", color: "#00D9FF", isBeacon: false, chipOffset: { x: 0, y: -32 }, lineDir: "up" },
    ];

    // Luminous Curved Network Connection Splines
    const connections = [
      { from: 0, to: 3, speed: 0.007, offset: 0 },
      { from: 0, to: 4, speed: 0.008, offset: 0.2 },
      { from: 4, to: 1, speed: 0.007, offset: 0.4 },
      { from: 1, to: 2, speed: 0.006, offset: 0.6 },
      { from: 0, to: 2, speed: 0.008, offset: 0.15 },
      { from: 2, to: 5, speed: 0.007, offset: 0.35 },
      { from: 5, to: 6, speed: 0.008, offset: 0.55 },
      { from: 6, to: 7, speed: 0.006, offset: 0.75 },
    ];

    let time = 0;

    // 3D Topographical Elevation Function Matching Reference 1
    const getElevation = (x: number, z: number, t: number) => {
      // 1. Prominent Foreground Cone / Mountain Peak (Center-Bottom)
      const distConeSq = Math.pow(x + 30, 2) + Math.pow(z - 180, 2);
      const foregroundCone = 230 * Math.exp(-distConeSq / 36000);

      // 2. Upper-Center JunOS Ridge Peak
      const distJunosSq = Math.pow(x - 40, 2) + Math.pow(z + 140, 2);
      const junosPeak = 185 * Math.exp(-distJunosSq / 38000);

      // 3. Upper-Right FortiOS Flank Peak
      const distFortiosSq = Math.pow(x - 340, 2) + Math.pow(z + 80, 2);
      const fortiosPeak = 195 * Math.exp(-distFortiosSq / 40000);

      // 4. Left Cisco Shoulder Ridge
      const distCiscoSq = Math.pow(x + 260, 2) + Math.pow(z - 20, 2);
      const ciscoPeak = 145 * Math.exp(-distCiscoSq / 44000);

      // 5. Connecting Saddle Ridges & Valleys
      const saddle1 = 80 * Math.exp(-Math.pow((x + 80) / 150, 2) - Math.pow((z + 20) / 130, 2));
      const saddle2 = 90 * Math.exp(-Math.pow((x - 200) / 160, 2) - Math.pow((z - 40) / 140, 2));

      if (prefersReducedMotion) {
        return -(foregroundCone + junosPeak + fortiosPeak + ciscoPeak + saddle1 + saddle2);
      }

      // Continuous subtle organic wave ripples
      const wave = 9 * Math.sin(x * 0.008 - t * 0.35) * Math.cos(z * 0.007 + t * 0.3);
      return -(foregroundCone + junosPeak + fortiosPeak + ciscoPeak + saddle1 + saddle2 + wave);
    };

    // 3D Perspective Projection Function
    const project3D = (
      x: number,
      y: number,
      z: number,
      width: number,
      height: number,
      rotX: number,
      rotY: number
    ) => {
      // Y-axis Yaw
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;

      // X-axis Pitch
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const y2 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;

      const fov = 680;
      const cameraDist = 820;
      const pz = z2 + cameraDist;

      if (pz <= 10) return null;

      const scale = fov / pz;
      // Center of projection placed in middle-left of the right 68% canvas container
      const screenX = width * 0.44 + x1 * scale;
      const screenY = height * 0.52 + y2 * scale;

      return { x: screenX, y: screenY, scale, pz, rawX: x1, rawY: y2, rawZ: z2 };
    };

    const render = () => {
      const width = canvas.parentElement?.clientWidth || 1000;
      const height = canvas.parentElement?.clientHeight || 800;

      if (!prefersReducedMotion) {
        time += 0.006;
        targetRotX += (0.44 + mouseY * 0.04 - targetRotX) * 0.04;
        targetRotY += (-0.18 + mouseX * 0.05 - targetRotY) * 0.04;
      } else {
        targetRotX = 0.44;
        targetRotY = -0.18;
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Soft Ambient Teal/Cyan Atmospheric Illumination Center
      const centerGlow = ctx.createRadialGradient(
        width * 0.46,
        height * 0.48,
        25,
        width * 0.46,
        height * 0.52,
        width * 0.68
      );
      centerGlow.addColorStop(0, "rgba(0, 217, 255, 0.12)");
      centerGlow.addColorStop(0.4, "rgba(0, 201, 139, 0.035)");
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
        const lineAlpha = 0.06 + Math.pow(depthRatio, 1.25) * 0.44;

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

        const isPeakRow = r === 10 || r === 16 || r === 24 || r === 32 || r === gridRows - 1;
        if (isPeakRow && depthRatio > 0.25) {
          ctx.shadowColor = "rgba(0, 217, 255, 0.65)";
          ctx.shadowBlur = 8;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.strokeStyle = `rgba(0, 217, 255, ${lineAlpha})`;
        ctx.lineWidth = 0.85 + depthRatio * 0.7;
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
        const ribAlpha = 0.035 + (1 - colDepth) * 0.06;
        ctx.strokeStyle = `rgba(0, 201, 139, ${ribAlpha})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }

      // 5. Concentric Elevation Contour Rings Around Foreground Beacon Peak
      for (let radius = 20; radius <= 190; radius += 26) {
        ctx.beginPath();
        let ringStarted = false;
        const ringSegments = 40;

        for (let a = 0; a <= ringSegments; a++) {
          const angle = (a / ringSegments) * Math.PI * 2;
          const rx = -30 + Math.cos(angle) * radius * 1.35;
          const rz = 180 + Math.sin(angle) * radius * 0.95;
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

        const ringAlpha = 0.15 + (190 - radius) * 0.0016;
        ctx.strokeStyle = `rgba(0, 217, 255, ${ringAlpha})`;
        ctx.lineWidth = 1.0;
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

      // 7. Render Luminous Curved Spline Arcs & Traveling Light Telemetry Packets
      for (const conn of connections) {
        const n1 = projectedNodes[conn.from];
        const n2 = projectedNodes[conn.to];
        if (!n1 || !n2) continue;

        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        const midX = (n1.x + n2.x) / 2;
        const midY = Math.min(n1.y, n2.y) - 28;
        ctx.quadraticCurveTo(midX, midY, n2.x, n2.y);

        ctx.strokeStyle = "rgba(0, 217, 255, 0.35)";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Animate Traveling Light Telemetry Packet
        if (!prefersReducedMotion) {
          const packetT = (time * conn.speed * 40 + conn.offset) % 1;
          const px = Math.pow(1 - packetT, 2) * n1.x + 2 * (1 - packetT) * packetT * midX + Math.pow(packetT, 2) * n2.x;
          const py = Math.pow(1 - packetT, 2) * n1.y + 2 * (1 - packetT) * packetT * midY + Math.pow(packetT, 2) * n2.y;

          ctx.beginPath();
          ctx.arc(px, py, 2.8, 0, Math.PI * 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.shadowColor = "#00D9FF";
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // 8. Render Nodes, Vertical Connector Lines, and HUD Concept Chips
      for (let i = 0; i < projectedNodes.length; i++) {
        const pn = projectedNodes[i];
        if (!pn) continue;

        // A. Glowing Node Dot
        if (pn.node.isBeacon) {
          // Radiant White-Cyan Foreground Beacon Node
          ctx.beginPath();
          ctx.arc(pn.x, pn.y, 5.0 * pn.scale * pn.pulse, 0, Math.PI * 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.shadowColor = "#00D9FF";
          ctx.shadowBlur = 26;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.beginPath();
          ctx.arc(pn.x, pn.y, 3.2 * pn.scale * pn.pulse, 0, Math.PI * 2);
          ctx.fillStyle = pn.node.color;
          ctx.shadowColor = pn.node.color;
          ctx.shadowBlur = 14 * pn.scale;
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // B. Vertical Connector Line to Floating Chip
        if (pn.node.label && pn.node.lineDir === "up") {
          const chipX = pn.x + pn.node.chipOffset.x;
          const chipY = pn.y + pn.node.chipOffset.y;

          ctx.beginPath();
          ctx.moveTo(pn.x, pn.y);
          ctx.lineTo(chipX, chipY + 14);
          ctx.strokeStyle = "rgba(0, 217, 255, 0.55)";
          ctx.lineWidth = 0.9;
          ctx.stroke();

          // C. HUD Chip Container
          const fontSize = Math.max(9.5, Math.floor(10.5 * pn.scale));
          ctx.font = `600 ${fontSize}px ui-monospace, monospace`;

          const textMetrics = ctx.measureText(pn.node.label);
          const chipW = textMetrics.width + 16;
          const chipH = fontSize + 9;
          const rectX = chipX - chipW / 2;
          const rectY = chipY - chipH / 2;

          // Chip Background
          ctx.fillStyle = "rgba(5, 12, 22, 0.94)";
          ctx.fillRect(rectX, rectY, chipW, chipH);

          // Chip Border
          if (pn.node.isFail) {
            ctx.strokeStyle = "rgba(255, 77, 77, 0.55)";
          } else {
            ctx.strokeStyle = "rgba(0, 217, 255, 0.45)";
          }
          ctx.lineWidth = 0.9;
          ctx.strokeRect(rectX, rectY, chipW, chipH);

          // Chip Text
          if (pn.node.isFail) {
            ctx.fillStyle = "#00D9FF";
            ctx.fillText("CIS-1.2.1 / ", rectX + 8, rectY + fontSize + 1);
            const prefixW = ctx.measureText("CIS-1.2.1 / ").width;
            ctx.fillStyle = "#FF4D4D";
            ctx.fillText("FAIL", rectX + 8 + prefixW, rectY + fontSize + 1);
          } else {
            ctx.fillStyle = pn.node.color;
            ctx.fillText(pn.node.label, rectX + 8, rectY + fontSize + 1);
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
          "radial-gradient(ellipse 95% 92% at 50% 48%, black 62%, rgba(0,0,0,0.6) 84%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 95% 92% at 50% 48%, black 62%, rgba(0,0,0,0.6) 84%, transparent 100%)",
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block opacity-95 transition-opacity duration-1000"
      />
    </div>
  );
}
