import { Nauvis, TileOptions } from '../main.js';
import { FractalBrownianMotion } from '../noise.js';

const tileOptionsJSON = `

{
  "source": "../assets/images/tiles.png",

  "materialTileSideLength": 4,
  "materialPixelSideLength": 32,

  "detailsTileSideLength": 2,
  "detailsPixelSideLength": 16,

  "borderPixelSideLength": 16,

  "chunkTileSideLength": 32,

  "biomes": [
    {
      "id": "grass",
      "materials": [
        { "x": 64, "y": 0, "weight": 10 }
      ],
      "details": [
        { "x": 0, "y": 32, "weight": 10 },
        { "x": 16, "y": 32, "weight": 5 }
      ],
      "borders": {
        "n": [{ "x": 0, "y": 48, "weight": 10 }],
        "s": [{ "x": 16, "y": 48, "weight": 10 }]
      }
    },
    {
      "id": "water",
      "materials": [{ "x": 32, "y": 0, "weight": 10 }],
      "details": [
        { "x": 0, "y": 32, "weight": 10 },
        { "x": 16, "y": 32, "weight": 5 }
      ],
      "borders": {
        "n": [{ "x": 0, "y": 48, "weight": 10 }],
        "s": [{ "x": 16, "y": 48, "weight": 10 }]
      }
    }
  ],

  "emptyTile": { "x": 0, "y": 64, "sideLength": 16 }
}


`;


(async () => {
  const tileOptions: TileOptions = JSON.parse(tileOptionsJSON)

  let nauvis = new Nauvis();
  await nauvis.Init({
    canvasParent: document.getElementById("pixi-container") as HTMLElement,
    tileOptions: tileOptions
  });

  console.log(nauvis.biomes)
  //nauvis.Render()

  /*
    nauvis.AddNewChunk({
    coord: { x: -1, y: -1 },
    tiles: chunkX0Y0
  })
  nauvis.AddNewChunk({
    coord: { x: 0, y: 0 },
    tiles: chunkX0Y0
  })

  */
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      const chunkX0Y0: string[][] = [];
      for (let k = 0; k < 32; k++) {
        let newRow: string[] = []
        for (let l = 0; l < 32; l++) {
          const gX = i * 32 + k
          const gY = j * 32 + l
          newRow.push(FractalBrownianMotion(gX * 10, gY * 10, 2) < 0.5 ? "grass" : "water")
        }
        chunkX0Y0.push(newRow)
      }
      nauvis.AddNewChunk({
        coord: { x: -2 + i, y: -2 + j },
        tiles: chunkX0Y0
      })
    }
  }

  nauvis.Render()
  window.addEventListener("wheel", (e) => {
    let shrink = false
    if (e.deltaY > 0) {
      shrink = true
    }
    nauvis.test_ScaleWorld(shrink)
    //console.log(nauvis.test_ScaleWorld(shrink))
    //container.removeChildren()
    nauvis.Render()
  });

  window.addEventListener("keydown", (e) => {
    if (e.code == "KeyD") {
      nauvis.test_MoveWorld("RIGHT")
    } else if (e.code == "KeyA") {
      nauvis.test_MoveWorld("LEFT")
    } else if (e.code == "KeyW") {
      nauvis.test_MoveWorld("UP")
    }
    else if (e.code == "KeyS") {
      nauvis.test_MoveWorld("DOWN")
    }
    nauvis.Render()
  });

})();


