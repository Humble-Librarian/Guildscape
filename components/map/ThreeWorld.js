'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

// Medieval color palette
const COLORS = {
  grass: 0x2d4a22,
  grassLight: 0x3d5a32,
  dirt: 0x5c4033,
  stone: 0x7a7a7a,
  stoneDark: 0x5a5a5a,
  wood: 0x8b4513,
  woodDark: 0x654321,
  gold: 0xffd700,
  water: 0x4a90e2,
  sky: 0x1a1a2e
};

export default function ThreeWorld({ worldData, members, width = 800, height = 600 }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const frameIdRef = useRef(null);
  const coinsRef = useRef([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.sky);
    scene.fog = new THREE.Fog(COLORS.sky, 20, 50);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(15, 12, 15);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffd700, 0.5);
    pointLight.position.set(0, 10, 0);
    scene.add(pointLight);

    // Materials
    const grassMaterial = new THREE.MeshStandardMaterial({ color: COLORS.grass, roughness: 0.8 });
    const grassLightMaterial = new THREE.MeshStandardMaterial({ color: COLORS.grassLight, roughness: 0.8 });
    const stoneMaterial = new THREE.MeshStandardMaterial({ color: COLORS.stone, roughness: 0.9 });
    const woodMaterial = new THREE.MeshStandardMaterial({ color: COLORS.wood, roughness: 1 });
    const woodDarkMaterial = new THREE.MeshStandardMaterial({ color: COLORS.woodDark, roughness: 0.9 });
    const goldMaterial = new THREE.MeshStandardMaterial({ 
      color: COLORS.gold, 
      metalness: 0.8, 
      roughness: 0.2,
      emissive: 0xffaa00,
      emissiveIntensity: 0.2
    });

    // Generate terrain
    const size = 12;
    const terrainGroup = new THREE.Group();
    
    for (let x = -size; x <= size; x++) {
      for (let z = -size; z <= size; z++) {
        const distance = Math.sqrt(x * x + z * z);
        if (distance > size - 1) continue;

        let material = grassMaterial;
        let height = Math.random() * 0.3;

        if (distance < 3) {
          height += 0.5;
          material = stoneMaterial;
        } else if (distance < 5) {
          height += 0.2;
        }

        if (Math.random() > 0.8 && distance >= 3) {
          material = grassLightMaterial;
        }

        const geometry = new THREE.BoxGeometry(1, 0.2 + height, 1);
        const tile = new THREE.Mesh(geometry, material);
        tile.position.set(x, height * 0.5, z);
        tile.castShadow = true;
        tile.receiveShadow = true;
        terrainGroup.add(tile);
      }
    }
    scene.add(terrainGroup);

    // Castle towers
    function createTower(x, z, height) {
      const group = new THREE.Group();
      group.position.set(x, height * 0.5 + (distance < 3 ? 0.5 : 0), z);

      // Tower base
      const baseGeo = new THREE.CylinderGeometry(0.8, 1, height, 8);
      const base = new THREE.Mesh(baseGeo, stoneMaterial);
      base.castShadow = true;
      group.add(base);

      // Tower top
      const topGeo = new THREE.ConeGeometry(1.2, 1.5, 8);
      const top = new THREE.Mesh(topGeo, woodDarkMaterial);
      top.position.y = height * 0.5 + 0.75;
      top.castShadow = true;
      group.add(top);

      return group;
    }

    // Main castle
    const distance = 0;
    const mainTower = createTower(0, 0, 5);
    mainTower.position.y = 1 + 2.5;
    scene.add(mainTower);

    // Corner towers
    scene.add(createTower(-2, -2, 3));
    scene.add(createTower(2, -2, 3));
    scene.add(createTower(-2, 2, 3));
    scene.add(createTower(2, 2, 3));

    // Castle walls
    const wallGeo = new THREE.BoxGeometry(4, 1, 0.3);
    const wall1 = new THREE.Mesh(wallGeo, stoneMaterial);
    wall1.position.set(0, 1.5, -2);
    scene.add(wall1);

    const wall2 = new THREE.Mesh(wallGeo, stoneMaterial);
    wall2.position.set(0, 1.5, 2);
    scene.add(wall2);

    const wallGeoSide = new THREE.BoxGeometry(0.3, 1, 4);
    const wall3 = new THREE.Mesh(wallGeoSide, stoneMaterial);
    wall3.position.set(-2, 1.5, 0);
    scene.add(wall3);

    const wall4 = new THREE.Mesh(wallGeoSide, stoneMaterial);
    wall4.position.set(2, 1.5, 0);
    scene.add(wall4);

    // Trees
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 4 + Math.random() * 6;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const scale = 0.8 + Math.random() * 0.4;

      const treeGroup = new THREE.Group();
      treeGroup.position.set(x, 0.5, z);
      treeGroup.scale.set(scale, scale, scale);

      // Trunk
      const trunkGeo = new THREE.CylinderGeometry(0.1, 0.15, 1, 6);
      const trunk = new THREE.Mesh(trunkGeo, woodMaterial);
      trunk.position.y = 0.5;
      trunk.castShadow = true;
      treeGroup.add(trunk);

      // Leaves
      const leavesGeo1 = new THREE.ConeGeometry(0.6, 1.2, 8);
      const leaves1 = new THREE.Mesh(leavesGeo1, grassMaterial);
      leaves1.position.y = 1.2;
      leaves1.castShadow = true;
      treeGroup.add(leaves1);

      const leavesGeo2 = new THREE.ConeGeometry(0.4, 0.8, 8);
      const leaves2 = new THREE.Mesh(leavesGeo2, grassLightMaterial);
      leaves2.position.y = 1.8;
      leaves2.castShadow = true;
      treeGroup.add(leaves2);

      scene.add(treeGroup);
    }

    // Floating coins
    for (let i = 0; i < 8; i++) {
      const coinGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 16);
      const coin = new THREE.Mesh(coinGeo, goldMaterial);
      coin.position.set(
        (Math.random() - 0.5) * 10,
        2 + Math.random() * 2,
        (Math.random() - 0.5) * 10
      );
      coin.castShadow = true;
      coinsRef.current.push({
        mesh: coin,
        initialY: coin.position.y,
        speed: 2 + Math.random(),
        offset: Math.random() * Math.PI * 2
      });
      scene.add(coin);
    }

    // Animation loop
    let time = 0;
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      time += 0.016;

      // Animate coins
      coinsRef.current.forEach(coin => {
        coin.mesh.position.y = coin.initialY + Math.sin(time * coin.speed + coin.offset) * 0.2;
        coin.mesh.rotation.y = time * 2;
      });

      renderer.render(scene, camera);
    };

    animate();
    setIsLoading(false);

    // Cleanup
    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      renderer.dispose();
    };
  }, [width, height]);

  return (
    <div style={{ width, height, borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#1a1a2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#C9A84C',
          fontSize: '1.5rem',
          zIndex: 10
        }}>
          Loading 3D World...
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
