import { _decorator, CCInteger, Component, Node, JsonAsset, TextAsset, Sprite, SpriteFrame, Graphics, Vec3, CCString, Color, math } from 'cc';
const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('LDtk')
@executeInEditMode(true)
export class LDtk extends Component {

    _csvFile: null | TextAsset = null;
    _layerImage: null | SpriteFrame = null;
    _tileSize: number = 32;
    _ignoredTileNumbers: string = '0';
    _tileNumbers: string = '1';

    _debugNode: Node | null = null;
    _spriteNode: Node | null = null;
    _colliderNodes: Node[] | null = null;

    @property({ type: TextAsset, displayName: 'Layer CSV' })
    get csvFile() {
        return this._csvFile;
    }

    set csvFile(value) {
        this._csvFile = value;
        this.initComponent();
    }

    @property({ type: SpriteFrame, displayName: 'Layer Image' })
    get layerImage() {
        return this._layerImage;
    }

    set layerImage(value) {
        this._layerImage = value;
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
    get ignoredTileNumbers() {
        return this._ignoredTileNumbers;
    }

    set ignoredTileNumbers(value) {
        this._ignoredTileNumbers = value;
        this.initComponent();
    }

    @property
    get tileNumbers() {
        return this._tileNumbers;
    }

    set tileNumbers(value) {
        this._tileNumbers = value;
        this.initComponent();
    }


    private matrix: number[][] = [];

    private visited: number[][] = [];

    public polygons: Vec3[] = [];

    onLoad() {
        this.initComponent();
    }

    reset() {
        this.polygons = [];
        this.visited = [];
        this.matrix = [];
        this.node.removeAllChildren();
    }

    initComponent() {

        this.reset();

        if (!this.csvFile || !this.layerImage) {
            throw new Error('CSV file or Layer Image is missing');
        }

        this.createMatrixFromCSV(this.csvFile.text);
        this.visited = this.matrix.map(() => []);
        this.createPolygons();
        this.createSpriteNode();
        if (this.debug) {
            this.createDebugNode();
        } else {
            this.removecreateDebugNode();
        }
        console.log(this.polygons);
    }

    private createDebugNode() {
        this._debugNode = this.node.getChildByName('debug') || new Node('debug');
        this._debugNode.parent = this.node;
        this._debugNode.setPosition(0, 0, 0);
        const graphics = this._debugNode.addComponent(Graphics);
        graphics.lineWidth = 2;
        graphics.strokeColor = new Color(255, 0, 0);
        graphics.fillColor = new Color(255, 0, 0);
        this.polygons.forEach(polygon => {
            const rect = this.createSquareGeometry(polygon.x * this.tileSize, polygon.y * this.tileSize);
            graphics.rect(rect.x, rect.y, rect.width, rect.height);
            graphics.stroke();
            graphics.fill();
        });
    }

    private removecreateDebugNode() {
        const graphics = this.node.getComponent(Graphics);
        if (graphics) {
            console.log('remove debug draw');
            graphics.clear();
            graphics.destroy();
        }
    }

    private createSquareGeometry(x: number, y: number) {
        const rectangle = math.rect(0, 0, this.tileSize, this.tileSize);
        rectangle.x = x;
        rectangle.y = y;
        return rectangle;
    }

    private createSpriteNode() {
        this._spriteNode = this.node.getChildByName('sprite') || new Node('sprite');
        this._spriteNode.parent = this.node;
        this._spriteNode.setPosition(0, 0, 0);
        const sprite = this._spriteNode.addComponent(Sprite);
        sprite.spriteFrame = this.layerImage;
        sprite.sizeMode = Sprite.SizeMode.RAW;
        sprite.trim = false;
    }



    private createPolygons() {
        this.checkMatrixAtPosition(0, 0);
    }

    private checkMatrixAtPosition(row: number, col: number) {

        // if row or col is out of bounds, return
        if (row < 0 || col < 0 || row >= this.matrix.length || col >= this.matrix[0].length) {
            console.log('out of bounds');
            return;
        }

        // if tile is already visited, return
        if (this.visited[row][col] === 1) {
            console.log('already visited');
            return;
        }

        // if tile is not visited, set it to visited
        this.visited[row][col] = 1;

        // if tile is in tileNumbers, check the surrounding tiles
        this.checkMatrixAtPosition(row - 1, col);
        this.checkMatrixAtPosition(row + 1, col);
        this.checkMatrixAtPosition(row, col - 1);
        this.checkMatrixAtPosition(row, col + 1);

        // if tile is not in tileNumbers, return
        if (!this.tileNumbers.split('').includes(this.matrix[row][col].toString())) {
            console.log('not in tileNumbers', this.matrix[row][col]);
            return;
        }

        // if tile is in ignoredTileNumbers, return
        if (this.ignoredTileNumbers.split('').includes(this.matrix[row][col].toString())) {
            console.log('in ignoredTileNumbers');
            return;
        }

        // if tile is in tileNumbers, add it to the polygon
        this.polygons.push(new Vec3(col, row, 0));



    }

}

