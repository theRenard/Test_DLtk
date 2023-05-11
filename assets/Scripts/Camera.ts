import {
  _decorator,
  Component,
  PhysicsSystem2D,
  EPhysics2DDrawFlags,
  find,
  Node,
} from "cc";
const { ccclass, property, executeInEditMode } = _decorator;

@ccclass("Camera")
export class Camera extends Component {
  @property
  debugDraw: boolean = false;

  @property({ type: Node })
  player: Node;

  cameraSpeed = 5; // adjust this to control the camera's speed

  onLoad() {
    if (this.debugDraw) {
      PhysicsSystem2D.instance.debugDrawFlags =
        EPhysics2DDrawFlags.Aabb |
        EPhysics2DDrawFlags.Pair |
        EPhysics2DDrawFlags.CenterOfMass |
        EPhysics2DDrawFlags.Joint |
        EPhysics2DDrawFlags.Shape;
    }
  }

  update(dt) {
    var playerPos = this.player.getPosition();
    var cameraPos = this.node.getPosition();
    var newPosition = cameraPos.lerp(playerPos, this.cameraSpeed * dt);
    this.node.setPosition(newPosition);
}
}
