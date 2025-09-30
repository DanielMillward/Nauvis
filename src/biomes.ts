import { Rectangle } from 'pixi.js';
import { BiomeJSON, Point, TileOptions } from './interfaces';
import { hash2d_float01 } from './util';

export class Biome {
    materialFrames: WeightedFrame[]
    detailFrames: WeightedFrame[]
    borderFrames: Record<string, WeightedFrame[]>
    chunkTileSize: number
    materialTileSize: number

    constructor(tileOptions: TileOptions, biomeJson: BiomeJSON, chunkTileSize: number, materialTileSize: number) {
        this.materialFrames = []
        this.detailFrames = []
        this.borderFrames = {}

        let materialSum = 0;
        for (const material of biomeJson.materials) {
            materialSum += material.weight
        }
        for (const material of biomeJson.materials) {
            this.materialFrames.push({
                frame: new Rectangle(
                    material.x,
                    material.y,
                    tileOptions.materialPixelSideLength,
                    tileOptions.materialPixelSideLength
                ),
                normWeight: material.weight / materialSum
            })
        }

        let detailSum = 0
        for (const detail of biomeJson.details) {
            detailSum += detail.weight
        }
        if (detailSum > 0) {
            const detailSizeX = tileOptions.detailsPixelSideLength
            const detailSizeY = tileOptions.detailsPixelSideLength
            for (const detail of biomeJson.details) {
                this.detailFrames.push({
                    frame: new Rectangle(
                        detail.x,
                        detail.y,
                        detailSizeX,
                        detailSizeY
                    ),
                    normWeight: detail.weight / detailSum
                })
            }
        }
        for (const [borderId, sections] of Object.entries(biomeJson.borders)) {
            let borderSum = 0
            for (const section of sections) {
                borderSum += section.weight
            }
            if (borderSum === 0) {
                continue
            }
            const borderSizeX = tileOptions.borderPixelSideLength
            const borderSizeY = tileOptions.borderPixelSideLength
            const frames: WeightedFrame[] = []
            for (const section of sections) {
                frames.push({
                    frame: new Rectangle(
                        section.x,
                        section.y,
                        borderSizeX,
                        borderSizeY
                    ),
                    normWeight: section.weight / borderSum
                })
            }
            this.borderFrames[borderId] = frames
        }

        this.chunkTileSize = chunkTileSize;
        this.materialTileSize = materialTileSize;
    }

    // All tile/chunk/material coordinates are based on their top-left corner.
    getTileFrame(chunkCoord: Point, tileCoord: Point): Rectangle {
        // 1) Global tile coordinate
        const gTileX = chunkCoord.x * this.chunkTileSize + tileCoord.x;
        const gTileY = chunkCoord.y * this.chunkTileSize + tileCoord.y;

        // 2) Material tile coord (use floor for negative support)
        const matX = Math.floor(gTileX / this.materialTileSize);
        const matY = Math.floor(gTileY / this.materialTileSize);

        // Top-left of the material square in tile units
        const tlMatX = matX * this.materialTileSize;
        const tlMatY = matY * this.materialTileSize;

        // Offsets within that material square [0..materialTileSize-1]
        const tileOffsetX = gTileX - tlMatX;
        const tileOffsetY = gTileY - tlMatY;

        // 3) Material frame rect (the spritesheet region for this material square)
        const materialRect = GetWeightedFrame(matX, matY, this.materialFrames);

        // 4) Pixel size of one tile inside that rect
        const tilePxSize = materialRect.width / this.materialTileSize; // assumes square; use height similarly if needed

        // 5) Tile frame inside the material rect
        const tileFrameX = materialRect.x + tileOffsetX * tilePxSize;
        const tileFrameY = materialRect.y + tileOffsetY * tilePxSize;

        return new Rectangle(tileFrameX, tileFrameY, tilePxSize, tilePxSize);
    }


}


export function GetWeightedFrame(x: number, y: number, frames: WeightedFrame[]): Rectangle {
    const randFloat = hash2d_float01(x, y)
    let counter = 0;
    for (let i = 0; i < frames.length; i++) {
        if (randFloat < counter + frames[i].normWeight) {
            return frames[i].frame
        }
        counter = counter + frames[i].normWeight
    }
    throw new Error("counting went above 1??")
}
interface WeightedFrame {
    frame: Rectangle;
    normWeight: number;
}
