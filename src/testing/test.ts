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
        { "x": 64, "y": 0, "weight": 10 },
         { "x": 96, "y": 0, "weight": 10 },
          { "x": 128, "y": 0, "weight": 10 }
      ],
      "details": [
        { "x": 0, "y": 32, "weight": 10 },
        { "x": 16, "y": 32, "weight": 5 }
      ],
      "borders": {
        "n": [{ "x": 0, "y": 48, "weight": 10 }],
        "s": [{ "x": 16, "y": 48, "weight": 10 }],
        "e": [{ "x": 32, "y": 48, "weight": 10 }],
        "w": [{ "x": 48, "y": 48, "weight": 10 }]
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
    coord: { x: 0, y: 0 },
    tiles: [["grass", "grass", "grass", "water"],
    ["grass", "grass", "water", "grass"],
    ["grass", "water", "grass", "grass"],
    ["water", "grass", "grass", "grass"],]
  })
  nauvis.AddNewChunk({
    coord: { x: 0, y: 1 },
    tiles: [["water", "water", "water", "water"],
    ["water", "water", "water", "water"],
    ["water", "water", "water", "water"],
    ["water", "water", "water", "water"],]
  })


    

  */
  for (let cY = -3; cY < 1; cY++) {
    for (let cX = -3; cX < 1; cX++) {
      let chunkX0Y0: string[][] = [];
      for (let tY = 0; tY < tileOptions.chunkTileSideLength; tY++) {
        let newRow: string[] = []
        for (let tX = 0; tX < tileOptions.chunkTileSideLength; tX++) {
          const gX = cX * tileOptions.chunkTileSideLength + tX
          const gY = cY * tileOptions.chunkTileSideLength - tY
          //TESTING
          if (cY == 1 && cX == 1) {
            newRow.push("water")
          } else {
            newRow.push(FractalBrownianMotion(gX * 10, gY * 10, 2) < 0.2 ? "grass" : "water")
          }
        }
        chunkX0Y0.push(newRow)
      }
      // testing chunk borders
      chunkX0Y0[chunkX0Y0.length - 1] = ["water", "water", "water", "water", "water", "water", "water", "water", "water", "water", "water", "water", "water", "water", "water", "water", "water", "water", "water", "water", "water", "water", "water", "water", "water", "water", "water", "water", "water", "water", "water", "water"]
      nauvis.AddNewChunk({
        coord: { x: cX, y: cY },
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


