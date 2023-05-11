import {
  _decorator,
  Component,
  JsonAsset,
  Node,
  UITransform,
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

  @property({ type: JsonAsset, displayName: "LDtk data" })
  get jsonFile() {
    return this._jsonFile;
  }

  set jsonFile(value) {
    this._jsonFile = value;
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
    subNode.addComponent(LDtkLayer);
  }

  private createSubNode(name: string, parent: Node) {
    const node = new Node(name);
    node.addComponent(UITransform);
    this.setNodeSize(this.json, node);
    node.setParent(parent);
    return node;
  }

  private initComponent() {
    console.log("initComponent", this._jsonFile);

    if (!this.jsonFile) {
      throw new Error("JSON data file is missing");
    }

    this.setNodeSize(this.json, this.node);
    this.createLayers();
  }
}
