// To parse this data:
//
//   import { Convert, LDtk } from "./file";
//
//   const lDtk = Convert.toLDtk(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface LDtk {
  identifier:      string;
  uniqueIdentifer: string;
  x:               number;
  y:               number;
  width:           number;
  height:          number;
  bgColor:         string;
  neighbourLevels: NeighbourLevel[];
  customFields:    LDtkCustomFields;
  layers:          string[];
  entities:        Entities;
}

export interface LDtkCustomFields {
}

export interface Entities {
  Player: Player[];
  Chest:  Chest[];
  Mob:    Mob[];
  Door:   Door[];
}

export interface Chest {
  id:           string;
  iid:          string;
  layer:        string;
  x:            number;
  y:            number;
  width:        number;
  height:       number;
  color:        number;
  customFields: ChestCustomFields;
}

export interface ChestCustomFields {
  content: string[];
}

export interface Door {
  id:           string;
  iid:          string;
  layer:        string;
  x:            number;
  y:            number;
  width:        number;
  height:       number;
  color:        number;
  customFields: DoorCustomFields;
}

export interface DoorCustomFields {
  locked: boolean;
}

export interface Mob {
  id:           string;
  iid:          string;
  layer:        string;
  x:            number;
  y:            number;
  width:        number;
  height:       number;
  color:        number;
  customFields: MobCustomFields;
}

export interface MobCustomFields {
  patrol: Patrol[];
  loot:   string[];
}

export interface Patrol {
  cx: number;
  cy: number;
}

export interface Player {
  id:           string;
  iid:          string;
  layer:        string;
  x:            number;
  y:            number;
  width:        number;
  height:       number;
  color:        number;
  customFields: PlayerCustomFields;
}

export interface PlayerCustomFields {
  items: string[];
}

export interface NeighbourLevel {
  levelIid: string;
  dir:      string;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
  public static toLDtk(json: string): LDtk {
      return cast(JSON.parse(json), r("LDtk"));
  }

  public static lDtkToJson(value: LDtk): string {
      return JSON.stringify(uncast(value, r("LDtk")), null, 2);
  }
}

function invalidValue(typ: any, val: any, key: any, parent: any = ''): never {
  const prettyTyp = prettyTypeName(typ);
  const parentText = parent ? ` on ${parent}` : '';
  const keyText = key ? ` for key "${key}"` : '';
  throw Error(`Invalid value${keyText}${parentText}. Expected ${prettyTyp} but got ${JSON.stringify(val)}`);
}

function prettyTypeName(typ: any): string {
  if (Array.isArray(typ)) {
      if (typ.length === 2 && typ[0] === undefined) {
          return `an optional ${prettyTypeName(typ[1])}`;
      } else {
          return `one of [${typ.map(a => { return prettyTypeName(a); }).join(", ")}]`;
      }
  } else if (typeof typ === "object" && typ.literal !== undefined) {
      return typ.literal;
  } else {
      return typeof typ;
  }
}

function jsonToJSProps(typ: any): any {
  if (typ.jsonToJS === undefined) {
      const map: any = {};
      typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
      typ.jsonToJS = map;
  }
  return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
  if (typ.jsToJSON === undefined) {
      const map: any = {};
      typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
      typ.jsToJSON = map;
  }
  return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = '', parent: any = ''): any {
  function transformPrimitive(typ: string, val: any): any {
      if (typeof typ === typeof val) return val;
      return invalidValue(typ, val, key, parent);
  }

  function transformUnion(typs: any[], val: any): any {
      // val must validate against one typ in typs
      const l = typs.length;
      for (let i = 0; i < l; i++) {
          const typ = typs[i];
          try {
              return transform(val, typ, getProps);
          } catch (_) {}
      }
      return invalidValue(typs, val, key, parent);
  }

  function transformEnum(cases: string[], val: any): any {
      if (cases.indexOf(val) !== -1) return val;
      return invalidValue(cases.map(a => { return l(a); }), val, key, parent);
  }

  function transformArray(typ: any, val: any): any {
      // val must be an array with no invalid elements
      if (!Array.isArray(val)) return invalidValue(l("array"), val, key, parent);
      return val.map(el => transform(el, typ, getProps));
  }

  function transformDate(val: any): any {
      if (val === null) {
          return null;
      }
      const d = new Date(val);
      if (isNaN(d.valueOf())) {
          return invalidValue(l("Date"), val, key, parent);
      }
      return d;
  }

  function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
      if (val === null || typeof val !== "object" || Array.isArray(val)) {
          return invalidValue(l(ref || "object"), val, key, parent);
      }
      const result: any = {};
      Object.getOwnPropertyNames(props).forEach(key => {
          const prop = props[key];
          const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
          result[prop.key] = transform(v, prop.typ, getProps, key, ref);
      });
      Object.getOwnPropertyNames(val).forEach(key => {
          if (!Object.prototype.hasOwnProperty.call(props, key)) {
              result[key] = transform(val[key], additional, getProps, key, ref);
          }
      });
      return result;
  }

  if (typ === "any") return val;
  if (typ === null) {
      if (val === null) return val;
      return invalidValue(typ, val, key, parent);
  }
  if (typ === false) return invalidValue(typ, val, key, parent);
  let ref: any = undefined;
  while (typeof typ === "object" && typ.ref !== undefined) {
      ref = typ.ref;
      typ = typeMap[typ.ref];
  }
  if (Array.isArray(typ)) return transformEnum(typ, val);
  if (typeof typ === "object") {
      return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
          : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
          : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
          : invalidValue(typ, val, key, parent);
  }
  // Numbers can be parsed by Date but shouldn't be.
  if (typ === Date && typeof val !== "number") return transformDate(val);
  return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
  return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
  return transform(val, typ, jsToJSONProps);
}

function l(typ: any) {
  return { literal: typ };
}

function a(typ: any) {
  return { arrayItems: typ };
}

function u(...typs: any[]) {
  return { unionMembers: typs };
}

function o(props: any[], additional: any) {
  return { props, additional };
}

function m(additional: any) {
  return { props: [], additional };
}

function r(name: string) {
  return { ref: name };
}

const typeMap: any = {
  "LDtk": o([
      { json: "identifier", js: "identifier", typ: "" },
      { json: "uniqueIdentifer", js: "uniqueIdentifer", typ: "" },
      { json: "x", js: "x", typ: 0 },
      { json: "y", js: "y", typ: 0 },
      { json: "width", js: "width", typ: 0 },
      { json: "height", js: "height", typ: 0 },
      { json: "bgColor", js: "bgColor", typ: "" },
      { json: "neighbourLevels", js: "neighbourLevels", typ: a(r("NeighbourLevel")) },
      { json: "customFields", js: "customFields", typ: r("LDtkCustomFields") },
      { json: "layers", js: "layers", typ: a("") },
      { json: "entities", js: "entities", typ: r("Entities") },
  ], false),
  "LDtkCustomFields": o([
  ], false),
  "Entities": o([
      { json: "Player", js: "Player", typ: a(r("Player")) },
      { json: "Chest", js: "Chest", typ: a(r("Chest")) },
      { json: "Mob", js: "Mob", typ: a(r("Mob")) },
      { json: "Door", js: "Door", typ: a(r("Door")) },
  ], false),
  "Chest": o([
      { json: "id", js: "id", typ: "" },
      { json: "iid", js: "iid", typ: "" },
      { json: "layer", js: "layer", typ: "" },
      { json: "x", js: "x", typ: 0 },
      { json: "y", js: "y", typ: 0 },
      { json: "width", js: "width", typ: 0 },
      { json: "height", js: "height", typ: 0 },
      { json: "color", js: "color", typ: 0 },
      { json: "customFields", js: "customFields", typ: r("ChestCustomFields") },
  ], false),
  "ChestCustomFields": o([
      { json: "content", js: "content", typ: a("") },
  ], false),
  "Door": o([
      { json: "id", js: "id", typ: "" },
      { json: "iid", js: "iid", typ: "" },
      { json: "layer", js: "layer", typ: "" },
      { json: "x", js: "x", typ: 0 },
      { json: "y", js: "y", typ: 0 },
      { json: "width", js: "width", typ: 0 },
      { json: "height", js: "height", typ: 0 },
      { json: "color", js: "color", typ: 0 },
      { json: "customFields", js: "customFields", typ: r("DoorCustomFields") },
  ], false),
  "DoorCustomFields": o([
      { json: "locked", js: "locked", typ: true },
  ], false),
  "Mob": o([
      { json: "id", js: "id", typ: "" },
      { json: "iid", js: "iid", typ: "" },
      { json: "layer", js: "layer", typ: "" },
      { json: "x", js: "x", typ: 0 },
      { json: "y", js: "y", typ: 0 },
      { json: "width", js: "width", typ: 0 },
      { json: "height", js: "height", typ: 0 },
      { json: "color", js: "color", typ: 0 },
      { json: "customFields", js: "customFields", typ: r("MobCustomFields") },
  ], false),
  "MobCustomFields": o([
      { json: "patrol", js: "patrol", typ: a(r("Patrol")) },
      { json: "loot", js: "loot", typ: a("") },
  ], false),
  "Patrol": o([
      { json: "cx", js: "cx", typ: 0 },
      { json: "cy", js: "cy", typ: 0 },
  ], false),
  "Player": o([
      { json: "id", js: "id", typ: "" },
      { json: "iid", js: "iid", typ: "" },
      { json: "layer", js: "layer", typ: "" },
      { json: "x", js: "x", typ: 0 },
      { json: "y", js: "y", typ: 0 },
      { json: "width", js: "width", typ: 0 },
      { json: "height", js: "height", typ: 0 },
      { json: "color", js: "color", typ: 0 },
      { json: "customFields", js: "customFields", typ: r("PlayerCustomFields") },
  ], false),
  "PlayerCustomFields": o([
      { json: "items", js: "items", typ: a("") },
  ], false),
  "NeighbourLevel": o([
      { json: "levelIid", js: "levelIid", typ: "" },
      { json: "dir", js: "dir", typ: "" },
  ], false),
};
