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
import { LDtkEntities } from "./LDtk_Entities";
import { transformToCenter, flipYPosition, transformEntityPositionToCocosPosition } from "./LDtk_Utilities";

export type Entity = {
	id?:           string;
	iid?:          string;
	layer?:        string;
	x?:            number;
	y?:            number;
	width?:        number;
	height?:       number;
	color?:        number;
	customFields?: {
    [key: string]: any;
  };
}[];

export type LDtkModelExtended = LDtkModel & {
  entities: {
    [key: string]: Entity;
  };
};

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

  private setNodeSizeAndPosition() {
    const { x, y, width, height } = this.json;
    const uiTransform = this.node.getComponent(UITransform)
    uiTransform.setContentSize(width, height);
    uiTransform.setAnchorPoint(0.5, 0.5);

    const yCocos = flipYPosition(y, height);
    const pos = transformToCenter({ x, y: yCocos, width, height });
    this.node.setPosition(pos.x, pos.y);
  }

  private setNodeName() {
    this.node.name = this.json.identifier;
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

  private createTextureAndCollisionsLayers() {
    const { layers } = this.json;
    for (const layer of layers) {
      const name = layer.replace(".png", "");
      const hasSubNode = this.node.getChildByName(name);
      if (!hasSubNode) {
        const subNode = this.createSubNode(name, this.node);
        subNode.addComponent(LDtkLayer);
      }
    }
  }

  private createEntitiesLayer() {
    const entitiesNode = this.node.getChildByName("Entities") || this.createSubNode("Entities", this.node);
    const entitiesComp = entitiesNode.getComponent(LDtkEntities) || entitiesNode.addComponent(LDtkEntities);
    entitiesComp.setEntities(this.json.entities);
    console.log('here', this.json.entities);
  }

  private createSubNode(name: string, parent: Node) {
    const node = new Node(name);
    node.addComponent(UITransform).setContentSize(this.json.width, this.json.height);
    node.setParent(parent);
    node.setPosition(0, 0);
    return node;
  }

  private initComponent() {
    if (!this.jsonFile) {
      throw new Error("JSON data file is missing");
    }
    this.setNodeSizeAndPosition();
    this.setNodeName();
    this.createTextureAndCollisionsLayers();
    this.createEntitiesLayer();
  }
}
