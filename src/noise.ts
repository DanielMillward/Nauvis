// FROM: https://rtouti.github.io/graphics/perlin-noise-algorithm

class Vector2 {
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
    dot(other: Vector2) {
        return this.x * other.x + this.y * other.y;
    }
}

function Shuffle(tab: any[]) {
    for (let e = tab.length - 1; e > 0; e--) {
        let index = Math.round(Math.random() * (e - 1)),
            temp = tab[e];

        tab[e] = tab[index];
        tab[index] = temp;
    }
}

function MakePermutation() {
    let P = [];
    for (let i = 0; i < 256; i++) {
        P.push(i);
    }
    Shuffle(P);
    for (let i = 0; i < 256; i++) {
        P.push(P[i]);
    }

    return P;
}
let P = MakePermutation();

function GetConstantVector(v: number) {
    //v is the value from the permutation table
    let h = v & 3;
    if (h == 0)
        return new Vector2(1.0, 1.0);
    else if (h == 1)
        return new Vector2(-1.0, 1.0);
    else if (h == 2)
        return new Vector2(-1.0, -1.0);
    else
        return new Vector2(1.0, -1.0);
}

function Fade(t: number) {
    return ((6 * t - 15) * t + 10) * t * t * t;
}

function Lerp(t: number, a1: number, a2: number) {
    return a1 + t * (a2 - a1);
}

function Noise2D(x: number, y: number) {
    let X = Math.floor(x) & 255;
    let Y = Math.floor(y) & 255;

    let xf = x - Math.floor(x);
    let yf = y - Math.floor(y);

    let topRight = new Vector2(xf - 1.0, yf - 1.0);
    let topLeft = new Vector2(xf, yf - 1.0);
    let bottomRight = new Vector2(xf - 1.0, yf);
    let bottomLeft = new Vector2(xf, yf);

    //Select a value in the array for each of the 4 corners
    let valueTopRight = P[P[X + 1] + Y + 1];
    let valueTopLeft = P[P[X] + Y + 1];
    let valueBottomRight = P[P[X + 1] + Y];
    let valueBottomLeft = P[P[X] + Y];

    let dotTopRight = topRight.dot(GetConstantVector(valueTopRight));
    let dotTopLeft = topLeft.dot(GetConstantVector(valueTopLeft));
    let dotBottomRight = bottomRight.dot(GetConstantVector(valueBottomRight));
    let dotBottomLeft = bottomLeft.dot(GetConstantVector(valueBottomLeft));

    let u = Fade(xf);
    let v = Fade(yf);

    return Lerp(u,
        Lerp(v, dotBottomLeft, dotTopLeft),
        Lerp(v, dotBottomRight, dotTopRight)
    );

}

export function FractalBrownianMotion(x: number, y: number, numOctaves: number) {
    let result = 0.0;
    let amplitude = 1.0;
    let frequency = 0.005;

    for (let octave = 0; octave < numOctaves; octave++) {
        const n = amplitude * Noise2D(x * frequency, y * frequency);
        result += n;

        amplitude *= 0.5;
        frequency *= 2.0;
    }

    return result;
}