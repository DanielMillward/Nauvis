import { Container, Particle, ParticleContainer, ParticleProperties, Rectangle, Texture } from 'pixi.js';

export class Chunk {

    private base: Container;
    private texture: Texture;
    private tiles: ParticleContainer;
    public tileData: string[][]; // In (y,x) order
    private borders: Record<string, ParticleContainer>;
    private directions: string[] = ["n", "s", "e", "w"]
    particleProperties: ParticleProperties & Record<string, boolean> = {
        position: false, // Allow dynamic position changes (default)
        scale: false, // Static scale for extra performance
        rotation: false, // Static rotation
        color: false, // Static color
    }

    constructor(baseContainer: Container, texture: Texture, chunkSize: number) {
        this.base = baseContainer;
        this.texture = texture;
        this.tiles = new ParticleContainer({
            dynamicProperties: this.particleProperties,
            texture: this.texture
        })
        this.base.addChild(this.tiles)
        this.borders = {}
        for (const direction of this.directions) {
            this.borders[direction] = new ParticleContainer({
                dynamicProperties: this.particleProperties,
                texture: this.texture
            })
            this.base.addChild(this.borders[direction])
        }
        this.tileData = []
        for (let y = 0; y < chunkSize; y++) {
            let newRow = []
            for (let x = 0; x < chunkSize; x++) {
                newRow.push("")
            }
            this.tileData.push(newRow)
        }
    }

    public get Base(): Container {
        return this.base
    }

    public get Directions(): string[] {
        return this.directions
    }

    public AddTile(frame: Rectangle, x: number, y: number, biome: string) {
        this.tiles.addParticle(new Particle({
            texture: new Texture({
                frame: frame // fracX, fracY, fracX width, fracY of width
            }),
            x: x,
            y: y,
            // https://www.html5gamedevs.com/topic/48222-weird-flickering-in-scene-with-a-lot-of-sprites-roughly-1000/
            // https://github.com/pixijs/pixijs/issues/6676
            scaleX: (1 / frame.width) * 1.1, // height/width. 1.1 Is to prevent flickering between
            scaleY: (1 / frame.height) * 1.1,
        }));
        this.tileData[y][x] = biome
    }

    AddBorder(border: Particle, direction: string) {
        if (this.borders[direction] == undefined) {
            throw new Error("Unknown border direction: " + direction)
        }
        this.borders[direction].addParticle(border)
    }
}