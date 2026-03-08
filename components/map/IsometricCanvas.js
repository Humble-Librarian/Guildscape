'use client';

import React from 'react';
import { useIsometricMap } from './useIsometricMap';

export default function IsometricCanvas({ worldData, members, currentUserId, width = 800, height = 600, onTileClick }) {
    const { canvasRef, handleClick } = useIsometricMap({
        worldData,
        members,
        onTileClick
    });

    console.log('IsometricCanvas rendering with:', { worldData, members, width, height });

    // Simple test - render a colored div if no worldData
    if (!worldData) {
        return (
            <div style={{ 
                width, 
                height, 
                backgroundColor: '#ff0000', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'white',
                fontSize: '24px',
                borderRadius: '8px'
            }}>
                No world data
            </div>
        );
    }

    return (
        <div className="isometric-map-container" style={{ position: 'relative', width, height }}>
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                onClick={handleClick}
                style={{
                    cursor: 'pointer',
                    background: '#1a1a1a', // Dark background for contrast
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
            />
            {/* Fallback info / Overlay UI could go here */}
        </div>
    );
}
