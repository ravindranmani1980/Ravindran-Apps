import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { SubscriptionOverview, ReservationSummary } from '../types/azure.ts';

interface ThreeCloudTopologyProps {
  subscriptions: SubscriptionOverview[];
  reservationSummaries: ReservationSummary[];
  currency: string;
}

export const ThreeCloudTopology: React.FC<ThreeCloudTopologyProps> = ({
  subscriptions,
  reservationSummaries,
  currency,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<{
    name: string;
    cost: number;
    type: string;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = 400;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Deep slate neutral
    scene.fog = new THREE.FogExp2(0x0f172a, 0.035);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 10, 18);
    camera.lookAt(0, 0, 0);

    // 2. Renderer with PBR setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(8, 15, 10);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.2); // Cool cyan fill
    fillLight.position.set(-10, 8, -6);
    scene.add(fillLight);

    const hemiLight = new THREE.HemisphereLight(0xe2e8f0, 0x1e293b, 1.0);
    scene.add(hemiLight);

    // 4. Ground Grid & Pedestal
    const gridHelper = new THREE.GridHelper(30, 30, 0x334155, 0x1e293b);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Central Datacenter Hub Ring
    const hubGeometry = new THREE.CylinderGeometry(2.5, 2.8, 0.4, 32);
    const hubMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.2,
    });
    const hubMesh = new THREE.Mesh(hubGeometry, hubMaterial);
    hubMesh.position.y = 0.2;
    scene.add(hubMesh);

    // Glowing core ring
    const ringGeo = new THREE.TorusGeometry(2.6, 0.06, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.42;
    scene.add(ringMesh);

    // 5. Subscription Cluster Towers
    const maxSubSpend = Math.max(...subscriptions.map(s => s.totalSpend), 1);
    const subObjects: THREE.Group[] = [];

    subscriptions.forEach((sub, idx) => {
      const angle = (idx / subscriptions.length) * Math.PI * 2;
      const radius = 6.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const group = new THREE.Group();
      group.position.set(x, 0, z);

      // Height proportional to spend
      const towerHeight = Math.max(1.8, (sub.totalSpend / maxSubSpend) * 5.5);

      // Base pedestal
      const baseGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.3, 16);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.4,
        metalness: 0.7,
      });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = 0.15;
      group.add(baseMesh);

      // Main server rack tower
      const towerGeo = new THREE.BoxGeometry(1.2, towerHeight, 1.2);
      const hexColor = parseInt(sub.color.replace('#', '0x'), 16) || 0x2563eb;
      const towerMat = new THREE.MeshStandardMaterial({
        color: hexColor,
        metalness: 0.6,
        roughness: 0.3,
      });
      const towerMesh = new THREE.Mesh(towerGeo, towerMat);
      towerMesh.position.y = 0.3 + towerHeight / 2;
      group.add(towerMesh);

      // Top beacon
      const beaconGeo = new THREE.SphereGeometry(0.22, 16, 16);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      beaconMesh.position.y = 0.3 + towerHeight + 0.3;
      group.add(beaconMesh);

      group.userData = {
        name: sub.name,
        cost: sub.totalSpend,
        type: 'Subscription Cluster',
      };

      scene.add(group);
      subObjects.push(group);
    });

    // 6. Reservation Component Satellites
    const resGroup = new THREE.Group();
    reservationSummaries.forEach((res, rIdx) => {
      const rAngle = (rIdx / reservationSummaries.length) * Math.PI * 2;
      const rx = Math.cos(rAngle) * 3.8;
      const rz = Math.sin(rAngle) * 3.8;

      const sphereGeo = new THREE.DodecahedronGeometry(0.35);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: 0x14b8a6, // Teal for reservations
        metalness: 0.9,
        roughness: 0.15,
      });
      const nodeMesh = new THREE.Mesh(sphereGeo, sphereMat);
      nodeMesh.position.set(rx, 1.2, rz);

      nodeMesh.userData = {
        name: res.componentType,
        cost: res.totalMonthlyCost,
        type: 'Reserved Capacity Node',
      };

      resGroup.add(nodeMesh);
    });
    scene.add(resGroup);

    // 7. Interactive Mouse Controls & Damped Rotation
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let rotationVelocityX = 0;
    let rotationVelocityY = 0;
    let targetRotationY = 0;
    let targetRotationX = 0.4;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;

        rotationVelocityY += deltaX * 0.003;
        rotationVelocityX += deltaY * 0.003;
      }

      // Raycasting for inspection
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        let current: THREE.Object3D | null = intersects[0].object;
        while (current && !current.userData?.name && current.parent) {
          current = current.parent;
        }
        if (current && current.userData?.name) {
          setHoveredNode({
            name: current.userData.name,
            cost: current.userData.cost || 0,
            type: current.userData.type || 'Azure Cloud Node',
          });
          return;
        }
      }
      setHoveredNode(null);
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // 8. Animation Loop
    let reqId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const dt = clock.getDelta();

      // Damped rotation
      if (!isDragging) {
        targetRotationY += 0.15 * dt; // slow auto spin
      }
      targetRotationY += rotationVelocityY;
      targetRotationX += rotationVelocityX;
      rotationVelocityX *= 0.92;
      rotationVelocityY *= 0.92;

      // Clamp X tilt
      targetRotationX = Math.max(0.1, Math.min(1.2, targetRotationX));

      // Orbit camera calculation
      const dist = 18;
      camera.position.x = Math.sin(targetRotationY) * Math.cos(targetRotationX) * dist;
      camera.position.z = Math.cos(targetRotationY) * Math.cos(targetRotationX) * dist;
      camera.position.y = Math.sin(targetRotationX) * dist;
      camera.lookAt(0, 1.5, 0);

      // Rotate reservation satellites
      resGroup.rotation.y += 0.3 * dt;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      camera.aspect = newW / height;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      domElem.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', handleResize);
      if (domElem.parentNode) {
        domElem.parentNode.removeChild(domElem);
      }
      renderer.dispose();
    };
  }, [subscriptions, reservationSummaries]);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 text-white space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-0.5">
            Procedural 3D Azure Architecture
          </div>
          <h3 className="text-base font-bold text-white">
            Cloud Cost Topology & Subscription Mesh
          </h3>
          <p className="text-xs text-slate-400">
            Tower height indicates monthly spend volume · Teal satellites represent active reservation components
          </p>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Interactive WebGL 3D (Drag to Orbit)</span>
        </div>
      </div>

      {/* 3D Canvas Container */}
      <div className="relative rounded-lg overflow-hidden border border-slate-800">
        <div ref={containerRef} className="w-full h-[400px] cursor-grab active:cursor-grabbing" />

        {/* Hover Inspector Overlay */}
        {hoveredNode && (
          <div className="absolute top-4 left-4 p-3 rounded-lg bg-slate-950/85 backdrop-blur-xs border border-slate-700 text-xs shadow-xl pointer-events-none">
            <div className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
              {hoveredNode.type}
            </div>
            <div className="font-bold text-white text-sm mt-0.5">{hoveredNode.name}</div>
            <div className="font-mono tabular-nums text-emerald-400 font-semibold mt-1">
              ${hoveredNode.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
            </div>
          </div>
        )}

        <div className="absolute bottom-3 right-3 text-[11px] text-slate-400 bg-slate-950/60 px-2.5 py-1 rounded-md border border-slate-800 pointer-events-none">
          Click & Drag to rotate · Hover to inspect
        </div>
      </div>
    </div>
  );
};
