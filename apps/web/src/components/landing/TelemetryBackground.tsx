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

// Peripheral Left Flank Fragments (Restrained to far left edge)
const LEFT_FRAGMENTS = [
  { text: "remote_access.ssh_version = 1", depth: "fg", color: "text-[#0891b2]", top: "18%", horizontalPos: "left-[1.5%] sm:left-[2.5%]" },
  { text: "authentication.aaa_enabled = false", depth: "mid", color: "text-[#525252]", top: "34%", horizontalPos: "left-[1%] sm:left-[2%]" },
  { text: "CISCO IOS → AST → USM", depth: "fg", color: "text-[#059669]", top: "52%", horizontalPos: "left-[1.5%] sm:left-[2.5%]" },
  { text: "EVIDENCE:[LINE 17]", depth: "mid", color: "text-[#0891b2]", top: "68%", horizontalPos: "left-[1%] sm:left-[2%]" },
];

// Peripheral Right Flank Fragments (Restrained to far right edge)
const RIGHT_FRAGMENTS = [
  { text: "remote_access.http_server_enabled = true", depth: "bg", color: "text-[#525252]", top: "18%", horizontalPos: "right-[1.5%] sm:right-[2.5%]" },
  { text: "JUNOS → AST → USM", depth: "mid", color: "text-[#059669]", top: "32%", horizontalPos: "right-[1%] sm:right-[2%]" },
  { text: "FORTIOS → AST → USM", depth: "bg", color: "text-[#0891b2]", top: "46%", horizontalPos: "right-[1.5%] sm:right-[2.5%]" },
  { text: "CIS-1.2.1 / FAIL", depth: "fg", color: "text-[#0891b2]", top: "60%", horizontalPos: "right-[1%] sm:right-[2%]" },
  { text: "AI_ADVISORY:READ_ONLY", depth: "mid", color: "text-[#059669]", top: "74%", horizontalPos: "right-[1.5%] sm:right-[2.5%]" },
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
        currentParallaxY += (mouseY * 5 - currentParallaxY) * 0.03;

        const children = container.children;
        for (let i = 0; i < children.length; i++) {
          const el = children[i] as HTMLElement;
          const depth = el.dataset.depth;
          const depthFactor = depth === "fg" ? 1.0 : depth === "mid" ? 0.6 : 0.35;

          const floatX = Math.sin(time * 0.3 + i * 1.2) * 3 * depthFactor;
          const floatY = Math.cos(time * 0.25 + i * 0.9) * 2.5 * depthFactor;

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
      {/* Peripheral Left & Right Telemetry Framing (Opacity: 0.025 - 0.055) */}
      <div ref={containerRef} className="w-full h-full relative font-mono text-[10px] sm:text-[11px]">
        {/* Left Flank Items */}
        {LEFT_FRAGMENTS.map((item, idx) => {
          const opacityClass =
            item.depth === "fg"
              ? "opacity-[0.05] sm:opacity-[0.055]"
              : item.depth === "mid"
              ? "opacity-[0.035] sm:opacity-[0.04]"
              : "opacity-[0.025]";

          const mobileClass = idx > 1 ? "hidden lg:block" : "hidden sm:block";

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
              ? "opacity-[0.05] sm:opacity-[0.055]"
              : item.depth === "mid"
              ? "opacity-[0.035] sm:opacity-[0.04]"
              : "opacity-[0.025]";

          const mobileClass = idx > 1 ? "hidden lg:block" : "hidden sm:block";

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
