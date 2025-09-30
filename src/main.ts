import { Application, Assets, Container, ObservablePoint, Particle, ParticleContainer, ParticleProperties, Rectangle, Texture, TextureSource } from 'pixi.js';
import { ChunkOptions, NauvisOptions, TileOptions, Point } from './interfaces';
import { Biome } from './biomes';

// https://shawnhargreaves.com/blog/detail-textures.html
// https://factorio.com/blog/post/fff-214
// https://dev.to/jhmciberman/procedural-pixel-art-tilemaps-57e2

export class Nauvis {

  app!: Application;
  canvasParent!: HTMLElement;
  world!: Container;
  biomes!: Record<string, Biome>
  tileTexture!: Texture;
  chunks!: Record<string, ParticleContainer>;
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
    const visibleChunks: ParticleContainer[] = this.visibileChunks(this.world.position, this.world.scale, this.chunks)
    for (const chunk of visibleChunks) {
      this.world.addChild(chunk)
    }
    this.app.render()
  }

  // Just return all chunks for right now
  visibileChunks(position: ObservablePoint, scale: ObservablePoint, chunks: Record<string, ParticleContainer>): ParticleContainer[] {
    let out: ParticleContainer[] = []
    for (const [k, v] of Object.entries(chunks) as [string, ParticleContainer][]) {
      out.push(v)
    }
    return out
  }


  AddNewChunk(options: ChunkOptions) {
    const coordName = this.key(options.coord)
    this.chunks[coordName] = new ParticleContainer({
      dynamicProperties: this.particleProperties,
      x: options.coord.x * this.chunkTileSideLength,
      y: options.coord.y * this.chunkTileSideLength,
      texture: this.tileTexture
    })

    // Now add the tile particles if passed in
    if (options.tiles != undefined) {
      for (let i = 0; i < this.chunkTileSideLength; i++) {
        for (let j = 0; j < this.chunkTileSideLength; j++) {
          const biome = biomeType(i, j, options.tiles, this.biomes)
          let frame: Rectangle;
          if (biome == null) {
            frame = this.pixelToUV(this.emptyTileFrame, this.tileTexture)
          } else {
            //console.log(biome)
            frame = this.pixelToUV(
              biome.getTileFrame(
                options.coord, { x: i, y: j }
              ), this.tileTexture
            )
          }
          this.chunks[coordName].addParticle(new Particle({
            texture: new Texture({
              //frame: frame
              // fracX, fracY, fracX width, fracY of width
              frame: frame
            }),
            x: i,
            y: j,
            scaleX: 1 / frame.width, // height/width
            scaleY: 1 / frame.height,
          }));
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
      out[biomeJSON.id] = new Biome(tileOptions, biomeJSON, tChunkSize, tMaterialSize)
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
function biomeType(i: number, j: number, tiles: string[][], biomes: Record<string, Biome>): Biome | null {
  if (i >= tiles.length || tiles[i].length == undefined) {
    return null;
  }
  if (j >= tiles[i].length || tiles[i][j].length == undefined) {
    return null;
  }
  if (tiles[i][j] == "") {
    return null
  }
  if (biomes[tiles[i][j]] == undefined) {
    return null
  }
  return biomes[tiles[i][j]]
}

