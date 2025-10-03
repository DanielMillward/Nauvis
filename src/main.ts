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
    const coordName = key(options.coord)
    let container = new Container({
      x: options.coord.x * this.chunkTileSideLength,
      y: -options.coord.y * this.chunkTileSideLength, // y is flipped for some reason?
    })
    this.chunks[coordName] = new Chunk(container, this.tileTexture, this.chunkTileSideLength)

    /* ----- TILES ----- */
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

      /* ----- BORDERS ----- */
      for (let biome of Object.values(this.biomes)) {
        for (const direction of this.chunks[coordName].Directions) {
          // If no borders were given for this biome, don't loop through the whole chunk
          if (biome.borderFrames[direction] == undefined) {
            continue
          }
          // For each tile, check if itself should have a border
          for (let ltY = 0; ltY < this.chunkTileSideLength; ltY++) {
            for (let ltX = 0; ltX < this.chunkTileSideLength; ltX++) {
              const tileCoord: Point = { x: ltX, y: ltY }
              const hasBorder = this.hasBorder(this.chunkTileSideLength, this.chunks, options.tiles, tileCoord, options.coord, biome.id, direction)
              if (hasBorder) {
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
          // make the neighbors update this biome/direction with new information
          this.updateBorderSide(options.coord, biome, direction)
        }
      }
    }
  }

  updateBorderSide(newChunkCoord: Point, biome: Biome, direction: string) {
    let currChunk!: Point;

    for (let i = 0; i < this.chunkTileSideLength; i++) {
      let newChunkTileRightBiome = false
      let currTileDiffBiome = false
      let currTileX = 0
      let currTileY = 0
      switch (direction) {
        case "n":
          // New chunk has appeared on the south
          currChunk = { x: newChunkCoord.x, y: newChunkCoord.y + 1 }
          if (this.chunks[key(currChunk)] == undefined || this.chunks[key(newChunkCoord)] == undefined) {
            return
          }
          newChunkTileRightBiome = this.chunks[key(newChunkCoord)].tileData[0][i] == biome.id
          currTileDiffBiome = this.chunks[key(currChunk)].tileData[this.chunks[key(currChunk)].tileData.length - 1][i] != biome.id
          currTileX = i
          currTileY = this.chunks[key(currChunk)].tileData[i].length - 1
          break;
        case "s":
          // New chunk has appeared to the north
          currChunk = { x: newChunkCoord.x, y: newChunkCoord.y - 1 }
          if (this.chunks[key(currChunk)] == undefined || this.chunks[key(newChunkCoord)] == undefined) {
            return
          }
          newChunkTileRightBiome = this.chunks[key(newChunkCoord)].tileData[this.chunks[key(newChunkCoord)].tileData.length - 1][i] == biome.id
          currTileDiffBiome = this.chunks[key(currChunk)].tileData[0][i] != biome.id
          currTileX = i
          currTileY = 0
          break;
        case "e":
          // New chunk has appeared to the west
          currChunk = { x: newChunkCoord.x + 1, y: newChunkCoord.y }
          if (this.chunks[key(currChunk)] == undefined || this.chunks[key(newChunkCoord)] == undefined) {
            return
          }
          newChunkTileRightBiome = this.chunks[key(newChunkCoord)].tileData[i][this.chunks[key(newChunkCoord)].tileData[i].length - 1] == biome.id
          currTileDiffBiome = this.chunks[key(currChunk)].tileData[i][0] != biome.id
          currTileX = 0
          currTileY = i
          break;
        case "w":
          // New chunk has appeared to the east
          currChunk = { x: newChunkCoord.x - 1, y: newChunkCoord.y }
          if (this.chunks[key(currChunk)] == undefined || this.chunks[key(newChunkCoord)] == undefined) {
            return
          }
          newChunkTileRightBiome = this.chunks[key(newChunkCoord)].tileData[i][0] == biome.id
          currTileDiffBiome = this.chunks[key(currChunk)].tileData[i][this.chunks[key(currChunk)].tileData[i].length - 1] != biome.id
          currTileX = this.chunks[key(currChunk)].tileData[i].length - 1
          currTileY = i
          break;
        default:
          break;
      }

      if (newChunkTileRightBiome && currTileDiffBiome) {
        const frame = this.pixelToUV(
          biome.borderFrames[direction][0].frame, this.tileTexture
        )
        this.chunks[key(currChunk)].AddBorder(new Particle({
          texture: new Texture({
            frame: frame // fracX, fracY, fracX width, fracY of width
          }),
          x: currTileX,
          y: currTileY,
          scaleX: (1 / frame.width) * 1.01, // height/width
          scaleY: (1 / frame.height) * 1.01,
        }), direction);
      }
    }
  }

  hasBorder(chunkSize: number, chunks: Record<string, Chunk>, tiles: string[][], tileCoord: Point, chunkCoord: Point, biomeId: string, direction: string) {
    let onBorderEdge: boolean = false
    let neighborChunk!: Chunk;
    let neighborTileCoord!: Point;
    let neighborTileIsRightBiome: boolean = false
    let currTileDiffBiome = tiles[tileCoord.y][tileCoord.x] != biomeId
    switch (direction) {
      // Different directions require different comparisons
      case "n":
        onBorderEdge = tileCoord.y == chunkSize - 1
        neighborChunk = chunks[key({ x: chunkCoord.x, y: chunkCoord.y - 1 })]
        neighborTileCoord = { x: tileCoord.x, y: 0 }
        if (!onBorderEdge) {
          neighborTileIsRightBiome = tiles[tileCoord.y + 1][tileCoord.x] == biomeId
        }
        break;
      case "s":
        onBorderEdge = tileCoord.y == 0
        neighborChunk = chunks[key({ x: chunkCoord.x, y: chunkCoord.y + 1 })]
        neighborTileCoord = { x: tileCoord.x, y: chunkSize - 1 }
        if (!onBorderEdge) {
          neighborTileIsRightBiome = tiles[tileCoord.y - 1][tileCoord.x] == biomeId
        }
        break;
      case "e":
        onBorderEdge = tileCoord.x == 0
        neighborChunk = chunks[key({ x: chunkCoord.x - 1, y: chunkCoord.y })]
        neighborTileCoord = { x: tileCoord.x - 1, y: tileCoord.y }
        if (!onBorderEdge) {
          neighborTileIsRightBiome = tiles[tileCoord.y][tileCoord.x - 1] == biomeId
        }
        break;
      case "w":
        onBorderEdge = tileCoord.x == chunkSize - 1
        neighborChunk = chunks[key({ x: chunkCoord.x + 1, y: chunkCoord.y })]
        neighborTileCoord = { x: tileCoord.x + 1, y: tileCoord.y }
        if (!onBorderEdge) {
          neighborTileIsRightBiome = tiles[tileCoord.y][tileCoord.x + 1] == biomeId
        }
        break;
      default:
        break;
    }

    return this.borderLogic(onBorderEdge, neighborTileIsRightBiome, neighborChunk, neighborTileCoord, currTileDiffBiome, biomeId)
  }
  borderLogic(onBorderEdge: boolean, neighborTileIsRightBiome: boolean, neighborChunk: Chunk | undefined, neighborTileCoord: Point, currTileDiffBiome: boolean, biomeId: string): boolean {
    if (!onBorderEdge && currTileDiffBiome && neighborTileIsRightBiome) {
      return true
    }
    // if y is at the southern border, need to check if tiles at top of southern chunk are different
    if (onBorderEdge && currTileDiffBiome) {
      if (neighborChunk != undefined) {
        const neighborTile = neighborChunk.tileData[neighborTileCoord.y][neighborTileCoord.x]
        if (neighborTile == biomeId) {
          return true
        }
      }
    }
    return false
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

const key = (point: Point) => `${point.x},${point.y}`; // no allocs except this tiny string


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



