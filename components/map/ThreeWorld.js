'use client';

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, Environment, Text, Float, Sparkles, useTexture } from '@react-three/drei';
import * as THREE from 'three';

// Medieval color palette
const COLORS = {
  grass: '#2d4a22',
  grassLight: '#3d5a32',
  dirt: '#5c4033',
  stone: '#7a7a7a',
  stoneDark: '#5a5a5a',
  wood: '#8b4513',
  woodDark: '#654321',
  gold: '#ffd700',
  water: '#4a90e2',
  lava: '#ff4500'
};

// Terrain tile component
function TerrainTile({ position, type = 'grass', height = 0 }) {
  const meshRef = useRef();
  
  const color = useMemo(() => {
    switch(type) {
      case 'grass': return COLORS.grass;
      case 'grassLight': return COLORS.grassLight;
      case 'dirt': return COLORS.dirt;
      case 'stone': return COLORS.stone;
      case 'water': return COLORS.water;
      default: return COLORS.grass;
    }
  }, [type]);

  return (
    <mesh ref={meshRef} position={[position[0], height * 0.5, position[2]]}>
      <boxGeometry args={[1, 0.2 + height, 1]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
}

// Castle tower component
function CastleTower({ position, height = 4 }) {
  const groupRef = useRef();
  
  return (
    <group ref={groupRef} position={position}>
      {/* Tower base */}
      <mesh position={[0, height * 0.5, 0]}>
        <cylinderGeometry args={[0.8, 1, height, 8]} />
        <meshStandardMaterial color={COLORS.stone} roughness={0.9} />
      </mesh>
      
      {/* Tower top */}
      <mesh position={[0, height + 0.5, 0]}>
        <coneGeometry args={[1.2, 1.5, 8]} />
        <meshStandardMaterial color={COLORS.woodDark} roughness={0.9} />
      </mesh>
      
      {/* Windows */}
      <mesh position={[0.5, height * 0.7, 0.5]}>
        <boxGeometry args={[0.2, 0.4, 0.1]} />
        <meshStandardMaterial color={COLORS.wood} />
      </mesh>
    </group>
  );
}

// Tree component
function Tree({ position, scale = 1 }) {
  const groupRef = useRef();
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 1, 6]} />
        <meshStandardMaterial color={COLORS.wood} roughness={1} />
      </mesh>
      
      {/* Leaves */}
      <mesh position={[0, 1.2, 0]}>
        <coneGeometry args={[0.6, 1.2, 8]} />
        <meshStandardMaterial color={COLORS.grass} roughness={0.9} />
      </mesh>
      
      <mesh position={[0, 1.8, 0]}>
        <coneGeometry args={[0.4, 0.8, 8]} />
        <meshStandardMaterial color={COLORS.grassLight} roughness={0.9} />
      </mesh>
    </group>
  );
}

// Floating coin particle
function FloatingCoin({ position }) {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.2;
      meshRef.current.rotation.y = state.clock.elapsedTime;
    }
  });
  
  return (
    <mesh ref={meshRef} position={position}>
      <cylinderGeometry args={[0.15, 0.15, 0.05, 16]} />
      <meshStandardMaterial color={COLORS.gold} metalness={0.8} roughness={0.2} emissive="#ffaa00" emissiveIntensity={0.2} />
    </mesh>
  );
}

// Main world terrain
function WorldTerrain({ worldData, members }) {
  const terrainRef = useRef();
  const [hoveredTile, setHoveredTile] = useState(null);
  
  // Generate terrain grid
  const terrainTiles = useMemo(() => {
    const tiles = [];
    const size = 12;
    
    for (let x = -size; x <= size; x++) {
      for (let z = -size; z <= size; z++) {
        const distance = Math.sqrt(x * x + z * z);
        
        // Create island shape
        if (distance > size - 1) continue;
        
        // Determine tile type based on position
        let type = 'grass';
        let height = Math.random() * 0.3;
        
        // Center is higher (castle area)
        if (distance < 3) {
          height += 0.5;
          type = 'stone';
        } else if (distance < 5) {
          height += 0.2;
        }
        
        // Random variation
        if (Math.random() > 0.8) {
          type = 'grassLight';
        }
        
        tiles.push({ position: [x, 0, z], type, height, key: `${x}-${z}` });
      }
    }
    
    return tiles;
  }, []);
  
  // Generate trees
  const trees = useMemo(() => {
    const treePositions = [];
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 4 + Math.random() * 6;
      treePositions.push({
        position: [Math.cos(angle) * radius, 0.5, Math.sin(angle) * radius],
        scale: 0.8 + Math.random() * 0.4,
        key: i
      });
    }
    return treePositions;
  }, []);
  
  // Generate floating coins
  const coins = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 10,
        2 + Math.random() * 2,
        (Math.random() - 0.5) * 10
      ],
      key: i
    }));
  }, []);
  
  return (
    <group ref={terrainRef}>
      {/* Terrain */}
      {terrainTiles.map(tile => (
        <TerrainTile 
          key={tile.key}
          position={tile.position}
          type={tile.type}
          height={tile.height}
        />
      ))}
      
      {/* Castle in center */}
      <CastleTower position={[0, 1, 0]} height={5} />
      <CastleTower position={[-2, 0.5, -2]} height={3} />
      <CastleTower position={[2, 0.5, -2]} height={3} />
      <CastleTower position={[-2, 0.5, 2]} height={3} />
      <CastleTower position={[2, 0.5, 2]} height={3} />
      
      {/* Castle walls */}
      <mesh position={[0, 1.5, -2]}>
        <boxGeometry args={[4, 1, 0.3]} />
        <meshStandardMaterial color={COLORS.stone} />
      </mesh>
      <mesh position={[-2, 1.5, 0]}>
        <boxGeometry args={[0.3, 1, 4]} />
        <meshStandardMaterial color={COLORS.stone} />
      </mesh>
      <mesh position={[2, 1.5, 0]}>
        <boxGeometry args={[0.3, 1, 4]} />
        <meshStandardMaterial color={COLORS.stone} />
      </mesh>
      <mesh position={[0, 1.5, 2]}>
        <boxGeometry args={[4, 1, 0.3]} />
        <meshStandardMaterial color={COLORS.stone} />
      </mesh>
      
      {/* Trees */}
      {trees.map(tree => (
        <Tree 
          key={tree.key}
          position={tree.position}
          scale={tree.scale}
        />
      ))}
      
      {/* Floating coins */}
      {coins.map(coin => (
        <FloatingCoin key={coin.key} position={coin.position} />
      ))}
      
      {/* Sparkles around castle */}
      <Sparkles 
        count={50}
        scale={8}
        size={3}
        speed={0.4}
        color={COLORS.gold}
        position={[0, 3, 0]}
      />
    </group>
  );
}

// Camera controller
function CameraController() {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.position.set(15, 12, 15);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  
  return null;
}

// Main Three.js World Component
export default function ThreeWorld({ worldData, members, width = 800, height = 600 }) {
  return (
    <div style={{ width, height, borderRadius: '12px', overflow: 'hidden' }}>
      <Canvas
        camera={{ position: [15, 12, 15], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'linear-gradient(to bottom, #1a1a2e, #0f0f1e)' }}
      >
        <CameraController />
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[0, 10, 0]} intensity={0.5} color="#ffd700" />
        
        {/* Environment */}
        <Sky 
          distance={450000}
          sunPosition={[0, 1, 0]}
          inclination={0}
          azimuth={0.25}
        />
        
        {/* World */}
        <WorldTerrain worldData={worldData} members={members} />
        
        {/* Controls */}
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={30}
          maxPolarAngle={Math.PI / 2 - 0.1}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}
