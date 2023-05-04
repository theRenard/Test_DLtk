import { Graphics, PolygonCollider2D, UITransform, log, math, Node, Color } from "cc";
import { Vec2 } from "cc";
import {
  _decorator,
  Component,
  Sprite,
  SpriteFrame,
  TextAsset,
} from "cc";
const { ccclass, property, executeInEditMode } = _decorator;
import { EDITOR } from "cc/env";

// extend window type with a new property
declare global {
  interface Window {
    PolyBool: {
      union(poly1: Polygon, poly2: Polygon): Polygon;
    };
  }
}

type Polygon = {
  regions: number[][][];
  inverted: boolean;
}


@ccclass("LDtkLayer")
@executeInEditMode(true)
export class LDtkLayer extends Component {
  private _matrix: number[][] = [];
  private _tileWidth: number = 16;
  private _tileHeight: number = 16;
  private _visited: number[][] = [];
  private _debugNode: Node | null = null;
  private _debugGraphics: Graphics | null = null;
  private _tileCoordinateGroups = new Map<string, Vec2[][]>(); // key: tileName, value: polygon
  private _tileRectGroups = new Map<string, [Vec2, Vec2, Vec2, Vec2][]>();

  @property(SpriteFrame)
  _layerTexture: SpriteFrame | null = null;

  @property({ group: { name: 'Texture' }, type: SpriteFrame })
  private get LayerTexture() {
    return this._layerTexture;
  }

  private set LayerTexture(value) {
    this._layerTexture = value;
    this.initComponent();
  }

  @property({ type: TextAsset })
  _textAsset: TextAsset | null = null;

  @property({ group: { name: 'Collisions' }, type: TextAsset })
  private get Collisions() {
    return this._textAsset;
  }

  private set Collisions(value) {
    this._textAsset = value;
    this.initComponent();
  }

  @property
  private _ignoredTiles: string = "0";

  @property({ group: { name: 'Collisions' }})
  get ignoredTiles() {
    return this._ignoredTiles;
  }

  set ignoredTiles(value) {
    this._ignoredTiles = value;
    this.initComponent();
  }

  @property
  private _mergeRects: boolean = true;

  @property({ group: { name: 'Collisions' }})
  private get mergeRects() {
    return this._mergeRects;
  }

  private set mergeRects(value) {
    this._mergeRects = value;
    this.initComponent();
  }
  @property
  _debug: boolean = false;

  @property({  group: { name: 'Collisions' }})
  private get debug() {
    return this._debug;
  }

  private set debug(value) {
    this._debug = value;
    this.initComponent();
  }

  @property({ group: { name: 'Collisions' }})
  private get tileWidth() {
    return this._tileWidth;
  }

  private set tileWidth(value) {
    this._tileWidth = value;
    this.initComponent();
  }

  @property({ group: { name: 'Collisions' }})
  private get tileHeight() {
    return this._tileHeight;
  }

  private set tileHeight(value) {
    this._tileHeight = value;
    this.initComponent();
  }

  start() {
    this.initComponent();
  }

  /**
   * @description: Reset everything and create a new matrix
   */
  private reset() {
    this._matrix = [];
    this._visited = [];
    this._tileCoordinateGroups = new Map();
    this.destroyAllChildrenDebugNodes();
    this._debugNode = null;
    // remove all existing PolygonCollider2D components
    this.node.getComponents(PolygonCollider2D).forEach((collider) => {
      collider.destroy();
    });
  }

  /**
   * @description: Destroy all the debug nodes in the parent node
   */
  private destroyAllChildrenDebugNodes() {
    this.node.children.forEach((child) => {
      if (child.name.includes(this.node.name + "_debug")) {
        child.destroy();
      }
    });
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

  /**
   * @description: Iterate through the matrix and create polygons
   */
  private createTileGroups() {
    this._matrix.forEach((row, rowIndex) => {
      row.forEach((col, colIndex) => {
        if (this._visited[rowIndex][colIndex] !== 1) {
          this.checkMatrixAtPosition(
            rowIndex,
            colIndex,
            `${rowIndex}_${colIndex}`
          );
        }
      });
    });
  }


  /**
   * @description: Check the surrounding tiles of the current tile
   * @param row
   * @param col
   * @param groupRef
   * @returns void
   */
  private checkMatrixAtPosition(row: number, col: number, groupRef) {
    // if row or col is out of bounds, return
    if (
      row < 0 ||
      col < 0 ||
      row >= this._matrix.length ||
      col >= this._matrix[0].length
    ) {
      // console.log("out of bounds");
      return;
    }

    // if tile is already visited, return
    if (this._visited[row][col] === 1) {
      // console.log("already visited");
      return;
    }

    // if tile is not visited, set it to visited
    this._visited[row][col] = 1;

    // if tile is in ignoredTiles, return
    if (
      this.ignoredTiles
        .split(",")
        // remove spaces
        .map((tile) => tile.trim())
        .includes(this._matrix[row][col].toString())
    ) {
      // console.log("in ignoredTiles");
      return;
    }

    // if tile is in tiles, check the surrounding tiles
    this.checkMatrixAtPosition(row - 1, col, groupRef);
    this.checkMatrixAtPosition(row + 1, col, groupRef);
    this.checkMatrixAtPosition(row, col - 1, groupRef);
    this.checkMatrixAtPosition(row, col + 1, groupRef);

    // if tile is in tiles, add it to the polygon
    const vec = new Vec2(col, row);

    if (this._tileCoordinateGroups.has(groupRef)) {
      this._tileCoordinateGroups.get(groupRef)?.push([vec]);
    } else {
      this._tileCoordinateGroups.set(groupRef, [[vec]]);
    }
  }


  /**
   * @description: Create a rectangle geometry
   * @param x
   * @param y
   * @returns Rect
   */
  private createRectGeometry(x: number, y: number) {
    const rect = math.rect(
      0,
      0,
      this._tileWidth,
      this._tileHeight
    );
    rect.x = x;
    rect.y = y;
    return rect;
  }

  private createRectCoordinates(rect: math.Rect): [Vec2, Vec2, Vec2, Vec2] {
    return [
      new Vec2(rect.x, rect.y),
      new Vec2(rect.x + rect.width, rect.y),
      new Vec2(rect.x + rect.width, rect.y + rect.height),
      new Vec2(rect.x, rect.y + rect.height),
    ];
  }

  private createPolygon(polygon: number[][]): Polygon {
    return {
      regions: [polygon], // each region is a list of points
      inverted: false,
    }
  }

  // convert array of Vec2 to array of [x, y]
  private convertVec2ArrayToNumberArray(points: Vec2[]) {
    return points.map((point) => [point.x, point.y]);
  }

  // convert array of [x, y] to array of Vec2
  private convertNumberArrayToVec2Array(points: number[][]) {
    return points.map((point) => new Vec2(point[0], point[1]));
  }

  private createRectGroups() {
    const { contentSize }= this.node.getComponent(UITransform);
    const { width: leftDownToCenterX, height: leftDownToCenterY } = contentSize;
    this._tileCoordinateGroups.forEach((tileCoordinateGroup, groupName) => {
      this._tileRectGroups.set(groupName, []);

      tileCoordinateGroup.forEach((point) => {
        const rect = this.createRectGeometry(
          point[0].x * this._tileWidth - leftDownToCenterX,
          point[0].y * this._tileHeight - leftDownToCenterY
        );

        const rectCoordinates = this.createRectCoordinates(rect);

        this._tileRectGroups.get(groupName)?.push(rectCoordinates);
      });
    });
  }

  private createPolygonColliders() {
    this._tileRectGroups.forEach((tileRectGroup, groupName) => {

      if (this._mergeRects) {

        let result: Polygon = { regions: [], inverted: false };

        tileRectGroup.forEach((rectPoints) => {

          const tileRectGroupAsNumbers = this.convertVec2ArrayToNumberArray(rectPoints);
          const polygon = this.createPolygon(tileRectGroupAsNumbers);
          result = window.PolyBool.union(result, polygon);
          log("polygon", polygon);

        });

        const points = this.convertNumberArrayToVec2Array(result.regions[0]);

        if (!EDITOR) {
          const collider = this.node.addComponent(PolygonCollider2D);
          collider.editing = true;
          collider.points = points;
          collider.apply();
        }
        if (this._debug) {
          this.drawDebugNode(points);
        }

      } else {

        tileRectGroup.forEach((points) => {

          if (!EDITOR) {
            const collider = this.node.addComponent(PolygonCollider2D);
            collider.editing = true;
            collider.points = points;
            collider.apply();
          }
          if (this._debug) {
            this.drawDebugNode(points);
          }
        });
      }
    });
  }

  private drawDebugNode(points: Vec2[]) {
    this._debugGraphics?.moveTo(points[0].x, points[0].y);
    points = points.slice(1);
    points.forEach((point) => {
      this._debugGraphics?.lineTo(point.x, point.y);
    });
    // close the path
    this._debugGraphics?.close();
    this._debugGraphics?.stroke();
    this._debugGraphics?.fill();
  }

  /**
   * @description: Create a debug node with a square at the given position
   */
  private createDebugNode() {
    const nodeName = this.node.name + "_debug";
    this._debugNode = new Node(nodeName);
    this._debugNode.parent = this.node;
    this._debugNode
      .addComponent(UITransform)
      .setContentSize(this.node.getComponent(UITransform).contentSize);
    this._debugNode.setPosition(0, 0, 0);
    this._debugGraphics = this._debugNode.addComponent(Graphics);
    this._debugGraphics.lineWidth = 1;
    this._debugGraphics.strokeColor = new Color(255, 0, 0, 255);
    this._debugGraphics.fillColor = new Color(255, 0, 0, 128);
    this._debugGraphics.lineCap = Graphics.LineCap.SQUARE;
    this._debugGraphics.lineJoin = Graphics.LineJoin.MITER;

  }


  private initComponent() {
    console.log("initComponent", this._debug);

    this.reset();

    // add sprite component
    if (this._layerTexture) {
      const spriteComponent = this.getComponent(Sprite) || this.addComponent(Sprite);
      spriteComponent.spriteFrame = this._layerTexture;
    } else {
      this.getComponent(Sprite) && this.getComponent(Sprite).destroy();
    }

    // add collision component
    if (this._textAsset) {
      this._matrix = this.createMatrixFromCSV(this._textAsset.text);
      this._visited = this._matrix.map(() => []);
      if (this.debug) this.createDebugNode();
      this.createTileGroups();
      this.createRectGroups();
      this.createPolygonColliders();
      console.log("this._tileRectGroups", this._tileRectGroups);
    }


  }
}