export interface NauvisOptions {
    canvasParent: HTMLElement;
    tileOptions: TileOptions;
}

export interface TileOptions {
    source: string;
    materialTileSideLength: number;
    materialPixelSideLength: number;
    detailsTileSideLength: number;
    detailsPixelSideLength: number;
    borderPixelSideLength: number;
    chunkTileSideLength: number;
    biomes: BiomeJSON[];
    emptyTile: TileData;
}

export interface Size {
    width: number;
    height: number;
}

export interface BiomeJSON {
    id: string;
    materials: WeightedSectionJSON[];
    details: WeightedSectionJSON[];
    borders: { [key: string]: WeightedSectionJSON[] };
}

export interface WeightedSectionJSON {
    x: number;
    y: number;
    weight: number;
}

export interface ChunkOptions {
    coord: Point;
    tiles?: string[][];
}

export interface Point {
    x: number;
    y: number;
}

export interface TileData {
    x: number;
    y: number;
    sideLength: number;
}