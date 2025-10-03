import { Application, Assets, Container, ObservablePoint, Particle, ParticleContainer, ParticleProperties, Rectangle, Texture, TextureSource } from 'pixi.js';
import { ChunkOptions, NauvisOptions, TileOptions, Point } from './interfaces';
import { Biome } from './biomes';
import { Chunk } from './containerHolder';

// https://shawnhargreaves.com/blog/detail-textures.html
// https://factorio.com/blog/post/fff-214
// https://dev.to/jhmciberman/procedural-pixel-art-tilemaps-57e2

// Different approach: https://www.reddit.com/r/factorio/comments/f0djpp/friday_facts_333_terrain_scrolling/

export class Nauvis {

  app!: Application;
  canvasParent!: HTMLElement;
  world!: Container;
  biomes!: Record<string, Biome>
  tileTexture!: Texture;
  chunks!: Record<string, Chunk>;
  chunkTileSideLength!: number;
  emptyTileFrame!: Rectangle;
  particleProperties: ParticleProperties & Record<string, boolean> = {
    position: false, // Allow dynamic position changes (default)
    scale: false, // Static scale for extra performance
    rotation: false, // Static rotation
    color: false, // Static color
  }

  async Init(options: NauvisOptions) {
    // Create a new application
    this.app = new Application();
    this.canvasParent = options.canvasParent;
    this.world = new Container()
    this.app.stage.addChild(this.world)

    // Initialize the application
    await this.app.init({
      background: "#777777ff",
      resizeTo: options.canvasParent,
      autoStart: false,
      antialias: false,
    });
    this.canvasParent.appendChild(this.app.canvas);

    // Load tile textures
    this.tileTexture = await Assets.load(options.tileOptions.source);
    // Remove upscale blurriness
    this.tileTexture.source.scaleMode = 'nearest';
    this.biomes = this.generateBiomes(options.tileOptions, options.tileOptions.chunkTileSideLength, options.tileOptions.materialTileSideLength);
    this.chunkTileSideLength = options.tileOptions.chunkTileSideLength;
    this.emptyTileFrame = new Rectangle(
      options.tileOptions.emptyTile.x,
      options.tileOptions.emptyTile.y,
      options.tileOptions.emptyTile.sideLength,
      options.tileOptions.emptyTile.sideLength,
    )

    // Center camera
    this.world.position.set(this.app.canvas.width / 2, this.app.canvas.height / 2)

    // Instantiate chunks
    this.chunks = {}
  }

  Render() {
    this.world.removeChildren()
    const visibleChunks: Container[] = this.visibileChunks(this.world.position, this.world.scale, this.chunks)
    for (const chunk of visibleChunks) {
      this.world.addChild(chunk)
    }
    this.app.render()
  }

  // Just return all chunks for right now
  visibileChunks(position: ObservablePoint, scale: ObservablePoint, chunks: Record<string, Chunk>): Container[] {
    let out: Container[] = []
    for (const [, v] of Object.entries(chunks) as [string, Chunk][]) {
      out.push(v.Base)
    }
    return out
  }


  AddNewChunk(options: ChunkOptions) {
    const coordName = this.key(options.coord)
    let container = new Container({
      x: options.coord.x * this.chunkTileSideLength,
      y: -options.coord.y * this.chunkTileSideLength, // y is flipped for some reason?
    })
    this.chunks[coordName] = new Chunk(container, this.tileTexture, this.chunkTileSideLength)

    // Now add the tile particles if passed in
    if (options.tiles != undefined) {
      for (let ltY = 0; ltY < this.chunkTileSideLength; ltY++) {
        for (let ltX = 0; ltX < this.chunkTileSideLength; ltX++) {
          // Get the tile's frame on the texture
          const biome = biomeType(ltX, ltY, options.tiles, this.biomes)
          let biomeName: string;
          let frame: Rectangle;
          if (biome == null) {
            frame = this.pixelToUV(this.emptyTileFrame, this.tileTexture)
            biomeName = ""
          } else {
            frame = this.pixelToUV(
              biome.getTileFrame(
                options.coord, { x: ltX, y: ltY }
              ), this.tileTexture
            )
            biomeName = biome.id
          }
          // Add the tile particle to the tiles layer of the chunk container
          this.chunks[coordName].AddTile(frame, ltX, ltY, biomeName)
        }
      }
      // TODO: Loop over it again, this time adding borders if needed]
      // TODO: Check if neighboring chunks exist, if so update your/their borders
      for (let biome of Object.values(this.biomes)) {
        for (const direction of this.chunks[coordName].Directions) {
          // If no borders were given for this biome, don't loop through the whole chunk
          if (biome.borderFrames[direction] == undefined) {
            continue
          }
          // For each tile, check if itself should have a border
          for (let ltY = 0; ltY < this.chunkTileSideLength; ltY++) {
            for (let ltX = 0; ltX < this.chunkTileSideLength; ltX++) {
              switch (direction) {
                // Different directions require different comparisons
                case "n":
                  const inLastRow = ltY == this.chunkTileSideLength - 1
                  let currTileDiffBiome = false
                  let tileBelowIsRightBiome = false
                  if (!inLastRow) {
                    currTileDiffBiome = options.tiles[ltY][ltX] != biome.id
                    tileBelowIsRightBiome = options.tiles[ltY + 1][ltX] == biome.id
                  }
                  if (!inLastRow && currTileDiffBiome && tileBelowIsRightBiome) {
                    const frame = this.pixelToUV(
                      biome.borderFrames[direction][0].frame, this.tileTexture
                    )
                    this.chunks[coordName].AddBorder(new Particle({
                      texture: new Texture({
                        frame: frame // fracX, fracY, fracX width, fracY of width
                      }),
                      x: ltX,
                      y: ltY,
                      scaleX: (1 / frame.width) * 1.01, // height/width
                      scaleY: (1 / frame.height) * 1.01,
                    }), direction);
                  }
                  // if y is at the southern border, need to check if tiles at top of southern chunk are different
                  if (inLastRow && (options.tiles[ltY][ltX] != biome.id)) {
                    const southChunkKey = this.key({ x: options.coord.x, y: options.coord.y - 1 })
                    const southChunk = this.chunks[southChunkKey]
                    if (southChunk != undefined) {
                      const southNeighborTile = southChunk.tileData[0][ltX]
                      if (southNeighborTile == biome.id) {
                        const frame = this.pixelToUV(
                          biome.borderFrames[direction][0].frame, this.tileTexture
                        )
                        this.chunks[coordName].AddBorder(new Particle({
                          texture: new Texture({
                            frame: frame // fracX, fracY, fracX width, fracY of width
                          }),
                          x: ltX,
                          y: ltY,
                          scaleX: (1 / frame.width) * 1.01, // height/width
                          scaleY: (1 / frame.height) * 1.01,
                        }), direction);
                      }
                    }

                  }
                  break;

                default:
                  break;
              }
            }
          }
          // Check for borders against neighboring chunks?
        }
      }
    }
  }

  pixelToUV(frame: Rectangle, tileTexture: Texture<TextureSource<any>>): Rectangle {
    const newX = frame.x / tileTexture.width
    const newY = frame.y / tileTexture.height
    const newWidth = frame.width / tileTexture.width
    const newHeight = frame.height / tileTexture.height
    return new Rectangle(newX, newY, newWidth, newHeight)
  }

  generateBiomes(tileOptions: TileOptions, tChunkSize: number, tMaterialSize: number): Record<string, Biome> {
    let out: Record<string, Biome> = {}
    for (let i = 0; i < tileOptions.biomes.length; i++) {
      const biomeJSON = tileOptions.biomes[i]
      out[biomeJSON.id] = new Biome(biomeJSON.id, tileOptions, biomeJSON, tChunkSize, tMaterialSize)
    }
    return out
  }


  key = (point: Point) => `${point.x},${point.y}`; // no allocs except this tiny string

  // XorShift32 for selecting chunk material types? hash2d_float01(i, j)

  test_ScaleWorld(shrink: boolean) {
    let scale = 1.2
    if (shrink) {
      scale = 0.8
    }
    const bounds = this.world.scale
    this.world.scale.set(bounds.x * scale, bounds.y * scale)
    return this.world.scale
  }

  test_MoveWorld(direction: string) {

    switch (direction) {
      case "LEFT":
        this.world.x += 50
        break;
      case "RIGHT":
        this.world.x += -50
        break;
      case "UP":
        this.world.y += 50
        break;
      case "DOWN":
        this.world.y += -50
        break;
      default:
        break;
    }

  }

}


export type { NauvisOptions, TileOptions } from './interfaces';
function biomeType(x: number, y: number, tiles: string[][], biomes: Record<string, Biome>): Biome | null {
  if (y >= tiles.length || tiles[y].length == undefined) {
    return null;
  }
  if (x >= tiles[y].length || tiles[y][x].length == undefined) {
    return null;
  }
  if (tiles[y][x] == "") {
    return null
  }
  if (biomes[tiles[y][x]] == undefined) {
    return null
  }
  return biomes[tiles[y][x]]
}

