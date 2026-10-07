export type ShipControlKind =
  "number" | "color" | "shape" | "switch" | "direction" | "picture";
export const shipColors = ["Red", "Blue", "Yellow", "Green"] as const;
export const shipShapes = ["Circle", "Square", "Triangle", "Star"] as const;
export const shipDirections = ["Up", "Right", "Down", "Left"] as const;
const numbers = ["0", "1", "2", "3"];
const power = ["Off", "On"];
const door = ["Closed", "Open"];
export interface ShipControlDefinition {
  name: string;
  kind: ShipControlKind;
  settings: readonly string[];
}
export const shipPanels: readonly ShipControlDefinition[] = [
  { name: "Lights", kind: "color", settings: shipColors },
  { name: "Shield", kind: "shape", settings: shipShapes },
  { name: "Door", kind: "switch", settings: door },
  { name: "Engine", kind: "number", settings: numbers },
  { name: "Radar", kind: "direction", settings: shipDirections },
  { name: "Fan", kind: "switch", settings: power },
  { name: "Beacon", kind: "color", settings: shipColors },
  {
    name: "Cargo",
    kind: "picture",
    settings: ["Apple", "Banana", "Carrot", "Fish"],
  },
  { name: "Radio", kind: "switch", settings: power },
  { name: "Gravity", kind: "number", settings: numbers },
  { name: "Dock", kind: "shape", settings: shipShapes },
  { name: "Window", kind: "switch", settings: door },
  { name: "Cabin", kind: "color", settings: shipColors },
  { name: "Map", kind: "picture", settings: ["Sun", "Moon", "Star", "Earth"] },
  { name: "Airlock", kind: "switch", settings: door },
  { name: "Fuel", kind: "number", settings: numbers },
  { name: "Antenna", kind: "direction", settings: shipDirections },
  { name: "Pump", kind: "switch", settings: power },
  { name: "Robot", kind: "color", settings: shipColors },
  { name: "Badge", kind: "shape", settings: shipShapes },
  { name: "Magnet", kind: "switch", settings: power },
  { name: "Speed", kind: "number", settings: numbers },
  {
    name: "Pet Screen",
    kind: "picture",
    settings: ["Cat", "Dog", "Fish", "Bird"],
  },
  { name: "Alarm", kind: "switch", settings: power },
];
export const validShipSetting = (control: number, value: number) =>
  Number.isInteger(control) &&
  Number.isInteger(value) &&
  control >= 0 &&
  control < shipPanels.length &&
  value >= 0 &&
  value < shipPanels[control].settings.length;
