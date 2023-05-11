import {
  _decorator,
  Component,
  Node,
  RigidBody2D,
  input,
  Input,
  KeyCode,
  Collider2D,
  Contact2DType,
  CircleCollider2D,
  PolygonCollider2D,
  Vec2,
} from "cc";
const { ccclass, property } = _decorator;

@ccclass("Player")
export class Player extends Component {
  @property
  torqueAmmount: number = 10;
  rigidBody: RigidBody2D;
  start() {
    this.rigidBody = this.getComponent(RigidBody2D);

    let collider = this.getComponent(PolygonCollider2D);
    if (collider) {
      console.log("Collider found");
      collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
    }

    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
  }

  onBeginContact(contact: any, selfCollider: any, otherCollider: any) {
    console.log("Collision detected");
  }

  onKeyDown(event: any) {
    switch (event.keyCode) {
      case KeyCode.ARROW_UP:
        // jump
        this.rigidBody.applyLinearImpulseToCenter(new Vec2(0, 2), true);

        break;
      case KeyCode.ARROW_LEFT:
        // move left
        this.rigidBody.applyLinearImpulseToCenter(new Vec2(-1, 0), true);
        break;
      case KeyCode.ARROW_RIGHT:
        // move right
        this.rigidBody.applyLinearImpulseToCenter(new Vec2(1, 0), true);
        break;
    }
  }
}
