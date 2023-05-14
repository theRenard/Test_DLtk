import { _decorator, Color, Component, Graphics, Rect, Size, Sprite, SpriteFrame, TextAsset, UITransform } from "cc";
const { ccclass, property, executeInEditMode } = _decorator;
import { EDITOR } from "cc/env";
import { Entity } from "./LDtk";
import { flipYPosition, transformEntityPositionToCocosPosition, transformToCenter } from "./LDtk_Utilities";


@ccclass("LDtkEntities")
@executeInEditMode(true)
export class LDtkEntities extends Component {
  public entities: { [key: string]: Entity } = {};
  private _xOffset: number = 0;
  private _yOffset: number = 0;

  private setOffset() {
    const { contentSize } = this.node.getComponent(UITransform);
    this._xOffset = contentSize.width / 2;
    this._yOffset = contentSize.height / 2;
  }

	private drawEntities() {
		const graphics = this.node.getComponent(Graphics) || this.node.addComponent(Graphics);
		graphics.fillColor = Color.RED;
		console.log('entities', this.entities);
		Object.keys(this.entities).forEach((key) => {
			console.log('entity', key);
			const entity = this.entities[key];
			console.log('entity', entity);
			entity.forEach((entity) => {
				const { x, y, width, height } = entity;
				const pos = transformEntityPositionToCocosPosition({ x, y, width, height, }, { xOffset: this._xOffset, yOffset: this._yOffset, });
				graphics.rect(pos.x, pos.y, width, height);
				graphics.fill();
			});
		});
	}

	public setEntities(entities) {
		this.entities = entities;
	}

	public initComponent() {
		this.setOffset();
		if (EDITOR) {
			this.drawEntities();
		}
	}

}
