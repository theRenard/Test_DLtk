import { Graphics, assetManager } from "cc";
import { Color } from "cc";
import { math } from "cc";
import { Sprite } from "cc";
import {
  _decorator,
  Component,
  JsonAsset,
  Node,
  UITransform,
  TextAsset,
  SpriteFrame,
} from "cc";
const { ccclass, property, executeInEditMode } = _decorator;
import { Convert, LDtk as LDtkModel } from "./Convert";
import { LDtkLayer } from "./LDtk_Layer";

export interface CustomFields {}

@ccclass("LDtk")
@executeInEditMode(true)
export class LDtk extends Component {
  @property
  private _jsonFile: null | JsonAsset = null;

  @property
  _tileSize: number = 32;

  @property({ type: JsonAsset, displayName: "LDtk data" })
  get jsonFile() {
    return this._jsonFile;
  }

  set jsonFile(value) {
    this._jsonFile = value;
    this.reset();
    this.initComponent();
  }

  @property
  get tileSize() {
    return this._tileSize;
  }

  set tileSize(value) {
    this._tileSize = value;
    this.reset();
    this.initComponent();
  }

  start() {
    this.initComponent();
  }

  private get json() {
    return Convert.toLDtk(JSON.stringify(this.jsonFile.json));
  }

  private setNodeSize(json: LDtkModel, node: Node) {
    node.getComponent(UITransform).setContentSize(json.width, json.height);
  }

  private resetNodeSize() {
    this.node.getComponent(UITransform).setContentSize(0, 0);
  }

  private removeSubNodes() {
    this.node.removeAllChildren();
  }

  private reset() {
    this.resetNodeSize();
    this.removeSubNodes();
  }

  private removeDebugNodes() {
    const children = this.node.children;
    for (const child of children) {
      if (child.name.includes("debug")) {
        child.destroy();
      }
    }
  }

  private createLayers() {
    const { layers } = this.json;
    for (const layer of layers) {
      const name = layer.replace(".png", "");
      const hasSubNode = this.node.getChildByName(name);
      if (!hasSubNode) {
        const subNode = this.createSubNode(name, this.node);
        this.addLDtkLayerToSubNode(subNode);
      }
    }
  }

  private addLDtkLayerToSubNode(subNode: Node) {
    const ldtkLayer = subNode.addComponent(LDtkLayer);
  }

//   private createDebugLayers() {
//     const { layers } = this.json;
//     for (const layer of layers) {
//       const name = layer.replace(".png", "");
//       const hasSubNode = this.node.getChildByName(`${name} debug`);
//       if (!hasSubNode) {
//       const subNode = this.createSubNode(`${name} debug`, this.node);
//       this.addDebugToSubNode(subNode);
//       }
//     }
//   }

  private createSubNode(name: string, parent: Node) {
    const node = new Node(name);
    node.addComponent(UITransform);
    this.setNodeSize(this.json, node);
    node.setParent(parent);
    return node;
  }

  private createSquareGeometry(x: number, y: number) {
    const rectangle = math.rect(0, 0, this.tileSize, this.tileSize);
    rectangle.x = x;
    rectangle.y = y;
    return rectangle;
  }

  private addDebugToSubNode(node: Node) {
    const graphics = node.addComponent(Graphics);
    graphics.lineWidth = 2;
    graphics.strokeColor = new Color(255, 0, 0);
    graphics.fillColor = new Color(255, 0, 0);
    // this.polygons.forEach(polygon => {
    //     const rect = this.createSquareGeometry(polygon.x * this.tileSize, polygon.y * this.tileSize);
    //     graphics.rect(rect.x, rect.y, rect.width, rect.height);
    //     graphics.stroke();
    //     graphics.fill();
    // });
  }

  private createMatrixFromCSV(csv: string) {
    const lines = csv.trim().split("\n"); // Split the string into lines
    return (
      lines
        // remove the last element of the array if is a comma
        .map((line) =>
          line
            .split(",")
            .filter((n) => n !== "")
            .map((t) => parseInt(t))
        )
        .reverse()
    );
  }

  private initComponent() {
    console.log("initComponent", this._jsonFile);

    if (!this.jsonFile) {
      throw new Error("JSON data file is missing");
    }


    this.setNodeSize(this.json, this.node);
    this.createLayers();

    // this.createDebugLayers();
  }
}
