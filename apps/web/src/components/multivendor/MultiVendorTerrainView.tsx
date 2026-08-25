"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
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
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.parentElement?.clientWidth || 700;
      const height = canvas.parentElement?.clientHeight || 560;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // 3D Grid Parameters
    const gridCols = 46;
    const gridRows = 38;
    const gridWidth = 920;
    const gridDepth = 760;

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

    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Check click against projected node positions
      for (const node of projectedNodes) {
        const dist = Math.hypot(clickX - node.screenX, clickY - node.screenY);
        if (dist < 28) {
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

    // 3D Node Map: Vendors -> Universal Model -> Frameworks & Evidence
    const terrainNodes = [
      // 0: Central Universal Security Model (Peak 1)
      { id: "usm", x: 0, z: 0, title: "UNIVERSAL SECURITY MODEL", category: "NORMALIZED HUB", desc: "Canonical AST slot representation across all vendors", color: "#00D9FF", isHub: true, chipOffset: { x: 0, y: -50 } },
      // 1: Cisco IOS (West Peak)
      { id: "cisco", vendorId: "cisco", x: -260, z: -80, title: "CISCO IOS / XE", category: "VENDOR INGEST", desc: "ip ssh version 1 → remote_access.ssh_version=1", color: "#00D9FF", chipOffset: { x: -10, y: -42 } },
      // 2: Juniper JunOS (North Peak)
      { id: "juniper", vendorId: "juniper", x: 0, z: -260, title: "JUNIPER JUNOS", category: "VENDOR INGEST", desc: "set system services ssh protocol-version v1", color: "#10B981", chipOffset: { x: 0, y: -42 } },
      // 3: Fortinet FortiOS (East Peak)
      { id: "fortinet", vendorId: "fortinet", x: 260, z: -80, title: "FORTINET FORTIOS", category: "VENDOR INGEST", desc: "set admin-ssh-v1 enable → remote_access.ssh_version=1", color: "#F59E0B", chipOffset: { x: 10, y: -42 } },
      // 4: CIS Benchmark (South-West)
      { id: "cis", frameworkId: "CIS", x: -180, z: 180, title: "CIS BENCHMARK", category: "FRAMEWORK", desc: "CIS-1.2.1: SSH v1 prohibited (Evaluated: FAIL)", color: "#EF4444", verdict: "FAIL", line: 17, chipOffset: { x: -10, y: -38 } },
      // 5: NIST SP 800-53 (South-Mid-Left)
      { id: "nist", frameworkId: "NIST", x: -60, z: 220, title: "NIST SP 800-53", category: "FRAMEWORK", desc: "NIST AC-17: Remote access control validation", color: "#EF4444", verdict: "FAIL", line: 17, chipOffset: { x: 0, y: -38 } },
      // 6: DISA STIG (South-Mid-Right)
      { id: "stig", frameworkId: "STIG", x: 60, z: 220, title: "DISA STIG", category: "FRAMEWORK", desc: "STIG NET-001: Cryptographic transport posture", color: "#EF4444", verdict: "FAIL", line: 17, chipOffset: { x: 0, y: -38 } },
      // 7: ISO 27001 (South-East)
      { id: "iso", frameworkId: "ISO", x: 180, z: 180, title: "ISO/IEC 27001", category: "FRAMEWORK", desc: "ISO A.13.1: Network security services control", color: "#EF4444", verdict: "FAIL", line: 17, chipOffset: { x: 10, y: -38 } },
    ];

    // Spline Flow Connections
    const flowPipes = [
      // Vendor to USM
      { from: 1, to: 0, vendor: "cisco", speed: 0.008, offset: 0 },
      { from: 2, to: 0, vendor: "juniper", speed: 0.008, offset: 0.33 },
      { from: 3, to: 0, vendor: "fortinet", speed: 0.008, offset: 0.66 },
      // USM to Frameworks
      { from: 0, to: 4, framework: "CIS", speed: 0.007, offset: 0.15 },
      { from: 0, to: 5, framework: "NIST", speed: 0.007, offset: 0.35 },
      { from: 0, to: 6, framework: "STIG", speed: 0.007, offset: 0.55 },
      { from: 0, to: 7, framework: "ISO", speed: 0.007, offset: 0.75 },
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

    // Terrain Elevation Function: 4 Summits (USM Center + 3 Vendor Flanks)
    const getElevation = (x: number, z: number): number => {
      // 1. Central USM Pyramid Summit
      const distUSM = Math.hypot(x, z);
      const hUSM = 160 * Math.exp(-Math.pow(distUSM / 150, 1.8));

      // 2. Cisco West Pyramid Summit
      const distCisco = Math.hypot(x - (-260), z - (-80));
      const hCisco = 110 * Math.exp(-Math.pow(distCisco / 110, 1.8));

      // 3. Juniper North Pyramid Summit
      const distJuniper = Math.hypot(x - 0, z - (-260));
      const hJuniper = 110 * Math.exp(-Math.pow(distJuniper / 110, 1.8));

      // 4. Fortinet East Pyramid Summit
      const distFortinet = Math.hypot(x - 260, z - (-80));
      const hFortinet = 110 * Math.exp(-Math.pow(distFortinet / 110, 1.8));

      // 5. Downstream Framework Ridge (South)
      const distSouth = Math.hypot(x, z - 200);
      const hSouth = 45 * Math.exp(-Math.pow(distSouth / 220, 1.6));

      return hUSM + hCisco + hJuniper + hFortinet + hSouth;
    };

    let tick = 0;

    const render = () => {
      tick += 1;
      const width = canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
      const height = canvas.height / (Math.min(window.devicePixelRatio || 1, 2));

      ctx.clearRect(0, 0, width, height);

      // Smooth camera interpolation
      if (!prefersReducedMotion) {
        targetRotX += (mouseX * 0.08 - targetRotX) * 0.05;
        targetRotY += (mouseY * 0.06 - targetRotY) * 0.05;
      }

      const camHeight = 310;
      const camPitch = 0.58 + targetRotY * 0.15;
      const camYaw = targetRotX * 0.25;

      const cosYaw = Math.cos(camYaw);
      const sinYaw = Math.sin(camYaw);
      const cosPitch = Math.cos(camPitch);
      const sinPitch = Math.sin(camPitch);

      const fov = 460;
      const centerX = width * 0.5;
      const centerY = height * 0.52;

      // Project 3D coordinate to 2D screen
      const project = (x3: number, y3: number, z3: number) => {
        // Rotate Yaw
        const xRot = x3 * cosYaw - z3 * sinYaw;
        const zRot = x3 * sinYaw + z3 * cosYaw;

        // Rotate Pitch
        const yCam = -y3 + camHeight;
        const yRot = yCam * cosPitch - zRot * sinPitch;
        const depth = yCam * sinPitch + zRot * cosPitch + 600;

        const scale = fov / Math.max(depth, 50);
        const screenX = centerX + xRot * scale;
        const screenY = centerY + yRot * scale;

        return { x: screenX, y: screenY, depth, scale };
      };

      // 1. Draw 3D Topographic Contour Grid
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

        const depthFade = Math.max(0.04, 0.28 - (normR * 0.2));
        ctx.strokeStyle = `rgba(0, 217, 255, ${depthFade * 0.45})`;
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

        ctx.strokeStyle = "rgba(0, 217, 255, 0.06)";
        ctx.stroke();
      }

      // 2. Project Nodes
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

      // 3. Draw Flowing Splines & Packets
      flowPipes.forEach((pipe) => {
        const srcNode = projectedNodes[pipe.from];
        const dstNode = projectedNodes[pipe.to];
        if (!srcNode || !dstNode) return;

        const isHighlighted =
          (selectedVendor && pipe.vendor === selectedVendor) ||
          (selectedFramework && pipe.framework === selectedFramework) ||
          (!selectedVendor && !selectedFramework);

        const alpha = isHighlighted ? 0.75 : 0.15;
        const pipeColor = pipe.vendor === "fortinet" ? "rgba(245, 158, 11," : pipe.vendor === "juniper" ? "rgba(16, 185, 129," : "rgba(0, 217, 255,";

        // Draw Spline Curve
        ctx.beginPath();
        ctx.moveTo(srcNode.screenX, srcNode.screenY);
        const midX = (srcNode.screenX + dstNode.screenX) * 0.5;
        const midY = (srcNode.screenY + dstNode.screenY) * 0.5 - 20;
        ctx.quadraticCurveTo(midX, midY, dstNode.screenX, dstNode.screenY);
        ctx.strokeStyle = `${pipeColor} ${alpha})`;
        ctx.lineWidth = isHighlighted ? 2 : 1;
        ctx.stroke();

        // Draw Moving Light Packets
        if (!prefersReducedMotion) {
          const t = ((tick * pipe.speed + pipe.offset) % 1 + 1) % 1;
          const omt = 1 - t;
          const pktX = omt * omt * srcNode.screenX + 2 * omt * t * midX + t * t * dstNode.screenX;
          const pktY = omt * omt * srcNode.screenY + 2 * omt * t * midY + t * t * dstNode.screenY;

          ctx.beginPath();
          ctx.arc(pktX, pktY, isHighlighted ? 3.5 : 2, 0, Math.PI * 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.shadowColor = "#00D9FF";
          ctx.shadowBlur = isHighlighted ? 8 : 2;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // 4. Draw Nodes, Rings, and Pins
      projectedNodes.forEach((pn) => {
        const { screenX, screenY, node } = pn;
        const isSelected =
          (node.vendorId && selectedVendor === node.vendorId) ||
          (node.frameworkId && selectedFramework === node.frameworkId) ||
          (node.isHub && !selectedVendor && !selectedFramework);

        // Ground Ring
        ctx.beginPath();
        ctx.arc(screenX, screenY, node.isHub ? 14 : 9, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected ? "#FFFFFF" : node.color;
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.stroke();

        // Center Dot
        ctx.beginPath();
        ctx.arc(screenX, screenY, node.isHub ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? "#FFFFFF" : node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = isSelected ? 16 : 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Vertical Pin Line to Floating Chip
        const chipX = screenX + node.chipOffset.x;
        const chipY = screenY + node.chipOffset.y;

        ctx.beginPath();
        ctx.moveTo(screenX, screenY - 6);
        ctx.lineTo(chipX, chipY + 12);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Floating Chip Label Box
        ctx.font = "bold 10px monospace";
        const titleWidth = ctx.measureText(node.title).width;
        const boxWidth = Math.max(titleWidth + 18, 90);
        const boxHeight = 22;
        const boxLeft = chipX - boxWidth * 0.5;
        const boxTop = chipY - boxHeight * 0.5;

        // Background
        ctx.fillStyle = isSelected ? "#070C18" : "#05070B";
        ctx.fillRect(boxLeft, boxTop, boxWidth, boxHeight);

        // Border
        ctx.strokeStyle = isSelected ? "#00D9FF" : "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = isSelected ? 1.5 : 1;
        ctx.strokeRect(boxLeft, boxTop, boxWidth, boxHeight);

        // Text
        ctx.fillStyle = isSelected ? "#FFFFFF" : "#E2E8F0";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(node.title, chipX, chipY);
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
  }, [selectedVendor, selectedFramework, onSelectVendor, onSelectFramework, onSelectNodeInfo]);

  return (
    <div className="relative w-full h-[480px] sm:h-[540px] lg:h-[600px] rounded-2xl bg-[#03060A] border border-white/[0.08] overflow-hidden select-none">
      {/* 3D WebGL / Canvas Viewport */}
      <canvas ref={canvasRef} className="w-full h-full cursor-pointer block" />

      {/* Viewport Overlay Controls */}
      <div className="absolute top-4 left-4 font-mono text-[11px] space-y-1 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00D9FF] animate-pulse" />
          <span className="text-[#00D9FF] font-bold tracking-wider">3D SECURITY TERRAIN</span>
        </div>
        <div className="text-[#64748B] text-[10px]">CLICK NODES TO TRACE CONVERGENCE</div>
      </div>

      {/* Reset Camera / Filter Button */}
      {(selectedVendor || selectedFramework) && (
        <button
          onClick={() => {
            onSelectVendor(null);
            onSelectFramework(null);
            if (onSelectNodeInfo) onSelectNodeInfo(null);
          }}
          className="absolute top-4 right-4 px-3 py-1 rounded-md bg-[#0B0F19] hover:bg-[#141B2D] border border-white/[0.12] text-[#00D9FF] text-xs font-mono font-semibold transition-all shadow-md active:scale-95"
        >
          Reset View ↺
        </button>
      )}

      {/* Downstream Invariant Footnote */}
      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between font-mono text-[10px] text-[#64748B] pointer-events-none border-t border-white/[0.04] pt-2">
        <div className="flex items-center gap-3">
          <span>[3 VENDORS]</span>
          <span>→</span>
          <span className="text-[#00D9FF]">[1 UNIVERSAL MODEL]</span>
          <span>→</span>
          <span>[4 FRAMEWORKS]</span>
        </div>
        <div>IMMUTABLE AST PROOF</div>
      </div>
    </div>
  );
}
