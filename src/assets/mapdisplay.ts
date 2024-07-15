import type Tile from './tile';

class MapDisplay {
    constructor(private canvasElement: HTMLCanvasElement) {
        this.ctx = canvasElement.getContext('2d')!;
        this.ctx.canvas.width = this.ctx.canvas.clientWidth * window.devicePixelRatio;
        this.ctx.canvas.height = this.ctx.canvas.clientHeight * window.devicePixelRatio;
    }

    private ctx: CanvasRenderingContext2D;
    // Color conversions
    private colors: { [n: number]: string } = {
        // Tiles
        0: 'rgb(24,    0,  59)', // Ground
        1: 'rgb(166,  72, 233)', // Dirt
        2: 'rgb(139,  43, 199)', // Loose Rock
        3: 'rgb(108,  10, 163)', // Hard Rock
        4: 'rgb(59,    0, 108)', // Solid Rock
        6: 'rgb(6,    45, 182)', // Water
        7: 'rgb(239,  79,  16)', // Lava
        8: 'rgb( 56,  44,  73)', // Landslide rubble
        9: 'rgb(150, 150,   0)', // Slimy Slug hole
        10: 'rgb(185, 255,  25)', // Energy Crystal Seam
        11: 'rgb(146,  62,  20)', // Ore Seam
        12: 'rgb(250, 255,  14)', // Recharge Seam
        13: 'rgb(190, 190, 190)', // Building power path
        // Not tiles
        14: 'rgb(255,   0,   0)', // Monster
        15: 'rgb(255, 128,   0)', // Wire
        16: 'rgb(255, 255,   0)', // Trigger
    };

    // Display the map to the canvas
    public render(tiles: Tile[][], heightArray: number[][], viewMode: number) {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        // Create the image
        this.ctx.canvas.width = this.ctx.canvas.clientWidth * window.devicePixelRatio;
        this.ctx.canvas.height = this.ctx.canvas.clientHeight * window.devicePixelRatio;
        const scale: number = Math.floor(this.ctx.canvas.width / tiles.length);
        const offset: number = Math.floor((this.ctx.canvas.width % tiles.length) / 2);
        const separator: number = Math.max(Math.floor(scale / 16), 1);
        const diagSep = (Math.SQRT2 * separator) / 2 - 0.15;

        // Draw the background
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(
            offset,
            offset,
            this.ctx.canvas.width - offset * 2,
            this.ctx.canvas.width - offset * 2
        );

        // Draw the tiles
        if (viewMode == 1) {
            for (let i = 0; i < tiles.length; i++) {
                for (let j = 0; j < tiles[0].length; j++) {
                    // Draw the tile
                    this.ctx.fillStyle = '#ff0000'; // Debug
                    this.ctx.fillStyle = this.colors[tiles[i][j].type];
                    this.ctx.fillRect(
                        j * scale + offset + Math.floor(separator / 2),
                        i * scale + offset + Math.floor(separator / 2),
                        scale - separator,
                        scale - separator
                    );
                }
            }

            for (let i = 0; i < tiles.length; i++) {
                for (let j = 0; j < tiles[0].length; j++) {
                    // Draw the crystal indicators
                    if (tiles[i][j].crystals > 0) {
                        this.ctx.fillStyle = this.colors[10];
                        this.ctx.fillRect(
                            j * scale + offset + 1 * separator,
                            i * scale + offset + 1 * separator,
                            1 * separator,
                            1 * separator
                        );
                    }

                    // Draw the ore indicators
                    if (tiles[i][j].ore > 0) {
                        this.ctx.fillStyle = this.colors[11];
                        this.ctx.fillRect(
                            j * scale + offset + 2 * separator,
                            i * scale + offset + 1 * separator,
                            1 * separator,
                            1 * separator
                        );
                    }

                    // Draw the monster emerge indicators
                    if (tiles[i][j].monster) {
                        this.ctx.fillStyle = this.colors[14];
                        this.ctx.beginPath();
                        this.ctx.ellipse(
                            (j + 0.5) * scale + offset,
                            (i + 0.5) * scale + offset,
                            scale / 4,
                            scale / 4,
                            0,
                            0,
                            2 * Math.PI
                        );
                        this.ctx.fill();
                    }

                    // Draw the monster trigger indicators
                    const monsterTriggers = tiles[i][j].getTriggers();
                    if (monsterTriggers.length) {
                        this.ctx.strokeStyle = this.colors[16];
                        this.ctx.lineWidth = separator;
                        this.ctx.beginPath();
                        this.ctx.ellipse(
                            (j + 0.5) * scale + offset,
                            (i + 0.5) * scale + offset,
                            scale / 4,
                            scale / 4,
                            0,
                            0,
                            2 * Math.PI
                        );
                        this.ctx.stroke();
                    }

                    // Draw trigger wires
                    monsterTriggers.forEach((target) => {
                        this.ctx.strokeStyle = this.colors[15];
                        const wire: Path2D = new Path2D();
                        wire.moveTo((j + 0.5) * scale + offset, (i + 0.5) * scale + offset);
                        wire.lineTo(
                            (target.x + 0.5) * scale + offset,
                            (target.y + 0.5) * scale + offset
                        );
                        wire.closePath();
                        this.ctx.stroke(wire);
                    });
                }
            }
        } else if (viewMode == 2) {
            // Find height range
            let seaLevel: number = heightArray[0][0];
            for (let i = 0; i < heightArray.length; i++) {
                for (let j = 0; j < heightArray[0].length; j++) {
                    seaLevel = Math.min(heightArray[i][j], seaLevel);
                }
            }

            // Draw the heightmap triangles
            for (let i = 0; i < tiles.length; i++) {
                for (let j = 0; j < tiles[0].length; j++) {
                    this.ctx.fillStyle = '#ff0000'; // Debug

                    const startx = j * scale + offset + Math.floor(separator / 2);
                    const starty = i * scale + offset + Math.floor(separator / 2);
                    const endx = startx + scale - separator;
                    const endy = starty + scale - separator;

                    const triangleNW = [
                        [starty, startx, heightArray[i][j]],
                        [starty, endx - diagSep, heightArray[i][j + 1]],
                        [endy - diagSep, startx, heightArray[i + 1][j]],
                    ];
                    const triangleSE = [
                        [endy, endx, heightArray[i + 1][j + 1]],
                        [starty + diagSep, endx, heightArray[i][j + 1]],
                        [endy, startx + diagSep, heightArray[i + 1][j]],
                    ];

                    // Debug
                    // let debug: boolean = false;
                    // if (i == 3 && j == 1) {
                    //     debug = true;
                    //     this.drawTriangle(triangleNW, seaLevel, debug);
                    // }

                    this.drawTriangle(triangleNW, seaLevel);
                    this.drawTriangle(triangleSE, seaLevel);
                }
            }
        }
    }

    private createSlopeGradient(tri: number[][], min: number): CanvasGradient {
        tri.sort((a: number[], b: number[]) => a[2] - b[2]);

        // The slopeVector is the vector pointing directly down the slope of the triangle
        const slopeVector: number[] = this.downhillVector(tri[0], tri[1], tri[2]);

        // The rangeVector represents the vector from the highest elevation vertex to the
        // lowest elevation vertex within the triangle
        const rangeVector: number[] = [tri[0][0] - tri[2][0], tri[0][1] - tri[2][1], 0];

        // The gradientVector is the vector parallel to the slope direction and as long as the gradient
        const gradientVector: number[] = this.findGradientWidth(slopeVector, rangeVector);

        const elevationRange = 1000;

        // Color
        const colorStart: string = this.colorFromElevation(tri[2][2], min, elevationRange);
        const colorEnd: string = this.colorFromElevation(tri[0][2], min, elevationRange);

        // Create a new linear gradient starting from the highest vertex of the triangle and ending at
        // the point on the plane directly downhill from the highest vertex and as low as the lowest
        const gradient: CanvasGradient = this.ctx.createLinearGradient(
            tri[2][1],
            tri[2][0],
            tri[2][1] + gradientVector[1],
            tri[2][0] + gradientVector[0]
        );

        gradient.addColorStop(0, colorStart);
        gradient.addColorStop(1, colorEnd);

        // if (debug) { // Debug
        //     // Draw a black line down the middle of the gradient for debugging
        //     gradient.addColorStop(0.48, colorStart);
        //     gradient.addColorStop(0.49, '#000');
        //     gradient.addColorStop(0.51, '#000');
        //     gradient.addColorStop(0.52, colorStart);

        //     // Debug line
        //     this.ctx.strokeStyle = 'red';
        //     const debugLine: Path2D = new Path2D();
        //     debugLine.moveTo(tri[2][1], tri[2][0]);
        //     debugLine.lineTo(tri[2][1] + gradientVector[1], tri[2][0] + gradientVector[0]);
        //     debugLine.closePath();

        //     this.ctx.stroke(debugLine);
        // }

        return gradient;
    }

    private drawTriangle(tri: number[][], min: number): void {
        const gradient = this.createSlopeGradient(tri, min);

        // Create path
        const triPath: Path2D = new Path2D();
        triPath.moveTo(tri[0][1], tri[0][0]);
        triPath.lineTo(tri[1][1], tri[1][0]);
        triPath.lineTo(tri[2][1], tri[2][0]);
        triPath.closePath();

        this.ctx.fillStyle = gradient;
        this.ctx.fill(triPath);

        return;
    }

    private colorFromElevation(elevation: number, min: number, range: number): string {
        const hue = (1 - (elevation - min) / range) * 160 + 60;
        const alpha = Math.max(((elevation - min) * 2) / range, 0.1);
        return 'hsla(' + hue + ', 100%, 50%, ' + alpha + ')';
    }

    private dotProduct(v1: number[], v2: number[]) {
        return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
    }

    // Find the gradient whose direction is parallel to the gradient direction
    // and whose magnitude matches the width of the gradient
    private findGradientWidth(A: number[], B: number[]) {
        // Calculate the dot products
        const dotBA = this.dotProduct(B, A);
        const dotAA = this.dotProduct(A, A);

        // Avoid divide by zero
        if (dotBA == 0) {
            return [0, 0, 0];
        }

        // Calculate the scalar k
        const k = dotBA / dotAA;

        // Calculate vector C
        const C = [k * A[0], k * A[1], k * A[2]];

        return C;
    }

    // Find the unit vector that points directly downhill
    private downhillVector(A: number[], B: number[], C: number[]): number[] {
        // Compute vectors AB and AC
        const AB = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
        const AC = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];

        // Compute the normal vector N = AB x AC
        const N = [
            AB[1] * AC[2] - AB[2] * AC[1],
            AB[2] * AC[0] - AB[0] * AC[2],
            AB[0] * AC[1] - AB[1] * AC[0],
        ];

        // Project the normal vector onto the XY plane
        const N_XY = [N[0], N[1], 0];

        // Calculate the magnitude of the projected vector
        const magnitude = Math.sqrt(N_XY[0] * N_XY[0] + N_XY[1] * N_XY[1]);

        // Handle a perfectly horizontal space
        if (magnitude == 0) {
            return [1, 1, 0];
        }

        // Normalize the projected vector
        const unitVector = [N_XY[0] / magnitude, N_XY[1] / magnitude, 0]; // TODO: Check if this needs to be normalized

        return unitVector;
    }
}

export default MapDisplay;
