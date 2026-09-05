"use client";

import React, { useEffect, useState, useRef } from "react";

interface TelemetryItem {
  id: string;
  text: string;
  depth: "bg" | "mid" | "fg";
  top: string;
  horizontalPos: string;
  color: string;
}

// Peripheral Left Flank Fragments (Restrained strictly to outer left edge)
const LEFT_FRAGMENTS = [
  { text: "remote_access.ssh_version = 1", depth: "fg", color: "text-[#D4D4D8]", top: "16%", horizontalPos: "left-[1.5%] sm:left-[2.5%]" },
  { text: "authentication.aaa_enabled = false", depth: "mid", color: "text-[#636366]", top: "30%", horizontalPos: "left-[1%] sm:left-[2%]" },
  { text: "logging.remote_logging = false", depth: "bg", color: "text-[#636366]", top: "44%", horizontalPos: "left-[1.5%] sm:left-[2.5%]" },
  { text: "CISCO IOS → AST → USM", depth: "fg", color: "text-[#10B981]", top: "58%", horizontalPos: "left-[1%] sm:left-[2%]" },
  { text: "EVIDENCE:[LINE 17]", depth: "mid", color: "text-[#D4D4D8]", top: "72%", horizontalPos: "left-[1.5%] sm:left-[2.5%]" },
];

// Peripheral Right Flank Fragments (Restrained strictly to outer right edge)
const RIGHT_FRAGMENTS = [
  { text: "remote_access.http_server_enabled = true", depth: "bg", color: "text-[#636366]", top: "16%", horizontalPos: "right-[1.5%] sm:right-[2.5%]" },
  { text: "JUNOS → AST → USM", depth: "mid", color: "text-[#10B981]", top: "28%", horizontalPos: "right-[1%] sm:right-[2%]" },
  { text: "FORTIOS → AST → USM", depth: "bg", color: "text-[#D4D4D8]", top: "42%", horizontalPos: "right-[1.5%] sm:right-[2.5%]" },
  { text: "CIS-1.2.1 / FAIL", depth: "fg", color: "text-[#EF4444]", top: "56%", horizontalPos: "right-[1%] sm:right-[2%]" },
  { text: "AI_ADVISORY:READ_ONLY", depth: "mid", color: "text-[#A0A0A0]", top: "70%", horizontalPos: "right-[1.5%] sm:right-[2.5%]" },
  { text: "REMOTE_PUSH:ABSENT", depth: "fg", color: "text-[#10B981]", top: "82%", horizontalPos: "right-[1%] sm:right-[2%]" },
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
        time += 0.005;
        currentParallaxX += (mouseX * 6 - currentParallaxX) * 0.03;
        currentParallaxY += (mouseY * 4 - currentParallaxY) * 0.03;

        const children = container.children;
        for (let i = 0; i < children.length; i++) {
          const el = children[i] as HTMLElement;
          const depth = el.dataset.depth;
          const depthFactor = depth === "fg" ? 1.0 : depth === "mid" ? 0.65 : 0.4;

          const floatX = Math.sin(time * 0.3 + i * 1.1) * 3 * depthFactor;
          const floatY = Math.cos(time * 0.25 + i * 0.8) * 2 * depthFactor;

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
      {/* Peripheral Left & Right Telemetry Framing (Target Opacity: 0.04 - 0.08, Key items ~0.09) */}
      <div ref={containerRef} className="w-full h-full relative font-mono text-[10px] sm:text-[11px]">
        {/* Left Flank Items */}
        {LEFT_FRAGMENTS.map((item, idx) => {
          const opacityClass =
            item.depth === "fg"
              ? "opacity-[0.08] sm:opacity-[0.09]"
              : item.depth === "mid"
              ? "opacity-[0.055] sm:opacity-[0.06]"
              : "opacity-[0.04]";

          const mobileClass = idx > 2 ? "hidden lg:block" : "hidden sm:block";

          return (
            <div
              key={`left-${idx}`}
              data-depth={item.depth}
              className={`absolute ${item.horizontalPos} ${opacityClass} ${mobileClass} ${item.color} font-medium tracking-wider whitespace-nowrap`}
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
              ? "opacity-[0.08] sm:opacity-[0.09]"
              : item.depth === "mid"
              ? "opacity-[0.055] sm:opacity-[0.06]"
              : "opacity-[0.04]";

          const mobileClass = idx > 2 ? "hidden lg:block" : "hidden sm:block";

          return (
            <div
              key={`right-${idx}`}
              data-depth={item.depth}
              className={`absolute ${item.horizontalPos} ${opacityClass} ${mobileClass} ${item.color} font-medium tracking-wider whitespace-nowrap`}
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
