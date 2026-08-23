"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export default function TopographicScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let animFrameId: number | null = null;

    // Disposables
    const disposables: { dispose: () => void }[] = [];

    try {
      // 1. Initialize Scene & Camera
      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x050505, 0.018);

      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;

      camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(0, 26, 42);
      camera.lookAt(0, -2, 0);

      // 2. Initialize Renderer
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setClearColor(0x050505, 1);
      container.appendChild(renderer.domElement);
      disposables.push(renderer);

      // 3. Construct Procedural Topographic Terrain Geometry
      const gridWidth = 90;
      const gridDepth = 90;
      const segsX = 64;
      const segsY = 64;

      const geometry = new THREE.PlaneGeometry(gridWidth, gridDepth, segsX, segsY);
      geometry.rotateX(-Math.PI / 2);
      disposables.push(geometry);

      const pos = geometry.attributes.position;
      const originalY = new Float32Array(pos.count);

      // Mathematical Deterministic Terrain Function
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);

        // Sinusoidal layered elevation
        const h1 = Math.sin(x * 0.07) * Math.cos(z * 0.07) * 3.8;
        const h2 = Math.sin(x * 0.035 + z * 0.045) * 4.2;
        const h3 = Math.cos(Math.sqrt(x * x + z * z) * 0.08) * 1.8;
        const distFalloff = Math.max(0, 1 - (x * x + z * z) / (45 * 45));

        const y = (h1 + h2 + h3) * distFalloff;
        pos.setY(i, y);
        originalY[i] = y;
      }
      geometry.computeVertexNormals();

      // 4. Terrain Materials (Matte Dark Surface & Thin Contour Lines)
      const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: 0x00d9ff,
        wireframe: true,
        transparent: true,
        opacity: 0.12,
      });
      disposables.push(wireframeMaterial);

      const terrainMesh = new THREE.Mesh(geometry, wireframeMaterial);
      scene.add(terrainMesh);

      // Contour elevation ring lines
      const contourMaterial = new THREE.LineBasicMaterial({
        color: 0x8b5cf6,
        transparent: true,
        opacity: 0.22,
      });
      disposables.push(contourMaterial);

      // 5. Network Topology Nodes & Pulses
      const nodeCount = 28;
      const nodePositions: THREE.Vector3[] = [];
      const nodeGeometry = new THREE.BufferGeometry();
      const nodePosArray = new Float32Array(nodeCount * 3);

      // Deterministic node distribution along terrain ridges
      for (let n = 0; n < nodeCount; n++) {
        const theta = (n / nodeCount) * Math.PI * 2;
        const radius = 12 + ((n * 7) % 22);
        const nx = Math.cos(theta) * radius;
        const nz = Math.sin(theta) * radius;

        // Sample terrain height
        const h1 = Math.sin(nx * 0.07) * Math.cos(nz * 0.07) * 3.8;
        const h2 = Math.sin(nx * 0.035 + nz * 0.045) * 4.2;
        const ny = (h1 + h2) * 0.7 + 0.6;

        nodePosArray[n * 3] = nx;
        nodePosArray[n * 3 + 1] = ny;
        nodePosArray[n * 3 + 2] = nz;

        nodePositions.push(new THREE.Vector3(nx, ny, nz));
      }

      nodeGeometry.setAttribute("position", new THREE.BufferAttribute(nodePosArray, 3));
      disposables.push(nodeGeometry);

      const nodeMaterial = new THREE.PointsMaterial({
        color: 0x00d9ff,
        size: 2.2,
        transparent: true,
        opacity: 0.85,
      });
      disposables.push(nodeMaterial);

      const nodePoints = new THREE.Points(nodeGeometry, nodeMaterial);
      scene.add(nodePoints);

      // Interconnect lines between nearby nodes
      const lineIndices: number[] = [];
      for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
          const dist = nodePositions[i].distanceTo(nodePositions[j]);
          if (dist < 18) {
            lineIndices.push(i, j);
          }
        }
      }

      const linesGeometry = new THREE.BufferGeometry();
      const linePositions = new Float32Array(lineIndices.length * 3);
      for (let k = 0; k < lineIndices.length; k++) {
        const nodeIdx = lineIndices[k];
        const v = nodePositions[nodeIdx];
        linePositions[k * 3] = v.x;
        linePositions[k * 3 + 1] = v.y;
        linePositions[k * 3 + 2] = v.z;
      }
      linesGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
      disposables.push(linesGeometry);

      const networkLinesMaterial = new THREE.LineBasicMaterial({
        color: 0x00d9ff,
        transparent: true,
        opacity: 0.16,
      });
      disposables.push(networkLinesMaterial);

      const networkLines = new THREE.LineSegments(linesGeometry, networkLinesMaterial);
      scene.add(networkLines);

      // 6. Security Scanning Wave Cylinder Plane
      const scanGeometry = new THREE.RingGeometry(0.5, 42, 64);
      scanGeometry.rotateX(-Math.PI / 2);
      disposables.push(scanGeometry);

      const scanMaterial = new THREE.MeshBasicMaterial({
        color: 0x00d9ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.08,
        wireframe: true,
      });
      disposables.push(scanMaterial);

      const scanMesh = new THREE.Mesh(scanGeometry, scanMaterial);
      scanMesh.position.y = 1.0;
      scene.add(scanMesh);

      // 7. Mouse Parallax Target
      let mouseX = 0;
      let mouseY = 0;
      let targetCameraX = 0;
      let targetCameraY = 26;

      const handleMouseMove = (e: MouseEvent) => {
        const halfX = window.innerWidth / 2;
        const halfY = window.innerHeight / 2;
        mouseX = (e.clientX - halfX) / halfX;
        mouseY = (e.clientY - halfY) / halfY;
      };

      window.addEventListener("mousemove", handleMouseMove, { passive: true });

      // 8. Resize Handler
      const handleResize = () => {
        if (!container || !camera || !renderer) return;
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      window.addEventListener("resize", handleResize);

      // 9. Animation Loop
      let clock = new THREE.Clock();

      const animate = () => {
        if (!camera || !renderer || !scene) return;

        if (!prefersReducedMotion) {
          const elapsedTime = clock.getElapsedTime();

          // Subtle terrain undulation
          const timeOffset = elapsedTime * 0.35;
          for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            const wave = Math.sin(x * 0.08 + timeOffset) * Math.cos(z * 0.08 + timeOffset) * 0.6;
            pos.setY(i, originalY[i] + wave);
          }
          pos.needsUpdate = true;

          // Slow scan ring expansion
          const scanScale = (elapsedTime * 0.25) % 1.0;
          scanMesh.scale.set(scanScale, scanScale, scanScale);
          scanMaterial.opacity = (1.0 - scanScale) * 0.12;

          // Smooth camera damping parallax
          targetCameraX = mouseX * 4.0;
          targetCameraY = 26 + mouseY * 2.0;

          camera.position.x += (targetCameraX - camera.position.x) * 0.03;
          camera.position.y += (targetCameraY - camera.position.y) * 0.03;
          camera.lookAt(0, -1, 0);

          // Subtle terrain slow rotation
          terrainMesh.rotation.y = elapsedTime * 0.015;
          nodePoints.rotation.y = elapsedTime * 0.015;
          networkLines.rotation.y = elapsedTime * 0.015;
        }

        renderer.render(scene, camera);
        animFrameId = requestAnimationFrame(animate);
      };

      animFrameId = requestAnimationFrame(animate);

      // Cleanup
      return () => {
        if (animFrameId) cancelAnimationFrame(animFrameId);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("resize", handleResize);

        disposables.forEach((d) => d.dispose());
        if (renderer && renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      };
    } catch (err) {
      console.warn("WebGL initialization skipped or unsupported:", err);
      setWebglSupported(false);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0"
      aria-hidden="true"
    >
      {!webglSupported && (
        <div className="absolute inset-0 bg-[#050505] opacity-90">
          <svg className="w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="fallback-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00D9FF" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#fallback-grid)" />
          </svg>
        </div>
      )}
      {/* Deep gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/40 via-transparent to-[#050505] pointer-events-none" />
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none opacity-70" />
    </div>
  );
}
