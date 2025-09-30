import { Container, Particle, ParticleContainer, ParticleProperties, Texture } from 'pixi.js';

export class ContainerHolder {

    private base: Container;
    private texture: Texture;
    private tiles: ParticleContainer;
    private borders: Record<string, ParticleContainer>;
    private directions: string[] = ["n", "s", "e", "w"]
    particleProperties: ParticleProperties & Record<string, boolean> = {
        position: false, // Allow dynamic position changes (default)
        scale: false, // Static scale for extra performance
        rotation: false, // Static rotation
        color: false, // Static color
    }

    constructor(baseContainer: Container, texture: Texture) {
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
    }

    public get Base(): Container {
        return this.base
    }

    public get Directions(): string[] {
        return this.directions
    }

    public AddTile(particle: Particle) {
        this.tiles.addParticle(particle)
    }

    AddBorder(border: Particle, direction: string) {
        if (this.borders[direction] == undefined) {
            throw new Error("Unknown border direction: " + direction)
        }
        this.borders[direction].addParticle(border)
    }
}