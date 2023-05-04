import {
  _decorator,
  Color,
  Component,
  Graphics,
  math,
  Node,
  PolygonCollider2D,
  TiledLayer,
  UITransform,
  Vec2,
  log,
} from "cc";
import { EDITOR } from "cc/env";
const { ccclass, property, executeInEditMode } = _decorator;

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


@ccclass("Colliders")
@executeInEditMode(true)
export class Colliders extends Component {
  @property
  private _debug: boolean = true;
  @property
  private _mergeRects: boolean = true;
  @property
  private _ignoredTiles: string = "0";
  @property
  private _tiledLayer: TiledLayer | null = null;
  private _matrix: number[][] = [];
  private _mapTileSize: { height: number; width: number } | null = null;
  private _visited: number[][] = [];
  private _debugNode: Node | null = null;
  private _debugGraphics: Graphics | null = null;
  private _tiles: number[] = [];
  private _tileCoordinateGroups = new Map<string, Vec2[][]>(); // key: tileName, value: polygon
  private _tileRectGroups = new Map<string, [Vec2, Vec2, Vec2, Vec2][]>();

  @property({ readonly: true })
  tiles = "";

  @property
  private get debug() {
    return this._debug;
  }

  private set debug(value) {
    this._debug = value;
    this.initComponent();
  }

  @property
  private get mergeRects() {
    return this._mergeRects;
  }

  private set mergeRects(value) {
    this._mergeRects = value;
    this.initComponent();
  }

  @property
  get ignoredTiles() {
    return this._ignoredTiles;
  }

  set ignoredTiles(value) {
    this._ignoredTiles = value;
    this.initComponent();
  }

  start() {
    this.initComponent();
  }

  /**
   * @description: Create a matrix like
   *  [
   *  [0,0,0,0,0]
   *  [0,0,0,0,0]
   *  [0,0,1,0,0]
   *  [0,0,0,0,0]
   *  [0,0,0,0,0]
   *  ]
   *  from the tiles in the TiledLayer using layersize { width: 5, height: 5 }
   *
   */
  private createMatrixFromTiles() {
    const layerSize = this._tiledLayer?.getLayerSize();
    const layerTiles = this._tiledLayer?.tiles;
    const layerTilesCount = layerTiles?.length;
    const matrix: number[][] = [];

    if (layerSize && layerTiles && layerTilesCount) {
      for (let i = 0; i < layerSize.height; i++) {
        const row: number[] = [];
        for (let j = 0; j < layerSize.width; j++) {
          const tile = layerTiles[i * layerSize.width + j];
          if (tile) {
            row.push(tile);
            this.addTileNumberToTiles(tile);
          } else {
            row.push(0);
          }
        }
        matrix.push(row);
      }
    }

    this.transformTilesToString();
    return matrix.reverse();
  }

  /**
   * @description Create an array of all the tiles types (as numbers)
   * in the TiledLayer
   * @param tileName
   * @returns void
   *
   */
  private addTileNumberToTiles(tileName: number) {
    if (!this._tiles.includes(tileName)) {
      this._tiles.push(tileName);
    }
  }

  /**
   * @description: gives a list of all the tiles numbers in the TiledLayer
   *
   */
  private transformTilesToString() {
    this.tiles = this._tiles.join(", ");
  }

  /**
   * @description: Reset everything and create a new matrix
   */
  private reset() {
    this._matrix = [];
    this._visited = [];
    this._mapTileSize = null;
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
    const parentNode = this.node.parent;
    parentNode.children.forEach((child) => {
      if (child.name.includes(this.node.name + "_debug")) {
        child.destroy();
      }
    });
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

  private createRectGroups() {
    const { leftDownToCenterX, leftDownToCenterY } = this._tiledLayer;
    this._tileCoordinateGroups.forEach((tileCoordinateGroup, groupName) => {
      this._tileRectGroups.set(groupName, []);

      tileCoordinateGroup.forEach((point) => {
        const rect = this.createRectGeometry(
          point[0].x * this._mapTileSize?.width - leftDownToCenterX,
          point[0].y * this._mapTileSize?.height - leftDownToCenterY
        );

        const rectCoordinates = this.createRectCoordinates(rect);

        this._tileRectGroups.get(groupName)?.push(rectCoordinates);
      });
    });
  }

  /**
   * @description: Create a debug node with a square at the given position
   */
  private createDebugNode() {
    const nodeName = this.node.name + "_debug";
    this._debugNode = new Node(nodeName);
    this._debugNode.parent = this.node.parent;
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
   * @description: Create a rectangle geometry
   * @param x
   * @param y
   * @returns Rect
   */
  private createRectGeometry(x: number, y: number) {
    const rect = math.rect(
      0,
      0,
      this._mapTileSize.width,
      this._mapTileSize.height
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
        if (this.debug) {
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
          if (this.debug) {
            this.drawDebugNode(points);
          }
        });
      }
    });
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

  /**
   * @description: Initialize the component
   */
  private initComponent() {
    this._tiledLayer = this.getComponent(TiledLayer);
    this.reset();

    if (!this._tiledLayer) {
      throw new Error("Not a TiledLayer");
    }

    this._mapTileSize = this._tiledLayer.getMapTileSize();
    this._matrix = this.createMatrixFromTiles();
    this._visited = this._matrix.map(() => []);
    if (this.debug) this.createDebugNode();
    this.createTileGroups();
    this.createRectGroups();
    this.createPolygonColliders();
  }
}
