"use client";

import React, { useEffect, useState, useRef } from "react";

interface TelemetryItem {
  id: string;
  text: string;
  depth: "bg" | "mid" | "fg";
  side: "left" | "right";
  top: string;
  horizontalPos: string;
  color: string;
}

// Left flank telemetry fragments (peripheral framing)
const LEFT_FRAGMENTS = [
  { text: "remote_access.ssh_version = 1", depth: "fg", color: "text-[#06B6D4]", top: "14%", horizontalPos: "left-[2%] sm:left-[3%] lg:left-[4%]" },
  { text: "authentication.aaa_enabled = false", depth: "mid", color: "text-[#737373]", top: "26%", horizontalPos: "left-[1%] sm:left-[2%] lg:left-[3%]" },
  { text: "logging.remote_logging = false", depth: "bg", color: "text-[#737373]", top: "38%", horizontalPos: "left-[2%] sm:left-[4%] lg:left-[5%]" },
  { text: "CISCO IOS → AST → USM", depth: "fg", color: "text-[#10B981]", top: "50%", horizontalPos: "left-[1%] sm:left-[2%] lg:left-[3%]" },
  { text: "EVIDENCE:[LINE 17]", depth: "fg", color: "text-[#06B6D4]", top: "62%", horizontalPos: "left-[2%] sm:left-[3%] lg:left-[4%]" },
  { text: "time_sync.ntp_enabled = false", depth: "bg", color: "text-[#737373]", top: "74%", horizontalPos: "left-[1%] sm:left-[2%] lg:left-[3%]" },
];

// Right flank telemetry fragments (peripheral framing)
const RIGHT_FRAGMENTS = [
  { text: "remote_access.http_server_enabled = true", depth: "bg", color: "text-[#737373]", top: "14%", horizontalPos: "right-[2%] sm:right-[3%] lg:right-[4%]" },
  { text: "JUNOS → AST → USM", depth: "mid", color: "text-[#10B981]", top: "25%", horizontalPos: "right-[1%] sm:right-[2%] lg:right-[3%]" },
  { text: "FORTIOS → AST → USM", depth: "bg", color: "text-[#06B6D4]", top: "36%", horizontalPos: "right-[2%] sm:right-[4%] lg:right-[5%]" },
  { text: "CIS-1.2.1 / FAIL", depth: "fg", color: "text-[#06B6D4]", top: "48%", horizontalPos: "right-[1%] sm:right-[2%] lg:right-[3%]" },
  { text: "AI_ADVISORY:READ_ONLY", depth: "mid", color: "text-[#10B981]", top: "59%", horizontalPos: "right-[2%] sm:right-[3%] lg:right-[4%]" },
  { text: "EXECUTION:DISABLED", depth: "fg", color: "text-[#06B6D4]", top: "70%", horizontalPos: "right-[1%] sm:right-[2%] lg:right-[3%]" },
  { text: "REMOTE_PUSH:ABSENT", depth: "mid", color: "text-[#10B981]", top: "81%", horizontalPos: "right-[2%] sm:right-[3%] lg:right-[4%]" },
];

export default function TelemetryBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let animId: number;
    let mouseX = 0;
    let mouseY = 0;
    let currentParallaxX = 0;
    let currentParallaxY = 0;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const handleMouseMove = (e: MouseEvent) => {
      if (prefersReducedMotion) return;
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      mouseX = (e.clientX - halfW) / halfW;
      mouseY = (e.clientY - halfH) / halfH;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    let time = 0;
    const container = containerRef.current;

    const updatePosition = () => {
      if (!prefersReducedMotion && container) {
        time += 0.009;
        currentParallaxX += (mouseX * 10 - currentParallaxX) * 0.04;
        currentParallaxY += (mouseY * 8 - currentParallaxY) * 0.04;

        const children = container.children;
        for (let i = 0; i < children.length; i++) {
          const el = children[i] as HTMLElement;
          const depth = el.dataset.depth;
          const depthFactor = depth === "fg" ? 1.2 : depth === "mid" ? 0.75 : 0.45;

          const floatX = Math.sin(time * 0.45 + i * 1.1) * 4 * depthFactor;
          const floatY = Math.cos(time * 0.35 + i * 0.8) * 3 * depthFactor;

          const px = currentParallaxX * depthFactor + floatX;
          const py = currentParallaxY * depthFactor + floatY;

          el.style.transform = `translate3d(${px}px, ${py}px, 0)`;
        }
      }
      animId = requestAnimationFrame(updatePosition);
    };

    updatePosition();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Central Clean Quiet Zone Atmosphere */}
      <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[400px] bg-radial from-[#06B6D4]/[0.025] via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Peripheral Left & Right Telemetry Framing */}
      <div ref={containerRef} className="w-full h-full relative font-mono text-[10px] sm:text-[11px]">
        {/* Left Flank Items */}
        {LEFT_FRAGMENTS.map((item, idx) => {
          const opacityClass =
            item.depth === "fg"
              ? "opacity-[0.09] sm:opacity-[0.10] hover:opacity-[0.18]"
              : item.depth === "mid"
              ? "opacity-[0.06] sm:opacity-[0.07]"
              : "opacity-[0.03] sm:opacity-[0.04]";

          // On mobile, hide lower items to keep UI completely uncluttered
          const mobileClass = idx > 2 ? "hidden lg:block" : "hidden sm:block";

          return (
            <div
              key={`left-${idx}`}
              data-depth={item.depth}
              className={`absolute ${item.horizontalPos} ${opacityClass} ${mobileClass} ${item.color} font-semibold tracking-wider whitespace-nowrap transition-transform duration-75`}
              style={{
                top: item.top,
                willChange: "transform",
              }}
            >
              {item.text}
            </div>
          );
        })}

        {/* Right Flank Items */}
        {RIGHT_FRAGMENTS.map((item, idx) => {
          const opacityClass =
            item.depth === "fg"
              ? "opacity-[0.09] sm:opacity-[0.10] hover:opacity-[0.18]"
              : item.depth === "mid"
              ? "opacity-[0.06] sm:opacity-[0.07]"
              : "opacity-[0.03] sm:opacity-[0.04]";

          const mobileClass = idx > 2 ? "hidden lg:block" : "hidden sm:block";

          return (
            <div
              key={`right-${idx}`}
              data-depth={item.depth}
              className={`absolute ${item.horizontalPos} ${opacityClass} ${mobileClass} ${item.color} font-semibold tracking-wider whitespace-nowrap transition-transform duration-75`}
              style={{
                top: item.top,
                willChange: "transform",
              }}
            >
              {item.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
