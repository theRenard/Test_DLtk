import { _decorator, CCInteger, Component, Node, JsonAsset, TextAsset, Sprite, SpriteFrame, Graphics, Vec3, CCString } from 'cc';
const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('LDtk')
@executeInEditMode(true)
export class LDtk extends Component {

    @property({ type: TextAsset, displayName: 'Layer CSV' })
    csvFile: TextAsset = null;

    @property({ type: SpriteFrame, displayName: 'Layer Image' })
    layerImage: SpriteFrame = null;

    @property tileSize: number = 32;

    @property ignoredTileNumbers: string = '0';

    @property tileNumbers: string = '1';

    private matrix: number[][] = [];

    private visited: number[][] = [];

    public polygons: Vec3[] = [];

    onLoad() {
        this.createMatrixFromCSV(this.csvFile.text);
        this.visited = this.matrix.map(() => []);
        this.startCreatePolygons();
        console.log(this.polygons);

    }


    private createMatrixFromCSV(csv: string) {
        const lines = csv.trim().split("\n"); // Split the string into lines
        this.matrix = lines
            // remove the last element of the array if is a comma
            .map((line) => line.split(",").filter(n => n !== '').map((t) => parseInt(t)));
    }

    private startCreatePolygons() {
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
        this.polygons.push(new Vec3(col * this.tileSize, row * this.tileSize, 0));



    }

}

