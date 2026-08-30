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
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isEvidenceHovered, setIsEvidenceHovered] = useState(false);
  const [evidenceTooltipPos, setEvidenceTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Camera Orbit State
  const camState = useRef({
    yaw: 0,
    pitch: 0.52,
    dist: 560,
    targetYaw: 0,
    targetPitch: 0.52,
    targetDist: 560,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    lastYaw: 0,
    lastPitch: 0.52,
  });

  const resetCamera = useCallback(() => {
    camState.current.targetYaw = 0;
    camState.current.targetPitch = 0.52;
    camState.current.targetDist = 560;
    onSelectVendor(null);
    onSelectFramework(null);
    if (onSelectNodeInfo) onSelectNodeInfo(null);
  }, [onSelectVendor, onSelectFramework, onSelectNodeInfo]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.parentElement?.clientWidth || 740;
      const height = canvas.parentElement?.clientHeight || 640;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // 3D Topographic Mesh Parameters (Substantial, deep & expansive)
    const gridCols = 54;
    const gridRows = 46;
    const gridWidth = 1180;
    const gridDepth = 980;

    // 3D Nodes: Structured Architectural Hierarchy
    const terrainNodes = [
      // 0: Central Universal Security Model (Primary Summit)
      {
        id: "usm",
        x: 0,
        z: -10,
        title: "UNIVERSAL SECURITY MODEL",
        subtitle: "AST NORMALIZATION",
        category: "CANONICAL MODEL",
        desc: "Unified deterministic security facts extracted from vendor configurations",
        color: "#3B82F6",
        isHub: true,
        priority: 1,
        chipOffset: { x: 0, y: -72 },
      },
      // 1: Cisco IOS (West Mountain Summit)
      {
        id: "cisco",
        vendorId: "cisco",
        x: -340,
        z: -90,
        title: "CISCO IOS",
        subtitle: "CLI Native Parser",
        category: "VENDOR INGEST",
        desc: "ip ssh version 1 → remote_access.ssh_version = 1",
        color: "#3B82F6",
        priority: 2,
        chipOffset: { x: -18, y: -52 },
      },
      // 2: Juniper JunOS (North Mountain Summit)
      {
        id: "juniper",
        vendorId: "juniper",
        x: 0,
        z: -340,
        title: "JUNIPER JUNOS",
        subtitle: "Set / Hierarchical Parser",
        category: "VENDOR INGEST",
        desc: "set system services ssh protocol-version v1 → remote_access.ssh_version = 1",
        color: "#10B981",
        priority: 2,
        chipOffset: { x: 0, y: -52 },
      },
      // 3: Fortinet FortiOS (East Mountain Summit)
      {
        id: "fortinet",
        vendorId: "fortinet",
        x: 340,
        z: -90,
        title: "FORTINET FORTIOS",
        subtitle: "Config Tree Parser",
        category: "VENDOR INGEST",
        desc: "set admin-ssh-v1 enable → remote_access.ssh_version = 1",
        color: "#F59E0B",
        priority: 2,
        chipOffset: { x: 18, y: -52 },
      },
      // 4: CIS Benchmark (Downstream South-West Ridge)
      {
        id: "cis",
        frameworkId: "CIS",
        x: -300,
        z: 230,
        title: "CIS BENCHMARK",
        subtitle: "CIS-1.2.1 / FAIL",
        category: "FRAMEWORK",
        desc: "CIS-1.2.1: SSH Version 1 is strictly prohibited (Evaluated: FAIL)",
        color: "#EF4444",
        verdict: "FAIL",
        line: 17,
        priority: 3,
        chipOffset: { x: -15, y: -48 },
      },
      // 5: NIST SP 800-53 (Downstream South-Mid-West Ridge)
      {
        id: "nist",
        frameworkId: "NIST",
        x: -100,
        z: 270,
        title: "NIST SP 800-53",
        subtitle: "NIST AC-17 • LINE 17",
        category: "FRAMEWORK",
        desc: "NIST AC-17: Remote access control validation (Evaluated: FAIL)",
        color: "#EF4444",
        verdict: "FAIL",
        line: 17,
        priority: 3,
        chipOffset: { x: -6, y: -48 },
      },
      // 6: DISA STIG (Downstream South-Mid-East Ridge)
      {
        id: "stig",
        frameworkId: "STIG",
        x: 100,
        z: 270,
        title: "DISA STIG",
        subtitle: "STIG NET-001 • LINE 17",
        category: "FRAMEWORK",
        desc: "STIG NET-001: Cryptographic transport security posture (Evaluated: FAIL)",
        color: "#EF4444",
        verdict: "FAIL",
        line: 17,
        priority: 3,
        chipOffset: { x: 6, y: -48 },
      },
      // 7: ISO 27001 (Downstream South-East Ridge)
      {
        id: "iso",
        frameworkId: "ISO",
        x: 300,
        z: 230,
        title: "ISO/IEC 27001",
        subtitle: "ISO A.13.1 • LINE 17",
        category: "FRAMEWORK",
        desc: "ISO A.13.1: Network security services control (Evaluated: FAIL)",
        color: "#EF4444",
        verdict: "FAIL",
        line: 17,
        priority: 3,
        chipOffset: { x: 15, y: -48 },
      },
      // 8: AST Evidence Marker (Cisco Line 17 AST Proof)
      {
        id: "ev_cisco",
        x: -410,
        z: 50,
        title: "EVIDENCE: [LINE 17]",
        subtitle: "SOURCE: CISCO IOS",
        category: "EVIDENCE",
        desc: "ip ssh version 1 [AST Line 17] → CIS-1.2.1: FAIL",
        color: "#EF4444",
        verdict: "FAIL",
        line: 17,
        isEvidence: true,
        priority: 4,
        chipOffset: { x: -10, y: -44 },
      },
    ];

    // Intermediate AST Gates on Convergence Paths
    const astGates = [
      { id: "ast-cisco", x: -160, z: -50, vendor: "cisco", label: "AST PARSE: CISCO" },
      { id: "ast-juniper", x: 0, z: -170, vendor: "juniper", label: "AST PARSE: JUNOS" },
      { id: "ast-fortinet", x: 160, z: -50, vendor: "fortinet", label: "AST PARSE: FORTIOS" },
    ];

    // Spline Flow Pipelines
    const flowPipes = [
      // Vendors -> AST Gates -> Universal Model
      { from: 1, to: 0, vendor: "cisco", speed: 0.008, offset: 0 },
      { from: 2, to: 0, vendor: "juniper", speed: 0.008, offset: 0.33 },
      { from: 3, to: 0, vendor: "fortinet", speed: 0.008, offset: 0.66 },
      // Evidence Link to Cisco path
      { from: 8, to: 1, vendor: "cisco", speed: 0.006, offset: 0.5 },
      // Universal Model -> Security Frameworks
      { from: 0, to: 4, framework: "CIS", speed: 0.007, offset: 0.12 },
      { from: 0, to: 5, framework: "NIST", speed: 0.007, offset: 0.36 },
      { from: 0, to: 6, framework: "STIG", speed: 0.007, offset: 0.6 },
      { from: 0, to: 7, framework: "ISO", speed: 0.007, offset: 0.84 },
    ];

    // Realistic Elevation Model: High Central Mountain, 3 Flank Peaks, South Framework Ridge
    const getElevation = (x: number, z: number, timeSec: number): number => {
      // 1. Central Dominant Universal Security Model Summit
      const distUSM = Math.hypot(x, z - (-10));
      const hUSM = 210 * Math.exp(-Math.pow(distUSM / 175, 1.85));

      // 2. Cisco West Flank Peak
      const distCisco = Math.hypot(x - (-340), z - (-90));
      const hCisco = 140 * Math.exp(-Math.pow(distCisco / 130, 1.8));

      // 3. Juniper North Flank Peak
      const distJuniper = Math.hypot(x - 0, z - (-340));
      const hJuniper = 140 * Math.exp(-Math.pow(distJuniper / 130, 1.8));

      // 4. Fortinet East Flank Peak
      const distFortinet = Math.hypot(x - 340, z - (-90));
      const hFortinet = 140 * Math.exp(-Math.pow(distFortinet / 130, 1.8));

      // 5. Downstream Framework Ridge (South)
      const distSouth = Math.hypot(x, z - 250);
      const hSouth = 60 * Math.exp(-Math.pow(distSouth / 280, 1.6));

      // Subtle Harmonic Breathing Wave
      const wave = prefersReducedMotion ? 0 : 3.5 * Math.sin(Math.hypot(x, z) / 80 - timeSec * 1.2);

      return hUSM + hCisco + hJuniper + hFortinet + hSouth + wave;
    };

    let projectedNodes: Array<{
      screenX: number;
      screenY: number;
      depth: number;
      node: (typeof terrainNodes)[0];
      vendorId?: string;
      frameworkId?: string;
      title: string;
      category: string;
      desc: string;
      verdict?: string;
      line?: number;
    }> = [];

    // Mouse Interaction Handlers (Orbit Drag & Zoom)
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      camState.current.isDragging = true;
      camState.current.dragStartX = e.clientX;
      camState.current.dragStartY = e.clientY;
      camState.current.lastYaw = camState.current.targetYaw;
      camState.current.lastPitch = camState.current.targetPitch;
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      if (camState.current.isDragging && !prefersReducedMotion) {
        const deltaX = e.clientX - camState.current.dragStartX;
        const deltaY = e.clientY - camState.current.dragStartY;
        camState.current.targetYaw = camState.current.lastYaw + deltaX * 0.005;
        camState.current.targetPitch = Math.max(0.25, Math.min(0.85, camState.current.lastPitch + deltaY * 0.003));
      }

      // Check hover on projected nodes
      let found: string | null = null;
      let evidenceHover = false;
      for (const pNode of projectedNodes) {
        const dist = Math.hypot(clientX - pNode.screenX, clientY - pNode.screenY);
        if (dist < 34) {
          found = pNode.node.id;
          if (pNode.node.id === "ev_cisco") {
            evidenceHover = true;
            setEvidenceTooltipPos({ x: pNode.screenX, y: pNode.screenY });
          }
          break;
        }
      }
      setHoveredNodeId(found);
      setIsEvidenceHovered(evidenceHover);
      canvas.style.cursor = found ? "pointer" : camState.current.isDragging ? "grabbing" : "grab";
    };

    const onMouseUp = () => {
      camState.current.isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY * 0.35;
      camState.current.targetDist = Math.max(380, Math.min(780, camState.current.targetDist + zoomDelta));
    };

    const onCanvasClick = (e: MouseEvent) => {
      if (Math.abs(e.clientX - camState.current.dragStartX) > 6 || Math.abs(e.clientY - camState.current.dragStartY) > 6) {
        return; // was a drag, not a click
      }

      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      for (const pNode of projectedNodes) {
        const dist = Math.hypot(clickX - pNode.screenX, clickY - pNode.screenY);
        if (dist < 34) {
          if (pNode.node.isHub) {
            // Focus on summit
            camState.current.targetYaw = 0;
            camState.current.targetPitch = 0.52;
            camState.current.targetDist = 520;
            onSelectVendor(null);
            onSelectFramework(null);
          } else if (pNode.vendorId) {
            onSelectVendor(selectedVendor === pNode.vendorId ? null : (pNode.vendorId as any));
          } else if (pNode.frameworkId) {
            onSelectFramework(selectedFramework === pNode.frameworkId ? null : (pNode.frameworkId as any));
          }

          if (onSelectNodeInfo) {
            onSelectNodeInfo({
              title: pNode.title,
              category: pNode.category,
              description: pNode.desc,
              verdict: pNode.verdict,
              line: pNode.line,
            });
          }
          return;
        }
      }
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("click", onCanvasClick);

    let tick = 0;

    // Render Loop
    const render = () => {
      tick += 1;
      const timeSec = tick * 0.016;
      const width = canvas.width / Math.min(window.devicePixelRatio || 1, 2);
      const height = canvas.height / Math.min(window.devicePixelRatio || 1, 2);

      ctx.clearRect(0, 0, width, height);

      // Smooth Camera Interpolation (Damping)
      const cs = camState.current;
      cs.yaw += (cs.targetYaw - cs.yaw) * 0.08;
      cs.pitch += (cs.targetPitch - cs.pitch) * 0.08;
      cs.dist += (cs.targetDist - cs.dist) * 0.08;

      const cosYaw = Math.cos(cs.yaw);
      const sinYaw = Math.sin(cs.yaw);
      const cosPitch = Math.cos(cs.pitch);
      const sinPitch = Math.sin(cs.pitch);

      const fov = 540;
      const centerX = width * 0.5;
      const centerY = height * 0.44; // Placed dead-center in the 640px box
      const camHeight = 220;

      // Project 3D coordinate to 2D Screen
      const project = (x3: number, y3: number, z3: number) => {
        // Yaw Rotation
        const xRot = x3 * cosYaw - z3 * sinYaw;
        const zRot = x3 * sinYaw + z3 * cosYaw;

        // Pitch Rotation
        const yCam = -y3 + camHeight;
        const yRot = yCam * cosPitch - zRot * sinPitch;
        const depth = yCam * sinPitch + zRot * cosPitch + cs.dist;

        const scale = fov / Math.max(depth, 30);
        const screenX = centerX + xRot * scale;
        const screenY = centerY + yRot * scale;

        return { x: screenX, y: screenY, depth, scale };
      };

      // 1. LAYER 1: Very Dark Black-Blue Background with Subtle Radial Center Glow
      const bgGlow = ctx.createRadialGradient(centerX, centerY, 20, centerX, centerY, width * 0.55);
      bgGlow.addColorStop(0, "rgba(0, 217, 255, 0.09)");
      bgGlow.addColorStop(0.35, "rgba(16, 185, 129, 0.03)");
      bgGlow.addColorStop(0.7, "rgba(7, 12, 24, 0.4)");
      bgGlow.addColorStop(1, "rgba(3, 6, 10, 0)");
      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, width, height);

      // Subtle Precision Grid Lines along Horizon
      ctx.strokeStyle = "rgba(0, 217, 255, 0.035)";
      ctx.lineWidth = 1;
      for (let i = -width; i < width * 2; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, height * 0.15);
        ctx.lineTo(i + 120, height * 0.95);
        ctx.stroke();
      }

      // 2. LAYER 2: 3D Topographic Terrain Contours with Depth and Elevation Shading
      ctx.lineWidth = 1;

      // Lateral Contour Curves
      for (let r = 0; r < gridRows; r++) {
        const normR = r / (gridRows - 1);
        const z = -gridDepth / 2 + normR * gridDepth;

        ctx.beginPath();
        let first = true;

        for (let c = 0; c < gridCols; c++) {
          const normC = c / (gridCols - 1);
          const x = -gridWidth / 2 + normC * gridWidth;
          const elev = getElevation(x, z, timeSec);
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

        // Depth-based Opacity & Elevation Ridge Highlights
        const depthRatio = Math.max(0.08, Math.min(0.48, 0.42 - normR * 0.25));
        const isMajorContour = r % 4 === 0;

        if (isMajorContour) {
          ctx.strokeStyle = `rgba(0, 217, 255, ${depthRatio * 0.75})`;
          ctx.lineWidth = 1.2;
        } else {
          ctx.strokeStyle = `rgba(0, 217, 255, ${depthRatio * 0.45})`;
          ctx.lineWidth = 0.8;
        }
        ctx.stroke();
      }

      // Longitudinal Perspective Ridge Lines
      for (let c = 0; c < gridCols; c += 2) {
        const normC = c / (gridCols - 1);
        const x = -gridWidth / 2 + normC * gridWidth;

        ctx.beginPath();
        let first = true;

        for (let r = 0; r < gridRows; r++) {
          const normR = r / (gridRows - 1);
          const z = -gridDepth / 2 + normR * gridDepth;
          const elev = getElevation(x, z, timeSec);
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

        ctx.strokeStyle = "rgba(0, 217, 255, 0.055)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // 3. LAYER 3: Project Nodes & Coordinate Markers
      projectedNodes = terrainNodes.map((n) => {
        const elev = getElevation(n.x, n.z, timeSec);
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

      // 4. LAYER 4: Surface-Following Vendor Convergence Paths & AST Transformation Gates
      flowPipes.forEach((pipe) => {
        const srcNode = projectedNodes[pipe.from];
        const dstNode = projectedNodes[pipe.to];
        if (!srcNode || !dstNode) return;

        const isHighlighted =
          (selectedVendor && pipe.vendor === selectedVendor) ||
          (selectedFramework && pipe.framework === selectedFramework) ||
          (hoveredNodeId === srcNode.node.id || hoveredNodeId === dstNode.node.id) ||
          (!selectedVendor && !selectedFramework && !hoveredNodeId);

        const alpha = isHighlighted ? 0.9 : 0.18;
        const pipeColor =
          pipe.vendor === "fortinet"
            ? "rgba(245, 158, 11,"
            : pipe.vendor === "juniper"
            ? "rgba(16, 185, 129,"
            : pipe.framework === "CIS" || pipe.from === 8
            ? "rgba(239, 68, 68,"
            : "rgba(0, 217, 255,";

        // Draw Spline Curve hugging the terrain
        ctx.beginPath();
        ctx.moveTo(srcNode.screenX, srcNode.screenY);
        const midX = (srcNode.screenX + dstNode.screenX) * 0.5;
        const midY = (srcNode.screenY + dstNode.screenY) * 0.5 - 32;
        ctx.quadraticCurveTo(midX, midY, dstNode.screenX, dstNode.screenY);
        ctx.strokeStyle = `${pipeColor} ${alpha})`;
        ctx.lineWidth = isHighlighted ? 2.5 : 1.2;
        ctx.stroke();

        // Flowing Luminescent Energy Particles
        if (!prefersReducedMotion) {
          const t = ((tick * pipe.speed + pipe.offset) % 1 + 1) % 1;
          const omt = 1 - t;
          const pktX = omt * omt * srcNode.screenX + 2 * omt * t * midX + t * t * dstNode.screenX;
          const pktY = omt * omt * srcNode.screenY + 2 * omt * t * midY + t * t * dstNode.screenY;

          // Glowing Particle Core
          ctx.beginPath();
          ctx.arc(pktX, pktY, isHighlighted ? 4 : 2.5, 0, Math.PI * 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.shadowColor = pipe.vendor === "fortinet" ? "#F59E0B" : pipe.vendor === "juniper" ? "#10B981" : "#3B82F6";
          ctx.shadowBlur = isHighlighted ? 14 : 4;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Subtle Particle Trail
          const trailT = Math.max(0, t - 0.04);
          const trailOmt = 1 - trailT;
          const trailX = trailOmt * trailOmt * srcNode.screenX + 2 * trailOmt * trailT * midX + trailT * trailT * dstNode.screenX;
          const trailY = trailOmt * trailOmt * srcNode.screenY + 2 * trailOmt * trailT * midY + trailT * trailT * dstNode.screenY;
          ctx.beginPath();
          ctx.arc(trailX, trailY, isHighlighted ? 2.5 : 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `${pipeColor} ${alpha * 0.6})`;
          ctx.fill();
        }
      });

      // 5. LAYER 5: Central Universal Security Model Summit Beacon & Orbiting Data Satellites
      const hubNode = projectedNodes[0];
      if (hubNode) {
        // Vertical Signal Beam
        const beaconGrad = ctx.createLinearGradient(hubNode.screenX, hubNode.screenY, hubNode.screenX, hubNode.screenY - 80);
        beaconGrad.addColorStop(0, "rgba(59, 130, 246, 0.55)");
        beaconGrad.addColorStop(0.6, "rgba(59, 130, 246, 0.15)");
        beaconGrad.addColorStop(1, "rgba(59, 130, 246, 0)");
        ctx.fillStyle = beaconGrad;
        ctx.fillRect(hubNode.screenX - 2.5, hubNode.screenY - 80, 5, 80);

        // Concentric Pulsing Contour Rings at Summit
        const ringT = (tick * 0.02) % 1;
        ctx.beginPath();
        ctx.arc(hubNode.screenX, hubNode.screenY, 12 + ringT * 22, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(59, 130, 246, ${0.5 * (1 - ringT)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(hubNode.screenX, hubNode.screenY, 8 + ((ringT + 0.5) % 1) * 22, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(59, 130, 246, ${0.4 * (1 - ((ringT + 0.5) % 1))})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Orbiting Data Satellites around Summit
        if (!prefersReducedMotion) {
          const orbitAngle1 = timeSec * 1.5;
          const orbitRadius1 = 26;
          const sat1X = hubNode.screenX + Math.cos(orbitAngle1) * orbitRadius1;
          const sat1Y = hubNode.screenY + Math.sin(orbitAngle1) * (orbitRadius1 * 0.45);

          ctx.beginPath();
          ctx.arc(sat1X, sat1Y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = "#3B82F6";
          ctx.shadowColor = "#3B82F6";
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;

          const orbitAngle2 = -timeSec * 1.2 + Math.PI;
          const orbitRadius2 = 36;
          const sat2X = hubNode.screenX + Math.cos(orbitAngle2) * orbitRadius2;
          const sat2Y = hubNode.screenY + Math.sin(orbitAngle2) * (orbitRadius2 * 0.45);

          ctx.beginPath();
          ctx.arc(sat2X, sat2Y, 2, 0, Math.PI * 2);
          ctx.fillStyle = "#10B981";
          ctx.shadowColor = "#10B981";
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // 6. LAYER 6 & 7: Render Nodes, Precision Pins, and Monospace Label Chips
      projectedNodes.forEach((pn) => {
        const { screenX, screenY, node } = pn;
        const isSelected =
          (node.vendorId && selectedVendor === node.vendorId) ||
          (node.frameworkId && selectedFramework === node.frameworkId) ||
          (node.isHub && !selectedVendor && !selectedFramework);

        const isHovered = hoveredNodeId === node.id;
        const isDimmed =
          (selectedVendor && node.vendorId && node.vendorId !== selectedVendor) ||
          (selectedFramework && node.frameworkId && node.frameworkId !== selectedFramework);

        const nodeAlpha = isDimmed ? 0.35 : 1;

        // Ground Target Ring
        const ringRadius = node.isHub ? (isHovered ? 18 : 15) : isHovered ? 12 : 9;
        ctx.beginPath();
        ctx.arc(screenX, screenY, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected || isHovered ? "#FFFFFF" : node.color;
        ctx.lineWidth = isSelected || isHovered ? 2.5 : 1.5;
        ctx.stroke();

        // Core Glowing Dot
        ctx.beginPath();
        ctx.arc(screenX, screenY, node.isHub ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = isSelected || isHovered ? "#FFFFFF" : node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = isSelected || isHovered ? 20 : 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Clean Vertical Pin Line to Floating Chip
        const chipX = screenX + node.chipOffset.x;
        const chipY = screenY + node.chipOffset.y;

        ctx.beginPath();
        ctx.moveTo(screenX, screenY - (node.isHub ? 10 : 7));
        ctx.lineTo(chipX, chipY + 14);
        ctx.strokeStyle = isSelected || isHovered ? "rgba(59, 130, 246, 0.6)" : "rgba(255, 255, 255, 0.22)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Monospace Floating Label Box
        ctx.font = "bold 10px monospace";
        const titleWidth = ctx.measureText(node.title).width;
        ctx.font = "9px monospace";
        const subWidth = node.subtitle ? ctx.measureText(node.subtitle).width : 0;
        const boxWidth = Math.max(Math.max(titleWidth, subWidth) + 24, 100);
        const boxHeight = node.subtitle ? 36 : 24;
        const boxLeft = chipX - boxWidth * 0.5;
        const boxTop = chipY - boxHeight * 0.5;

        // Glassmorphism Dark Charcoal Backing
        ctx.fillStyle = isSelected ? "rgba(8, 11, 18, 0.95)" : isHovered ? "rgba(13, 18, 28, 0.95)" : "rgba(10, 15, 24, 0.88)";
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(boxLeft, boxTop, boxWidth, boxHeight, 6);
          ctx.fill();
        } else {
          ctx.fillRect(boxLeft, boxTop, boxWidth, boxHeight);
        }

        // 1px Subtle Border
        ctx.strokeStyle = isSelected
          ? "#3B82F6"
          : isHovered
          ? "#60A5FA"
          : (node as any).isEvidence
          ? "rgba(239, 68, 68, 0.6)"
          : (node as any).verdict === "FAIL"
          ? "rgba(239, 68, 68, 0.4)"
          : "rgba(255, 255, 255, 0.16)";
        ctx.lineWidth = isSelected ? 1.8 : isHovered ? 1.4 : 1;

        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(boxLeft, boxTop, boxWidth, boxHeight, 6);
          ctx.stroke();
        } else {
          ctx.strokeRect(boxLeft, boxTop, boxWidth, boxHeight);
        }

        // Typography
        ctx.textAlign = "center";
        if (node.subtitle) {
          ctx.font = "bold 10px monospace";
          ctx.fillStyle = isSelected
            ? "#FFFFFF"
            : isHovered
            ? "#F8FAFC"
            : (node as any).isEvidence || (node as any).verdict === "FAIL"
            ? "#EF4444"
            : "#E2E8F0";
          ctx.fillText(node.title, chipX, chipY - 4);

          ctx.font = "8px monospace";
          ctx.fillStyle = isSelected ? "#3B82F6" : isHovered ? "#60A5FA" : "#94A3B8";
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
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("click", onCanvasClick);
    };
  }, [selectedVendor, selectedFramework, onSelectVendor, onSelectFramework, onSelectNodeInfo, hoveredNodeId]);

  return (
    <div className="relative w-full h-[540px] sm:h-[600px] lg:h-[660px] rounded-2xl bg-[#080B12] border border-[#1D2939] overflow-hidden select-none shadow-[0_0_40px_rgba(0,0,0,0.8)]">
      {/* 3D Canvas Viewport */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* Top Left Viewport Overlay & Orbit Controls Hint */}
      <div className="absolute top-4 left-4 font-mono text-[11px] space-y-1 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] animate-pulse" />
          <span className="text-[#3B82F6] font-extrabold tracking-wider text-xs">
            3D SECURITY TERRAIN
          </span>
        </div>
        <div className="text-[#667085] text-[10px]">
          CLICK OR DRAG TO ROTATE • SCROLL TO ZOOM
        </div>
      </div>

      {/* Top Right Reset View Action */}
      <button
        onClick={resetCamera}
        className="absolute top-4 right-4 px-3.5 py-1.5 rounded-lg bg-[#0D121C]/90 hover:bg-[#111827] border border-[#1D2939] hover:border-[#3B82F6]/50 text-[#3B82F6] text-xs font-mono font-bold transition-all shadow-lg active:scale-95 flex items-center gap-1.5"
      >
        <span>Reset View</span>
        <span className="text-[10px]">↺</span>
      </button>

      {/* Evidence Hover Tooltip Card (Line 17 AST Proof) */}
      {isEvidenceHovered && evidenceTooltipPos && (
        <div
          className="absolute z-20 pointer-events-none p-3 rounded-xl bg-[#0D121C]/95 border border-[#EF4444]/60 shadow-[0_0_20px_rgba(239,68,68,0.25)] text-xs font-mono space-y-1.5 min-w-[230px] animate-fadeIn"
          style={{
            left: Math.min(evidenceTooltipPos.x + 20, 480),
            top: Math.max(evidenceTooltipPos.y - 120, 20),
          }}
        >
          <div className="flex items-center justify-between border-b border-[#1D2939] pb-1.5">
            <span className="text-[#EF4444] font-bold text-[10px]">EVIDENCE: LINE 17</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#EF4444]/20 text-[#EF4444] font-extrabold">FAIL</span>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="text-[#A7B0C0]">Vendor: <strong className="text-white">Cisco IOS</strong></div>
            <div className="text-[#A7B0C0]">Raw Line: <span className="text-[#EF4444] font-bold">ip ssh version 1</span></div>
            <div className="text-[#A7B0C0]">Normalized Fact: <span className="text-[#3B82F6]">remote_access.ssh_version = 1</span></div>
            <div className="text-[#A7B0C0]">Control: <strong className="text-white">CIS-1.2.1 / NIST AC-17</strong></div>
          </div>
          <div className="text-[9px] text-[#667085] pt-0.5 border-t border-[#1D2939]">
            Deterministic SHA-256 AST Provenance
          </div>
        </div>
      )}

      {/* Bottom Architectural Readout (System Readout Bar) */}
      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between font-mono text-[10px] text-[#667085] pointer-events-none border-t border-[#1D2939] pt-2">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="text-[#A7B0C0]">[3 VENDORS]</span>
          <span className="text-white/20">→</span>
          <span className="text-[#A7B0C0]">[AST NORMALIZATION]</span>
          <span className="text-white/20">→</span>
          <span className="text-[#3B82F6] font-bold">[UNIVERSAL SECURITY MODEL]</span>
          <span className="text-white/20">→</span>
          <span className="text-[#A7B0C0]">[4 FRAMEWORKS]</span>
        </div>
        <div className="text-[#10B981] font-bold tracking-wider hidden sm:block">
          IMMUTABLE AST PROOF
        </div>
      </div>
    </div>
  );
}
