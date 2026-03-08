import { useEffect, useRef } from 'react';

const TILE_WIDTH = 128;
const TILE_HEIGHT = 64;

export function useIsometricMap({ worldData, members, onTileClick }) {
    const canvasRef = useRef(null);

    // Define plots mapping according to plot_index
    const plotPositions = {
        0: { x: 4, y: 4 },
        1: { x: 6, y: 4 },
        2: { x: 4, y: 6 },
        3: { x: 6, y: 6 },
    };

    const drawTile = (ctx, screenX, screenY, isPlot = false) => {
        ctx.save();
        ctx.translate(screenX, screenY);

        // Draw base ground tile
        ctx.beginPath();
        ctx.moveTo(0, -TILE_HEIGHT / 2); // Top
        ctx.lineTo(TILE_WIDTH / 2, 0);   // Right
        ctx.lineTo(0, TILE_HEIGHT / 2);  // Bottom
        ctx.lineTo(-TILE_WIDTH / 2, 0);  // Left
        ctx.closePath();

        ctx.fillStyle = '#C8A96E'; // Earthy tan
        ctx.fill();
        ctx.strokeStyle = '#8B6914'; // Darker border
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw House on plot tiles
        if (isPlot) {
            const houseWidth = 40;
            const houseHeight = 50;
            const roofHeight = 25;

            // Top (Roof) - A0845C
            ctx.beginPath();
            ctx.moveTo(0, -houseHeight - roofHeight); // Peak
            ctx.lineTo(houseWidth, -houseHeight - roofHeight / 2); // Right corner
            ctx.lineTo(0, -houseHeight); // Bottom corner
            ctx.lineTo(-houseWidth, -houseHeight - roofHeight / 2); // Left corner
            ctx.closePath();
            ctx.fillStyle = '#A0845C';
            ctx.fill();

            // Left Wall - #5C4A2A
            ctx.beginPath();
            ctx.moveTo(-houseWidth, -houseHeight - roofHeight / 2);
            ctx.lineTo(0, -houseHeight);
            ctx.lineTo(0, 0); // Bottom center
            ctx.lineTo(-houseWidth, -roofHeight / 2); // Bottom left
            ctx.closePath();
            ctx.fillStyle = '#5C4A2A';
            ctx.fill();

            // Right Wall - #7A6138
            ctx.beginPath();
            ctx.moveTo(0, -houseHeight);
            ctx.lineTo(houseWidth, -houseHeight - roofHeight / 2);
            ctx.lineTo(houseWidth, -roofHeight / 2); // Bottom right
            ctx.lineTo(0, 0); // Bottom center
            ctx.closePath();
            ctx.fillStyle = '#7A6138';
            ctx.fill();
        }

        ctx.restore();
    };

    useEffect(() => {
        console.log('useIsometricMap useEffect triggered with:', { worldData, members });
        const canvas = canvasRef.current;
        if (!canvas) {
            console.log('Canvas not ready yet');
            return;
        }

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        console.log('Canvas dimensions:', { width, height });

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Center origin (offset to center of canvas so tiles show up)
        const offsetX = width / 2;
        const offsetY = height / 4;

        // Member mapping for quick lookups
        const memberPlots = {};
        if (members && members.length > 0) {
            members.forEach(member => {
                if (member.plot_index >= 0 && member.plot_index <= 3) {
                    const pos = plotPositions[member.plot_index];
                    memberPlots[`${pos.x},${pos.y}`] = member;
                }
            });
        }

        // Draw the grid (e.g. 10x10)
        const gridSize = 10;

        // Draw back-to-front so closer tiles overlap further ones
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                const screenX = offsetX + (x - y) * (TILE_WIDTH / 2);
                const screenY = offsetY + (x + y) * (TILE_HEIGHT / 2);

                const isPlot = !!memberPlots[`${x},${y}`];
                drawTile(ctx, screenX, screenY, isPlot);
            }
        }

        // --- DRAW LANDMARKS ---
        const drawIsomBox = (ctx, sx, sy, width, height, roofHeight, colors, alpha = 1) => {
            ctx.save();
            ctx.translate(sx, sy);
            ctx.globalAlpha = alpha;

            // Top (Roof)
            ctx.beginPath();
            ctx.moveTo(0, -height - roofHeight);
            ctx.lineTo(width, -height - roofHeight / 2);
            ctx.lineTo(0, -height);
            ctx.lineTo(-width, -height - roofHeight / 2);
            ctx.closePath();
            ctx.fillStyle = colors.top;
            ctx.fill();

            // Left Wall
            ctx.beginPath();
            ctx.moveTo(-width, -height - roofHeight / 2);
            ctx.lineTo(0, -height);
            ctx.lineTo(0, 0);
            ctx.lineTo(-width, -roofHeight / 2);
            ctx.closePath();
            ctx.fillStyle = colors.left;
            ctx.fill();

            // Right Wall
            ctx.beginPath();
            ctx.moveTo(0, -height);
            ctx.lineTo(width, -height - roofHeight / 2);
            ctx.lineTo(width, -roofHeight / 2);
            ctx.lineTo(0, 0);
            ctx.closePath();
            ctx.fillStyle = colors.right;
            ctx.fill();

            ctx.restore();
        };

        const drawParkTiles = (ctx, sx, sy, alpha = 1) => {
            ctx.save();
            ctx.translate(sx, sy);
            ctx.globalAlpha = alpha;
            // Draw a few green tiles for the park
            const offsets = [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }];
            offsets.forEach(off => {
                const px = (off.dx - off.dy) * (TILE_WIDTH / 2);
                const py = (off.dx + off.dy) * (TILE_HEIGHT / 2);
                ctx.beginPath();
                ctx.moveTo(px, py - TILE_HEIGHT / 2);
                ctx.lineTo(px + TILE_WIDTH / 2, py);
                ctx.lineTo(px, py + TILE_HEIGHT / 2);
                ctx.lineTo(px - TILE_WIDTH / 2, py);
                ctx.closePath();
                ctx.fillStyle = '#4A6B3A'; // Forest green
                ctx.fill();
                ctx.strokeStyle = '#2B4021';
                ctx.lineWidth = 1;
                ctx.stroke();
            });
            ctx.restore();
        };

        const milestones = worldData?.milestones_unlocked || [];

        // 1. Park (2, 4)
        const parkTx = 2, parkTy = 4;
        const parkSx = offsetX + (parkTx - parkTy) * (TILE_WIDTH / 2);
        const parkSy = offsetY + (parkTx + parkTy) * (TILE_HEIGHT / 2);
        const hasPark = milestones.includes('park');
        drawParkTiles(ctx, parkSx, parkSy, hasPark ? 1 : 0.3);

        // 2. Library (8, 4)
        const libTx = 8, libTy = 4;
        const libSx = offsetX + (libTx - libTy) * (TILE_WIDTH / 2);
        const libSy = offsetY + (libTx + libTy) * (TILE_HEIGHT / 2);
        const hasLib = milestones.includes('library');
        // Taller than house (width 50, height 100, roof 30)
        drawIsomBox(ctx, libSx, libSy, 50, 100, 30, { top: '#A39171', left: '#4A5063', right: '#636A82' }, hasLib ? 1 : 0.4);

        // 3. Monument (5, 2)
        const monTx = 5, monTy = 2;
        const monSx = offsetX + (monTx - monTy) * (TILE_WIDTH / 2);
        const monSy = offsetY + (monTx + monTy) * (TILE_HEIGHT / 2);
        const hasMon = milestones.includes('monument');
        // Narrow thin tower (width 25, height 180, roof 40)
        drawIsomBox(ctx, monSx, monSy, 25, 180, 40, { top: '#D4C4A9', left: '#827A6B', right: '#A39B8A' }, hasMon ? 1 : 0.4);

    }, [worldData, members]);

    const handleClick = (e) => {
        if (!onTileClick || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        // Mouse coordinates relative to canvas origin
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Remove center offset (same as drawing offset)
        const offsetX = canvas.width / 2;
        const offsetY = canvas.height / 4;

        const screenX = clickX - offsetX;
        const screenY = clickY - offsetY;

        // Reverse Isometric Math
        // screenX = (tileX - tileY) * (TILE_WIDTH / 2)
        // screenY = (tileX + tileY) * (TILE_HEIGHT / 2)
        // Solving for tileX and tileY:
        const tileX = Math.floor((screenX / (TILE_WIDTH / 2) + screenY / (TILE_HEIGHT / 2)) / 2);
        const tileY = Math.floor((screenY / (TILE_HEIGHT / 2) - screenX / (TILE_WIDTH / 2)) / 2);

        // Ensure we only click on valid tiles
        if (tileX >= 0 && tileX < 10 && tileY >= 0 && tileY < 10) {
            let memberId = null;
            if (members && members.length > 0) {
                const clickedMember = members.find(m => {
                    const pos = plotPositions[m.plot_index];
                    return pos && pos.x === tileX && pos.y === tileY;
                });
                if (clickedMember) {
                    memberId = clickedMember.id;
                }
            }

            onTileClick(tileX, tileY, memberId);
        }
    };

    return { canvasRef, handleClick };
}
