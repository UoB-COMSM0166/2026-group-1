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
        { x: 160, y: 172, width: 32, height: 64 },
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
      objects: []
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
