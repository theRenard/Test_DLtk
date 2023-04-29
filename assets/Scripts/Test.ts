import { Graphics, assetManager, asse } from "cc";
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

export interface Data {
  identifier: string;
  uniqueIdentifer: string;
  x: number;
  y: number;
  width: number;
  height: number;
  bgColor: string;
  neighbourLevels: any[];
  customFields: CustomFields;
  layers: string[];
  entities: CustomFields;
}

export interface CustomFields {}

@ccclass("Test")
@executeInEditMode(true)
export class Test extends Component {
  @property
  private _jsonFile: null | JsonAsset = null;

  @property
  _debug: boolean = false;

  @property
  _tileSize: number = 32;

  @property({ type: JsonAsset, displayName: "LDtk data" })
  get jsonFile() {
    return this._jsonFile;
  }

  set jsonFile(value) {
    this._jsonFile = value;
    this.initComponent();
  }

  @property
  get tileSize() {
    return this._tileSize;
  }

  set tileSize(value) {
    this._tileSize = value;
    this.initComponent();
  }

  @property
  private get debug() {
    return this._debug;
  }

  private set debug(value) {
    this._debug = value;
    this.initComponent();
  }

  start() {
    this.initComponent();
  }

  private get json() {
    return this.jsonFile.json as Data;
  }

  private setNodeSize(json: Data, node: Node) {
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

  private createLayers(json: Data) {
    const { layers } = json;
    for (const layer of layers) {
      const name = layer.replace(".png", "");
      const subNode = this.createSubNode(name, this.node);
      this.addSpriteFrameToSubNode(subNode);

      if (this.debug) {
        const debugSubNode = this.createSubNode(`${name} debug`, this.node);
        this.addDebugToSubNode(debugSubNode);
      }

      console.log("load", );
      assetManager.loadAny({ path: '/assets', ext: '.JPG'}, {priority: 2, maxRetryCount: 1, maxConcurrency: 10}, (err, assets) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log("asset", assets);
        // console.log("loaded", asset);
      });
    }
  }

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

  private addSpriteFrameToSubNode(node: Node) {
    const sprite = node.addComponent(Sprite);
    // get sprite from asset folder
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

    this.reset();

    if (!this.jsonFile) {
      throw new Error("JSON data file is missing");
    }

    this.setNodeSize(this.json, this.node);
    this.createLayers(this.json);
  }
}
