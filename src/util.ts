// Deterministic "random-ish" per integer coordinate using xorshift32.
// Works in both Node and the browser.

//
// 32-bit helpers
//
function zigzag32(n: number): number {
    // Map signed int -> unsigned: 0,-1,1,-2,2,... -> 0,1,2,3,4,...
    return ((n << 1) ^ (n >> 31)) >>> 0;
}

function xorshift32(s: number): number {
    // One xorshift32 step; returns a 32-bit unsigned int
    s >>>= 0;
    s ^= (s << 13) >>> 0;
    s ^= s >>> 17;
    s ^= (s << 5) >>> 0;
    return s >>> 0;
}

//
// 2D hash
//
export function hash2d_xorshift(
    x: number,
    y: number,
    seed = 0x9e3779b9 // default "golden ratio" seed
): number {
    // If you want to be strict about integer inputs:
    // x = x | 0; y = y | 0;

    const sx = zigzag32(x);
    const sy = zigzag32(y);

    // Mix coordinates into a 32-bit state (use Math.imul for 32-bit multiplies)
    let s = seed >>> 0;
    s = (s + Math.imul(0x85ebca6b, sx) + Math.imul(0xc2b2ae35, sy)) >>> 0;

    // Finalize with xorshift32
    return xorshift32(s);
}

//
// Convenience: map to [0, 1)
//
export function hash2d_float01(x: number, y: number, seed?: number): number {
    return hash2d_xorshift(x, y, seed) / 0x1_0000_0000; // divide by 2^32
}

// --- Example ---
/*
const h = hash2d_xorshift(3, 5);           // 0xF26396D5
const r = hash2d_float01(3, 5);            // ~0.9468321104
console.log(h.toString(16), r);
*/
