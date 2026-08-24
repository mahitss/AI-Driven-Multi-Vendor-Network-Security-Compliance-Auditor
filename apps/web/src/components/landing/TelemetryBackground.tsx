"use client";

import React, { useEffect, useState, useRef } from "react";

interface TelemetryItem {
  id: string;
  text: string;
  depth: "bg" | "mid" | "fg";
  top: string;
  left: string;
  speed: number;
  color: string;
}

const TELEMETRY_FRAGMENTS = [
  { text: "remote_access.ssh_version = 1", depth: "fg", color: "text-[#EF4444]" },
  { text: "remote_access.telnet_enabled = true", depth: "mid", color: "text-[#EF4444]" },
  { text: "remote_access.http_server_enabled = true", depth: "bg", color: "text-[#F59E0B]" },
  { text: "authentication.aaa_enabled = false", depth: "mid", color: "text-[#737373]" },
  { text: "logging.remote_logging = false", depth: "bg", color: "text-[#737373]" },
  { text: "time_sync.ntp_enabled = false", depth: "bg", color: "text-[#737373]" },
  { text: "CISCO IOS → AST → USM", depth: "fg", color: "text-[#06B6D4]" },
  { text: "JUNOS → AST → USM", depth: "mid", color: "text-[#10B981]" },
  { text: "FORTIOS → AST → USM", depth: "bg", color: "text-[#F59E0B]" },
  { text: "CIS-1.2.1 / FAIL", depth: "fg", color: "text-[#EF4444]" },
  { text: "NIST-AC-17 / FAIL", depth: "mid", color: "text-[#EF4444]" },
  { text: "STIG / FAIL", depth: "bg", color: "text-[#EF4444]" },
  { text: "ISO-27001 / FAIL", depth: "mid", color: "text-[#F59E0B]" },
  { text: "RISK:P0 / SCORE:97", depth: "fg", color: "text-[#EF4444]" },
  { text: "EVIDENCE:[LINE 17]", depth: "fg", color: "text-[#10B981]" },
  { text: "AI_ADVISORY:READ_ONLY", depth: "mid", color: "text-[#06B6D4]" },
  { text: "EXECUTION:DISABLED", depth: "fg", color: "text-[#10B981]" },
  { text: "REMOTE_PUSH:ABSENT", depth: "mid", color: "text-[#10B981]" },
];

export default function TelemetryBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<TelemetryItem[]>([]);

  useEffect(() => {
    // Generate deterministic layout positions
    const initialItems: TelemetryItem[] = TELEMETRY_FRAGMENTS.map((frag, idx) => {
      // Grid-based positioning to prevent heavy overlap
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const topOffset = 12 + row * 18 + ((idx * 7) % 8);
      const leftOffset = 6 + col * 23 + ((idx * 13) % 10);

      return {
        id: `telemetry-${idx}`,
        text: frag.text,
        depth: frag.depth as "bg" | "mid" | "fg",
        top: `${topOffset}%`,
        left: `${leftOffset}%`,
        speed: frag.depth === "fg" ? 0.04 : frag.depth === "mid" ? 0.025 : 0.015,
        color: frag.color,
      };
    });

    setItems(initialItems);
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
        time += 0.01;
        currentParallaxX += (mouseX * 12 - currentParallaxX) * 0.05;
        currentParallaxY += (mouseY * 12 - currentParallaxY) * 0.05;

        const children = container.children;
        for (let i = 0; i < children.length; i++) {
          const el = children[i] as HTMLElement;
          const depth = el.dataset.depth;
          const depthFactor = depth === "fg" ? 1.4 : depth === "mid" ? 0.9 : 0.5;

          const floatX = Math.sin(time * 0.5 + i) * 6 * depthFactor;
          const floatY = Math.cos(time * 0.4 + i * 0.7) * 4 * depthFactor;

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

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Subtle Central Security Intelligence Atmosphere */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-radial from-[#06B6D4]/[0.04] via-[#10B981]/[0.015] to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Decorative Telemetry Layer Container */}
      <div ref={containerRef} className="w-full h-full relative font-mono text-[10px] sm:text-[11px]">
        {items.map((item, idx) => {
          // Three-depth opacity control
          const opacityClass =
            item.depth === "fg"
              ? "opacity-15 sm:opacity-[0.14]"
              : item.depth === "mid"
              ? "opacity-10 sm:opacity-[0.08]"
              : "opacity-5 sm:opacity-[0.04]";

          // Hide dense fragments on small mobile screens to keep hero pristine
          const mobileVisibilityClass = idx > 4 ? "hidden sm:block" : "block";

          return (
            <div
              key={item.id}
              data-depth={item.depth}
              className={`absolute transition-transform ease-out ${opacityClass} ${mobileVisibilityClass} ${item.color} font-semibold tracking-wider whitespace-nowrap`}
              style={{
                top: item.top,
                left: item.left,
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
