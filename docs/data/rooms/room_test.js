export const room_test = {
  id: "room_test",
  height: 12,
  width: 20,
  tileheight: 32,
  tilewidth: 32,
  layers: [
    {
      type: "objectgroup",
      name: "platforms",
      objects: [
        { x: 50, y: 296, width: 160, height: 16 },
        { x: 225, y: 248, width: 112, height: 16 },
        { x: 352, y: 216, width: 96, height: 16 },
        { x: 480, y: 248, width: 96, height: 16 }
      ]
    },
    {
      type: "objectgroup",
      name: "spawns",
      objects: [
        { name: "player", type: "player", x: 74, y: 254, width: 32, height: 32 }
      ]
    },
    {
      type: "objectgroup",
      name: "entities",
      objects: [
        { x: 150, y: 250, width: 32, height: 32, properties: [{ name: "type", value: "hazard" }, { name: "damage", value: 10 }] },
        { x: 300, y: 200, width: 32, height: 32, properties: [{ name: "type", value: "resource" }, { name: "heal", value: 25 }] },
        { x: 400, y: 150, width: 32, height: 32, properties: [{ name: "type", value: "hazard" }, { name: "damage", value: 15 }, { name: "hidden", value: true }] }
      ]
    },
    {
      type: "objectgroup",
      name: "exits",
      objects: []
    }
  ],
  properties: [
    { name: "backgroundColor", type: "string", value: "#0f1b2e" },
    { name: "backgroundImage", type: "string", value: "forrest.png" },
    { name: "platformColor", type: "string", value: "#0a1016" }
  ]
};
