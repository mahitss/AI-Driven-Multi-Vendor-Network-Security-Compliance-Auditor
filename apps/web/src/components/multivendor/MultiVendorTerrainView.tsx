"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface MultiVendorTerrainViewProps {
  selectedVendor: "cisco" | "juniper" | "fortinet" | null;
  onSelectVendor: (vendor: "cisco" | "juniper" | "fortinet" | null) => void;
  selectedFramework: "CIS" | "NIST" | "STIG" | "ISO" | null;
  onSelectFramework: (framework: "CIS" | "NIST" | "STIG" | "ISO" | null) => void;
  onSelectNodeInfo?: (info: { title: string; category: string; description: string; verdict?: string; line?: number } | null) => void;
}

export default function MultiVendorTerrainView({
  selectedVendor,
  onSelectVendor,
  selectedFramework,
  onSelectFramework,
  onSelectNodeInfo,
}: MultiVendorTerrainViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.parentElement?.clientWidth || 720;
      const height = canvas.parentElement?.clientHeight || 620;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // 3D Grid Parameters (Wider & more detailed)
    const gridCols = 52;
    const gridRows = 44;
    const gridWidth = 1100;
    const gridDepth = 900;

    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      if (!prefersReducedMotion) {
        const normX = (clientX - rect.width / 2) / (rect.width / 2);
        const normY = (clientY - rect.height / 2) / (rect.height / 2);
        mouseX = normX;
        mouseY = normY;
      }

      // Check hover on projected nodes
      let found: string | null = null;
      for (const node of projectedNodes) {
        const dist = Math.hypot(clientX - node.screenX, clientY - node.screenY);
        if (dist < 32) {
          found = node.node.id;
          break;
        }
      }
      setHoveredNodeId(found);
      canvas.style.cursor = found ? "pointer" : "default";
    };

    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Check click against projected node positions
      for (const node of projectedNodes) {
        const dist = Math.hypot(clickX - node.screenX, clickY - node.screenY);
        if (dist < 32) {
          if (node.vendorId) {
            onSelectVendor(selectedVendor === node.vendorId ? null : (node.vendorId as any));
          } else if (node.frameworkId) {
            onSelectFramework(selectedFramework === node.frameworkId ? null : (node.frameworkId as any));
          }
          if (onSelectNodeInfo) {
            onSelectNodeInfo({
              title: node.title,
              category: node.category,
              description: node.desc,
              verdict: node.verdict,
              line: node.line,
            });
          }
          return;
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    canvas.addEventListener("click", handleCanvasClick);

    // 3D Node Map: Well-spaced layout with zero overlapping labels
    const terrainNodes = [
      // 0: Central Universal Security Model (Peak 1 - Glowing Hub)
      {
        id: "usm",
        x: 0,
        z: -10,
        title: "UNIVERSAL SECURITY MODEL",
        subtitle: "NORMALIZED AST SEMANTICS",
        category: "CANONICAL MODEL",
        desc: "Normalized multi-vendor AST representation across Cisco, Juniper & Fortinet",
        color: "#00D9FF",
        isHub: true,
        chipOffset: { x: 0, y: -68 },
      },
      // 1: Cisco IOS (West Peak)
      {
        id: "cisco",
        vendorId: "cisco",
        x: -320,
        z: -90,
        title: "CISCO IOS",
        subtitle: "CLI Native Parser",
        category: "VENDOR INGEST",
        desc: "ip ssh version 1 → remote_access.ssh_version = 1",
        color: "#00D9FF",
        chipOffset: { x: -15, y: -50 },
      },
      // 2: Juniper JunOS (North Peak)
      {
        id: "juniper",
        vendorId: "juniper",
        x: 0,
        z: -330,
        title: "JUNIPER JUNOS",
        subtitle: "Set / Hierarchical Parser",
        category: "VENDOR INGEST",
        desc: "set system services ssh protocol-version v1 → remote_access.ssh_version = 1",
        color: "#10B981",
        chipOffset: { x: 0, y: -50 },
      },
      // 3: Fortinet FortiOS (East Peak)
      {
        id: "fortinet",
        vendorId: "fortinet",
        x: 320,
        z: -90,
        title: "FORTINET FORTIOS",
        subtitle: "Config Tree Parser",
        category: "VENDOR INGEST",
        desc: "set admin-ssh-v1 enable → remote_access.ssh_version = 1",
        color: "#F59E0B",
        chipOffset: { x: 15, y: -50 },
      },
      // 4: CIS Benchmark (Far South-West)
      {
        id: "cis",
        frameworkId: "CIS",
        x: -280,
        z: 220,
        title: "CIS BENCHMARK",
        subtitle: "CIS-1.2.1 • LINE 17",
        category: "FRAMEWORK",
        desc: "CIS-1.2.1: SSH Version 1 is strictly prohibited (Evaluated: FAIL)",
        color: "#EF4444",
        verdict: "FAIL",
        line: 17,
        chipOffset: { x: -15, y: -46 },
      },
      // 5: NIST SP 800-53 (South-Mid-West)
      {
        id: "nist",
        frameworkId: "NIST",
        x: -95,
        z: 260,
        title: "NIST SP 800-53",
        subtitle: "NIST AC-17 • LINE 17",
        category: "FRAMEWORK",
        desc: "NIST AC-17: Remote access control validation (Evaluated: FAIL)",
        color: "#EF4444",
        verdict: "FAIL",
        line: 17,
        chipOffset: { x: -5, y: -46 },
      },
      // 6: DISA STIG (South-Mid-East)
      {
        id: "stig",
        frameworkId: "STIG",
        x: 95,
        z: 260,
        title: "DISA STIG",
        subtitle: "STIG NET-001 • LINE 17",
        category: "FRAMEWORK",
        desc: "STIG NET-001: Cryptographic transport security posture (Evaluated: FAIL)",
        color: "#EF4444",
        verdict: "FAIL",
        line: 17,
        chipOffset: { x: 5, y: -46 },
      },
      // 7: ISO 27001 (Far South-East)
      {
        id: "iso",
        frameworkId: "ISO",
        x: 280,
        z: 220,
        title: "ISO/IEC 27001",
        subtitle: "ISO A.13.1 • LINE 17",
        category: "FRAMEWORK",
        desc: "ISO A.13.1: Network security services control (Evaluated: FAIL)",
        color: "#EF4444",
        verdict: "FAIL",
        line: 17,
        chipOffset: { x: 15, y: -46 },
      },
      // 8: Dedicated Evidence Marker (Cisco Line 17 AST Proof)
      {
        id: "ev_cisco",
        x: -390,
        z: 40,
        title: "EVIDENCE: LINE 17",
        subtitle: "SOURCE: CISCO IOS",
        category: "EVIDENCE",
        desc: "ip ssh version 1 [AST Line 17] → CIS-1.2.1: FAIL",
        color: "#EF4444",
        verdict: "FAIL",
        line: 17,
        isEvidence: true,
        chipOffset: { x: -10, y: -42 },
      },
    ];

    // Spline Flow Connections
    const flowPipes = [
      // Vendor to USM Hub
      { from: 1, to: 0, vendor: "cisco", speed: 0.009, offset: 0 },
      { from: 2, to: 0, vendor: "juniper", speed: 0.009, offset: 0.33 },
      { from: 3, to: 0, vendor: "fortinet", speed: 0.009, offset: 0.66 },
      // USM Hub to Frameworks
      { from: 0, to: 4, framework: "CIS", speed: 0.007, offset: 0.12 },
      { from: 0, to: 5, framework: "NIST", speed: 0.007, offset: 0.36 },
      { from: 0, to: 6, framework: "STIG", speed: 0.007, offset: 0.6 },
      { from: 0, to: 7, framework: "ISO", speed: 0.007, offset: 0.84 },
    ];

    let projectedNodes: Array<{
      screenX: number;
      screenY: number;
      depth: number;
      node: typeof terrainNodes[0];
      vendorId?: string;
      frameworkId?: string;
      title: string;
      category: string;
      desc: string;
      verdict?: string;
      line?: number;
    }> = [];

    // Terrain Elevation Function: High dramatic peaks with smooth valleys
    const getElevation = (x: number, z: number): number => {
      // 1. Central USM Majestic Peak
      const distUSM = Math.hypot(x, z - (-10));
      const hUSM = 190 * Math.exp(-Math.pow(distUSM / 160, 1.8));

      // 2. Cisco West Peak
      const distCisco = Math.hypot(x - (-320), z - (-90));
      const hCisco = 135 * Math.exp(-Math.pow(distCisco / 125, 1.8));

      // 3. Juniper North Peak
      const distJuniper = Math.hypot(x - 0, z - (-330));
      const hJuniper = 135 * Math.exp(-Math.pow(distJuniper / 125, 1.8));

      // 4. Fortinet East Peak
      const distFortinet = Math.hypot(x - 320, z - (-90));
      const hFortinet = 135 * Math.exp(-Math.pow(distFortinet / 125, 1.8));

      // 5. Downstream Framework Ridge (South)
      const distSouth = Math.hypot(x, z - 240);
      const hSouth = 55 * Math.exp(-Math.pow(distSouth / 260, 1.6));

      return hUSM + hCisco + hJuniper + hFortinet + hSouth;
    };

    let tick = 0;

    const render = () => {
      tick += 1;
      const width = canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
      const height = canvas.height / (Math.min(window.devicePixelRatio || 1, 2));

      ctx.clearRect(0, 0, width, height);

      // 1. Draw Ambient Radial Glow in the Center of Viewport
      const bgGlow = ctx.createRadialGradient(width * 0.5, height * 0.45, 10, width * 0.5, height * 0.45, width * 0.55);
      bgGlow.addColorStop(0, "rgba(0, 217, 255, 0.08)");
      bgGlow.addColorStop(0.4, "rgba(16, 185, 129, 0.03)");
      bgGlow.addColorStop(1, "rgba(3, 6, 10, 0)");
      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, width, height);

      // Smooth camera interpolation
      if (!prefersReducedMotion) {
        targetRotX += (mouseX * 0.09 - targetRotX) * 0.05;
        targetRotY += (mouseY * 0.07 - targetRotY) * 0.05;
      }

      // Camera parameters centered directly on the terrain
      const camHeight = 225;
      const camPitch = 0.51 + targetRotY * 0.12;
      const camYaw = targetRotX * 0.22;

      const cosYaw = Math.cos(camYaw);
      const sinYaw = Math.sin(camYaw);
      const cosPitch = Math.cos(camPitch);
      const sinPitch = Math.sin(camPitch);

      const fov = 520; // Larger FOV makes graph bigger & more prominent
      const centerX = width * 0.5;
      const centerY = height * 0.45; // Perfectly vertically centered

      // Project 3D coordinate to 2D screen
      const project = (x3: number, y3: number, z3: number) => {
        // Rotate Yaw
        const xRot = x3 * cosYaw - z3 * sinYaw;
        const zRot = x3 * sinYaw + z3 * cosYaw;

        // Rotate Pitch
        const yCam = -y3 + camHeight;
        const yRot = yCam * cosPitch - zRot * sinPitch;
        const depth = yCam * sinPitch + zRot * cosPitch + 500;

        const scale = fov / Math.max(depth, 40);
        const screenX = centerX + xRot * scale;
        const screenY = centerY + yRot * scale;

        return { x: screenX, y: screenY, depth, scale };
      };

      // 2. Draw 3D Topographic Contour Grid
      ctx.lineWidth = 1;

      // Lateral Contour lines
      for (let r = 0; r < gridRows; r++) {
        const normR = r / (gridRows - 1);
        const z = -gridDepth / 2 + normR * gridDepth;

        ctx.beginPath();
        let first = true;

        for (let c = 0; c < gridCols; c++) {
          const normC = c / (gridCols - 1);
          const x = -gridWidth / 2 + normC * gridWidth;
          const elev = getElevation(x, z);
          const p = project(x, elev, z);

          if (p.depth > 0) {
            if (first) {
              ctx.moveTo(p.x, p.y);
              first = false;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          }
        }

        // Elevation-based glow gradient for topographic ridges
        const depthFade = Math.max(0.06, 0.38 - normR * 0.22);
        ctx.strokeStyle = `rgba(0, 217, 255, ${depthFade * 0.55})`;
        ctx.stroke();
      }

      // Longitudinal Perspective Lines
      for (let c = 0; c < gridCols; c += 2) {
        const normC = c / (gridCols - 1);
        const x = -gridWidth / 2 + normC * gridWidth;

        ctx.beginPath();
        let first = true;

        for (let r = 0; r < gridRows; r++) {
          const normR = r / (gridRows - 1);
          const z = -gridDepth / 2 + normR * gridDepth;
          const elev = getElevation(x, z);
          const p = project(x, elev, z);

          if (p.depth > 0) {
            if (first) {
              ctx.moveTo(p.x, p.y);
              first = false;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          }
        }

        ctx.strokeStyle = "rgba(0, 217, 255, 0.08)";
        ctx.stroke();
      }

      // 3. Project Nodes
      projectedNodes = terrainNodes.map((n) => {
        const elev = getElevation(n.x, n.z);
        const p = project(n.x, elev, n.z);
        return {
          screenX: p.x,
          screenY: p.y,
          depth: p.depth,
          node: n,
          vendorId: n.vendorId,
          frameworkId: n.frameworkId,
          title: n.title,
          category: n.category,
          desc: n.desc,
          verdict: n.verdict,
          line: n.line,
        };
      });

      // 4. Draw Flowing Splines & Packets
      flowPipes.forEach((pipe) => {
        const srcNode = projectedNodes[pipe.from];
        const dstNode = projectedNodes[pipe.to];
        if (!srcNode || !dstNode) return;

        const isHighlighted =
          (selectedVendor && pipe.vendor === selectedVendor) ||
          (selectedFramework && pipe.framework === selectedFramework) ||
          (!selectedVendor && !selectedFramework);

        const alpha = isHighlighted ? 0.85 : 0.2;
        const pipeColor =
          pipe.vendor === "fortinet"
            ? "rgba(245, 158, 11,"
            : pipe.vendor === "juniper"
            ? "rgba(16, 185, 129,"
            : "rgba(0, 217, 255,";

        // Draw Spline Curve
        ctx.beginPath();
        ctx.moveTo(srcNode.screenX, srcNode.screenY);
        const midX = (srcNode.screenX + dstNode.screenX) * 0.5;
        const midY = (srcNode.screenY + dstNode.screenY) * 0.5 - 28;
        ctx.quadraticCurveTo(midX, midY, dstNode.screenX, dstNode.screenY);
        ctx.strokeStyle = `${pipeColor} ${alpha})`;
        ctx.lineWidth = isHighlighted ? 2.5 : 1.2;
        ctx.stroke();

        // Draw Moving Light Packets
        if (!prefersReducedMotion) {
          const t = ((tick * pipe.speed + pipe.offset) % 1 + 1) % 1;
          const omt = 1 - t;
          const pktX = omt * omt * srcNode.screenX + 2 * omt * t * midX + t * t * dstNode.screenX;
          const pktY = omt * omt * srcNode.screenY + 2 * omt * t * midY + t * t * dstNode.screenY;

          // Glowing light packet
          ctx.beginPath();
          ctx.arc(pktX, pktY, isHighlighted ? 4 : 2.5, 0, Math.PI * 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.shadowColor = pipe.vendor === "fortinet" ? "#F59E0B" : pipe.vendor === "juniper" ? "#10B981" : "#00D9FF";
          ctx.shadowBlur = isHighlighted ? 12 : 4;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // 5. Draw Glowing Beacon Column at USM Hub
      const hubNode = projectedNodes[0];
      if (hubNode) {
        const beaconGrad = ctx.createLinearGradient(hubNode.screenX, hubNode.screenY, hubNode.screenX, hubNode.screenY - 70);
        beaconGrad.addColorStop(0, "rgba(0, 217, 255, 0.45)");
        beaconGrad.addColorStop(1, "rgba(0, 217, 255, 0)");
        ctx.fillStyle = beaconGrad;
        ctx.fillRect(hubNode.screenX - 2, hubNode.screenY - 70, 4, 70);

        // Pulsing ground ripple
        const rippleScale = (tick * 0.03) % 1;
        ctx.beginPath();
        ctx.arc(hubNode.screenX, hubNode.screenY, 14 + rippleScale * 18, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 217, 255, ${0.4 * (1 - rippleScale)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // 6. Draw Nodes, Rings, and Floating Chips
      projectedNodes.forEach((pn) => {
        const { screenX, screenY, node } = pn;
        const isSelected =
          (node.vendorId && selectedVendor === node.vendorId) ||
          (node.frameworkId && selectedFramework === node.frameworkId) ||
          (node.isHub && !selectedVendor && !selectedFramework);

        const isHovered = hoveredNodeId === node.id;

        // Ground Ring
        const ringRadius = node.isHub ? (isHovered ? 18 : 15) : (isHovered ? 12 : 9);
        ctx.beginPath();
        ctx.arc(screenX, screenY, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected || isHovered ? "#FFFFFF" : node.color;
        ctx.lineWidth = isSelected || isHovered ? 2.5 : 1.5;
        ctx.stroke();

        // Center Glowing Core
        ctx.beginPath();
        ctx.arc(screenX, screenY, node.isHub ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = isSelected || isHovered ? "#FFFFFF" : node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = isSelected || isHovered ? 20 : 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Vertical Pin Line to Floating Chip
        const chipX = screenX + node.chipOffset.x;
        const chipY = screenY + node.chipOffset.y;

        ctx.beginPath();
        ctx.moveTo(screenX, screenY - (node.isHub ? 10 : 7));
        ctx.lineTo(chipX, chipY + 14);
        ctx.strokeStyle = isSelected || isHovered ? "rgba(0, 217, 255, 0.6)" : "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Floating Chip Label Box
        ctx.font = "bold 10px monospace";
        const titleWidth = ctx.measureText(node.title).width;
        ctx.font = "9px monospace";
        const subWidth = node.subtitle ? ctx.measureText(node.subtitle).width : 0;
        const boxWidth = Math.max(Math.max(titleWidth, subWidth) + 24, 100);
        const boxHeight = node.subtitle ? 36 : 24;
        const boxLeft = chipX - boxWidth * 0.5;
        const boxTop = chipY - boxHeight * 0.5;

        // Glassmorphism Card Background
        ctx.fillStyle = isSelected ? "#070F22" : isHovered ? "#0B152A" : "#060911";
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(boxLeft, boxTop, boxWidth, boxHeight, 6);
          ctx.fill();
        } else {
          ctx.fillRect(boxLeft, boxTop, boxWidth, boxHeight);
        }

        // Glowing Card Border
        ctx.strokeStyle = isSelected
          ? "#00D9FF"
          : isHovered
          ? "#38BDF8"
          : (node as any).isEvidence
          ? "rgba(239, 68, 68, 0.5)"
          : "rgba(255, 255, 255, 0.16)";
        ctx.lineWidth = isSelected ? 1.8 : isHovered ? 1.4 : 1;

        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(boxLeft, boxTop, boxWidth, boxHeight, 6);
          ctx.stroke();
        } else {
          ctx.strokeRect(boxLeft, boxTop, boxWidth, boxHeight);
        }

        // Text rendering
        ctx.textAlign = "center";
        if (node.subtitle) {
          ctx.font = "bold 10px monospace";
          ctx.fillStyle = isSelected
            ? "#FFFFFF"
            : isHovered
            ? "#F8FAFC"
            : (node as any).isEvidence
            ? "#EF4444"
            : "#E2E8F0";
          ctx.fillText(node.title, chipX, chipY - 4);

          ctx.font = "8px monospace";
          ctx.fillStyle = isSelected ? "#00D9FF" : isHovered ? "#38BDF8" : "#94A3B8";
          ctx.fillText(node.subtitle, chipX, chipY + 9);
        } else {
          ctx.font = "bold 10px monospace";
          ctx.fillStyle = isSelected ? "#FFFFFF" : "#E2E8F0";
          ctx.textBaseline = "middle";
          ctx.fillText(node.title, chipX, chipY);
        }
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleCanvasClick);
    };
  }, [selectedVendor, selectedFramework, onSelectVendor, onSelectFramework, onSelectNodeInfo, hoveredNodeId]);

  return (
    <div className="relative w-full h-[520px] sm:h-[580px] lg:h-[640px] rounded-2xl bg-[#03060A] border border-white/[0.08] overflow-hidden select-none shadow-[0_0_30px_rgba(0,0,0,0.6)]">
      {/* 3D Canvas Viewport */}
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Viewport Overlay Controls */}
      <div className="absolute top-4 left-4 font-mono text-[11px] space-y-1 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00D9FF] animate-pulse" />
          <span className="text-[#00D9FF] font-extrabold tracking-wider text-xs">3D SECURITY TERRAIN</span>
        </div>
        <div className="text-[#94A3B8] text-[10px]">CLICK OR HOVER NODES TO TRACE CONVERGENCE</div>
      </div>

      {/* Reset Camera / Filter Button */}
      {(selectedVendor || selectedFramework) && (
        <button
          onClick={() => {
            onSelectVendor(null);
            onSelectFramework(null);
            if (onSelectNodeInfo) onSelectNodeInfo(null);
          }}
          className="absolute top-4 right-4 px-3.5 py-1.5 rounded-lg bg-[#0B0F19] hover:bg-[#141B2D] border border-white/[0.12] text-[#00D9FF] text-xs font-mono font-bold transition-all shadow-lg active:scale-95"
        >
          Reset View ↺
        </button>
      )}

      {/* Downstream Invariant Footnote */}
      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between font-mono text-[10px] text-[#64748B] pointer-events-none border-t border-white/[0.06] pt-2">
        <div className="flex items-center gap-3">
          <span>[3 VENDORS]</span>
          <span className="text-white/30">→</span>
          <span className="text-[#00D9FF] font-bold">[1 UNIVERSAL MODEL]</span>
          <span className="text-white/30">→</span>
          <span>[4 FRAMEWORKS]</span>
        </div>
        <div className="text-[#10B981] font-semibold">IMMUTABLE AST PROOF</div>
      </div>
    </div>
  );
}
