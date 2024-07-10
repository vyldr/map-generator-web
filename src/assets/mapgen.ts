import seedrandom, { type PRNG } from 'seedrandom';

class Mapgen {
    constructor() {
        this.seed = String(Math.floor(Math.random() * 1000000000000000));
        this.random = seedrandom(this.seed);
        this.shuffle_parameters();

        this.wall_array = [];
        this.crystal_array = [];
        this.ore_array = [];
        this.height_array = [];
        this.flow_list = [];
        this.landslide_list = [];
        this.base = [];

        this.size = 32;
    }

    public random: PRNG;

    private flow_list: number[][][];
    private landslide_list: number[][][];
    private base: number[];

    public wall_array: number[][];
    public crystal_array: number[][];
    public ore_array: number[][];
    public height_array: number[][];

    public seed: string | number;
    public size: number;

    // Walls
    public solidDensity!: number;
    public wallDensity!: number;
    public oreDensity!: number;
    public crystalDensity!: number;
    public oreSeamDensity!: number;
    public crystalSeamDensity!: number;
    public rechargeSeamDensity!: number;

    // Water/Lava
    public floodLevel!: number;
    public floodType!: number;

    // Erosion
    public flowDensity!: number;
    public flowInterval!: number;
    public preFlow!: number;

    // Landslides
    public landslideDensity!: number;
    public landslideInterval!: number;

    // Slugs
    public slugDensity!: number;

    // Height
    public heightAlgo!: number;
    public heightRange!: number;
    public heightSquareWidth!: number;

    // Oxygen
    public oxygen!: number;

    public biome!: string;

    public shuffle_parameters(): void {
        // Walls
        this.solidDensity = this.random() * 0.3 + 0.2;
        this.wallDensity = this.random() * 0.3 + 0.3;
        this.oreDensity = this.random() * 0.3 + 0.3;
        this.crystalDensity = this.random() * 0.3 + 0.2;
        this.oreSeamDensity = this.random() * 0.25;
        this.crystalSeamDensity = this.random() * 0.5;
        this.rechargeSeamDensity = this.random() * 0.08 + 0.01;

        // Water/Lava
        this.floodLevel = this.random() * 0.75;
        this.floodType = this.randint_range(6, 8);

        // Erosion
        this.flowDensity = this.random() * 0.005;
        this.flowInterval = this.randint_range(20, 181);
        this.preFlow = this.randint_range(3, 9);

        // Landslides
        this.landslideDensity = this.random() * 0.4;
        this.landslideInterval = this.randint_range(10, 91);

        // Slugs
        this.slugDensity = this.random() * 0.2;

        // Height
        this.heightAlgo = 0;
        this.heightRange = this.randint_range(1, 26);
        this.heightSquareWidth = 8;

        // Oxygen
        this.oxygen = -1;

        // Biome
        this.biome = ['ice', 'rock', 'lava'][this.randint_range(0, 3)];
    }

    // Choose a random integer (a <= x < b)
    private randint_range(a: number, b: number): number {
        const range: number = b - a;
        return Math.floor(this.random() * range) + a;
    }

    // Create a 2d array and initialize each item
    private createArray(x: number, y: number, fill: any): any[][] {
        const array: any[][] = [];
        for (let i = 0; i < x; i++) {
            array.push([]);
            for (let j = 0; j < y; j++) {
                array[i].push(typeof fill == 'function' ? fill() : fill);
            }
        }

        return array;
    }

    // Perform per-tile functions from the map center to the edge to make the map center generate the same at different map sizes
    private spiral(fn: Function, border: number = 1): void {
        for (let layer = this.size / 2 - 1; layer >= border; layer--) {
            let direction: number = 0;
            let x: number = layer;
            let y: number = layer;
            do {
                fn(y, x);
                switch (direction) {
                    case 0: // Right
                        x++;
                        if (x >= this.size - layer - 1) {
                            direction = 1;
                        }
                        break;

                    case 1: // Down
                        y++;
                        if (y >= this.size - layer - 1) {
                            direction = 2;
                        }
                        break;

                    case 2: // Left
                        x--;
                        if (x <= layer) {
                            direction = 3;
                        }
                        break;

                    case 3: // Up
                        y--;
                        if (y <= layer) {
                            direction = 0;
                        }
                        break;

                    default:
                        break;
                }
            } while (x != layer || y != layer);
        }
    }

    public mapgen(): boolean {
        // Load the seed
        // @ts-expect-error
        this.random = seedrandom(this.seed);
        const seeds = {
            solid_seed: String(this.random()),
            other_seed: String(this.random()),
            ore_seed: String(this.random()),
            crystal_seed: String(this.random()),
            height_seed: String(this.random()),
            slug_seed: String(this.random()),
            ecs_seed: String(this.random()),
            os_seed: String(this.random()),
            rs_seed: String(this.random()),
            erosion_seed: String(this.random()),
            landslide_seed: String(this.random()),
            base_seed: String(this.random()),
        };

        // Round up to the next chunk
        this.size = Math.floor((this.size + 7) / 8) * 8;

        // Optionally set oxygen
        if (this.oxygen == -1) {
            this.oxygen = this.size * this.size * 3;
        }

        // Create the solid rock
        this.random = seedrandom(seeds.solid_seed);
        const solid_array = this.createArray(this.size, this.size, -1); // Solid rock
        this.spiral((x: number, y: number) => {
            solid_array[y][x] = this.randomize(1 - this.solidDensity, -1);
        });
        this.speleogenesis(solid_array);
        this.cleanup(solid_array);
        this.fillExtra(solid_array);

        // Create the other rocks
        this.wall_array = this.createArray(this.size, this.size, -1); // Other rock
        this.random = seedrandom(seeds.other_seed);
        this.spiral((x: number, y: number) => {
            this.wall_array[y][x] = this.randomize(1 - this.wallDensity, -1);
        });
        this.speleogenesis(this.wall_array);
        this.cleanup(this.wall_array);
        this.random = seedrandom(seeds.other_seed); // Use fresh RNG
        this.details(this.wall_array, 3);

        // Merge the permanent and temporary features
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (solid_array[i][j] == -1) {
                    this.wall_array[i][j] = 4;
                }
            }
        }

        // Create ore
        this.random = seedrandom(seeds.ore_seed);
        this.ore_array = this.createArray(this.size, this.size, -1);
        this.spiral((x: number, y: number) => {
            this.ore_array[y][x] = this.randomize(1 - this.oreDensity, -1);
        });
        this.speleogenesis(this.ore_array);
        this.cleanup(this.ore_array);
        this.random = seedrandom(seeds.ore_seed); // Use fresh RNG
        this.details(this.ore_array, 4);

        // Create crystals
        this.random = seedrandom(seeds.crystal_seed);
        this.crystal_array = this.createArray(this.size, this.size, -1);
        this.spiral((x: number, y: number) => {
            this.crystal_array[y][x] = this.randomize(1 - this.crystalDensity, -1);
        });
        this.speleogenesis(this.crystal_array);
        this.cleanup(this.crystal_array);
        this.random = seedrandom(seeds.crystal_seed); // Use fresh RNG
        this.details(this.crystal_array, 5);

        // Create a height map
        this.random = seedrandom(seeds.height_seed);

        if (this.heightAlgo == 0) {
            this.height_array = this.heightMapSquares();
        } else if (this.heightAlgo == 1) {
            this.height_array = this.heightMapWaves();
        }

        // Flood the low areas
        this.flood(this.wall_array, this.height_array, this.floodLevel, this.floodType);

        // Remove resources from invalid tiles
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.wall_array[i][j] < 1 || this.wall_array[i][j] > 3) {
                    this.crystal_array[i][j] = 0;
                    this.ore_array[i][j] = 0;
                }
            }
        }

        // Slimy Slug holes
        this.random = seedrandom(seeds.slug_seed);
        this.aSlimySlugIsInvadingYourBase(this.wall_array, this.slugDensity);

        // Energy Crystal Seams
        this.random = seedrandom(seeds.ecs_seed);
        this.addSeams(this.wall_array, this.crystal_array, this.crystalSeamDensity, 10);

        // Ore Seams
        this.random = seedrandom(seeds.os_seed);
        this.addSeams(this.wall_array, this.ore_array, this.oreSeamDensity, 11);

        // Recharge seams
        this.random = seedrandom(seeds.rs_seed);
        this.addRechargeSeams(this.wall_array, this.rechargeSeamDensity);

        // Lava Flows / Erosion
        this.random = seedrandom(seeds.erosion_seed);
        this.flow_list = [];
        if (this.floodType == 7) {
            // Lava
            this.flow_list = this.createFlowList(
                this.wall_array,
                this.flowDensity,
                this.height_array,
                this.preFlow,
                this.heightRange
            );
        }

        // Set unstable walls and landslide rubble
        this.random = seedrandom(seeds.landslide_seed);
        this.landslide_list = this.aLandslideHasOccured(this.wall_array, this.landslideDensity);

        // Set the starting point
        this.random = seedrandom(seeds.base_seed);
        this.base = this.chooseBase(this.wall_array);
        if (!this.base) {
            // Make sure there is space to build
            return false;
        }
        this.setBase(this.base, this.wall_array, this.height_array);

        // Finally done
        return true;
    }

    // Add recharge seams to replace solid rock
    private addRechargeSeams(array: number[][], density: number): void {
        const rechargeArray = this.createArray(this.size, this.size, -1);
        this.spiral((x: number, y: number) => {
            rechargeArray[y][x] = this.randomize(1 - density, 1);
        });

        for (let i = 1; i < this.size - 1; i++) {
            for (let j = 1; j < this.size - 1; j++) {
                // Only if the space is already solid rock
                if (array[i][j] == 4 /* Solid rock */) {
                    // Only if at least two opposite sides are solid rock
                    if (
                        ((array[i + 1][j] == 4 && array[i - 1][j] == 4) ||
                            (array[i][j + 1] == 4 && array[i][j - 1] == 4)) &&
                        // Only if at least one side is not solid rock
                        (array[i + 1][j] != 4 ||
                            array[i - 1][j] != 4 ||
                            array[i][j + 1] != 4 ||
                            array[i][j - 1] != 4)
                    ) {
                        if (rechargeArray[i][j]) {
                            array[i][j] = 12; // Recharge seam
                        }
                    }
                }
            }
        }
    }

    // Add Energy Crystal and Ore seams
    private addSeams(
        array: number[][],
        resourceArray: number[][],
        density: number,
        seam_type: number
    ): void {
        this.spiral((x: number, y: number) => {
            if (this.random() < density) {
                if (resourceArray[y][x] > 2) {
                    array[y][x] = seam_type;
                }
            }
        });
    }

    // A landslide has occured
    private aLandslideHasOccured(array: number[][], stability: number): number[][][] {
        const landslideArray: number[][] = this.createArray(this.size, this.size, -1);
        this.spiral((x: number, y: number) => {
            landslideArray[y][x] = this.randomize(1 - stability, -1);
        });

        this.speleogenesis(landslideArray);
        this.details(landslideArray, 3);

        // Build the list
        const landslideList: number[][][] = [[], [], []]; // Three different landslide frequencies
        for (let i = 1; i < this.size - 1; i++) {
            for (let j = 1; j < this.size - 1; j++) {
                // Fill in rubble
                if (landslideArray[i][j] > 0 && array[i][j] == 0) {
                    // Ground
                    array[i][j] = 8; // Landslide rubble
                }
                // Landslides are possible here
                if (landslideArray[i][j] > 0 && array[i][j] > 0 && array[i][j] < 4) {
                    landslideList[landslideArray[i][j] - 1].push([i, j]);
                }
            }
        }

        return landslideList;
    }

    // A Slimy Slug is invading your base!
    private aSlimySlugIsInvadingYourBase(array: number[][], slugDensity: number): void {
        const slugMap = this.createArray(this.size, this.size, 9);
        this.spiral((x: number, y: number) => {
            slugMap[y][x] = this.randomize(1 - slugDensity ** 3, 9);
        });

        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (slugMap[i][j] && array[i][j] == 0) {
                    array[i][j] = 9; // Slimy Slug hole
                }
            }
        }
    }

    // Choose a starting point
    private chooseBase(array: number[][]): number[] {
        // Find all possible starting points
        const possibleBaseList: number[][] = [];
        this.spiral((x: number, y: number) => {
            // Choose a random value as the location preference
            const preference: number = this.random();
            // Check for a 2x2 ground section to build on
            if (
                array[y][x] == 0 &&
                array[y + 1][x] == 0 &&
                array[y][x + 1] == 0 &&
                array[y + 1][x + 1] == 0
            ) {
                possibleBaseList.push([y, x, preference]);
            }
        });

        // Make sure there is somewhere to build
        if (possibleBaseList.length == 0) {
            return [];
        }

        // Sort by preference
        possibleBaseList.sort((a: number[], b: number[]) => a[2] - b[2]);

        // Choose one
        return [possibleBaseList[0][0], possibleBaseList[0][1]];
    }

    // Clean up small map features
    private cleanup(array: number[][]): void {
        const empty = 0;
        let changed = true;
        while (changed == true) {
            changed = false;
            for (let i = 1; i < this.size - 1; i++) {
                for (let j = 1; j < this.size - 1; j++) {
                    if (
                        (array[i - 1][j] == empty && array[i + 1][j] == empty) ||
                        (array[i][j - 1] == empty && array[i][j + 1] == empty)
                    ) {
                        if (array[i][j] != empty) {
                            array[i][j] = empty;
                            changed = true;
                        }
                    }
                }
            }
        }
    }

    // Create a list of lava flow spaces
    private createFlowList(
        array: number[][],
        density: number,
        height: number[][],
        preFlow: number,
        heightRange: number
    ): number[][][] {
        const flowArray: number[][] = this.createArray(this.size, this.size, -1);
        const spillList: number[][][] = [];
        const sources: number[][] = [];

        this.spiral((x: number, y: number) => {
            if (this.random() < density) {
                if (array[y][x] == 0) {
                    sources.push([y, x]); // Possible lava source
                }
            }
            if (array[y][x] < 4) {
                flowArray[y][x] = 0; // Possible spill zone
            }
        });

        // Start spilling from each source
        sources.forEach((source) => {
            array[source[0]][source[1]] = 7; // Lava
            const flowList: number[][] = [source];
            flowArray[source[0]][source[1]] = 1; // Checked

            // Find spill zones
            let i: number = 0;
            while (i < flowList.length) {
                const adjacent: number[][] = [
                    [flowList[i][0] + 1, flowList[i][1]],
                    [flowList[i][0] - 1, flowList[i][1]],
                    [flowList[i][0], flowList[i][1] + 1],
                    [flowList[i][0], flowList[i][1] - 1],
                ];

                // Sum of all corners.  Not really elevation but close enough
                const sourceElevation: number =
                    height[flowList[i][0]][flowList[i][1]] +
                    height[flowList[i][0] + 1][flowList[i][1]] +
                    height[flowList[i][0]][flowList[i][1] + 1] +
                    height[flowList[i][0] + 1][flowList[i][1] + 1];

                // Add to flowList if not checked and lower elevation
                adjacent.forEach((space) => {
                    // Sum of all corners.  Not really elevation but close enough
                    const elevation: number =
                        height[space[0]][space[1]] +
                        height[space[0] + 1][space[1]] +
                        height[space[0]][space[1] + 1] +
                        height[space[0] + 1][space[1] + 1];
                    if (
                        flowArray[space[0]][space[1]] == 0 &&
                        sourceElevation > elevation - heightRange * 3
                    ) {
                        flowList.push(space);
                        flowArray[space[0]][space[1]] = 1; // Checked
                    }
                });
                i += 1;
            }

            // Add the flowList to the spillList
            spillList.push(flowList);

            // Clean up the array for reuse
            flowList.forEach((space) => {
                flowArray[space[0]][space[1]] = 0;
            });
        });

        // Preflow the lavaflows so the sources are not just lonely lava squares
        for (let i = 0; i < preFlow; i++) {
            const totalSources: number = sources.length;
            for (let j = 0; j < totalSources; j++) {
                const adjacent: number[][] = [
                    [sources[j][0] + 1, sources[j][1]],
                    [sources[j][0] - 1, sources[j][1]],
                    [sources[j][0], sources[j][1] + 1],
                    [sources[j][0], sources[j][1] - 1],
                ];
                adjacent.forEach((space) => {
                    if (array[space[0]][space[1]] == 0) {
                        array[space[0]][space[1]] = 7; // Lava
                        sources.push(space);
                    }
                });
            }
        }

        return spillList;
    }

    // Adjust values based on the distance from open areas
    private details(array: number[][], maxDistance: number): void {
        // Set type equal to distance from edge
        for (let n = 0; n < maxDistance; n++) {
            for (let i = 1; i < this.size - 1; i++) {
                for (let j = 1; j < this.size - 1; j++) {
                    if (
                        (array[i - 1][j] == n ||
                            array[i + 1][j] == n ||
                            array[i][j - 1] == n ||
                            array[i][j + 1] == n) &&
                        array[i][j] == -1
                    ) {
                        array[i][j] = n + 1;
                    }
                }
            }
        }

        // Fix anything we missed earlier
        for (let i = 1; i < this.size - 1; i++) {
            for (let j = 1; j < this.size - 1; j++) {
                if (array[i][j] == -1) {
                    array[i][j] = maxDistance;
                }
            }
        }

        this.spiral((x: number, y: number) => {
            const blur: number = this.randint_range(-1, 2);

            if (array[y][x] >= 1) {
                array[y][x] += blur;
                if (array[y][x] <= 0) {
                    array[y][x] = 1;
                }
                if (array[y][x] > maxDistance) {
                    array[y][x] = maxDistance;
                }
            }
        });
    }

    // Fill in all open areas except for the largest one
    private fillExtra(array: number[][]): boolean {
        // Create the obstacle map
        const unchecked = 0; // Unchecked open space
        const obstacle = -1; // Obstacle

        const tmap: number[][] = this.createArray(this.size, this.size, unchecked);
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (array[i][j] != 0) {
                    tmap[i][j] = obstacle;
                }
            }
        }

        // Make a list of open spaces
        const spaces: number[][][] = this.openSpaces(tmap, false);

        // Make sure the map even makes sense
        if (spaces.length < 1) {
            // The map failed
            return false;
        }

        // Fill in all except the largest
        spaces.sort((a: number[][], b: number[][]) => a.length - b.length); // Move the largest to the back
        spaces.pop(); // Remove the largest
        spaces.forEach((space) => {
            space.forEach((tile) => {
                array[tile[0]][tile[1]] = obstacle;
            });
        });

        // Report that the map is playable
        return true;
    }

    // Flood low areas with a specified liquid
    private flood(
        array: number[][],
        heightArray: number[][],
        floodLevel: number,
        floodType: number
    ): void {
        const height = this.size;
        const width = this.size;

        // Find the flood height
        const difference: number = this.heightSquareWidth ** 2 * this.heightRange;
        const floodHeight: number = difference * floodLevel - difference / 2;

        // Level anything below floodHeight
        for (let i = 0; i < height + 1; i++) {
            for (let j = 0; j < width + 1; j++) {
                heightArray[i][j] = Math.max(heightArray[i][j], floodHeight);
            }
        }

        // Finally pour the lava! (or water)
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                if (
                    array[i][j] == 0 &&
                    heightArray[i][j] == floodHeight &&
                    heightArray[i + 1][j] == floodHeight &&
                    heightArray[i][j + 1] == floodHeight &&
                    heightArray[i + 1][j + 1] == floodHeight
                ) {
                    array[i][j] = floodType;
                }
            }
        }
    }

    // Fill in a square section of an array
    private fillSquare(
        i: number,
        j: number,
        array: number[][],
        height: number,
        width: number,
        squareSize: number,
        value: number
    ): void {
        const iMin = i - Math.floor(squareSize / 1);
        const iMax = i + Math.floor(squareSize / 1);
        const jMin = j - Math.floor(squareSize / 1);
        const jMax = j + Math.floor(squareSize / 1);

        // Loop through each space in the square and and in the array boundary
        for (let k = Math.max(iMin, 0); k < Math.min(iMax, height); k++) {
            for (let l = Math.max(jMin, 0); l < Math.min(jMax, width); l++) {
                array[k][l] += value;
            }
        }
    }

    // Create a height map
    private heightMapSquares(): number[][] {
        const height = this.size + 1;
        const width = this.size + 1;

        const array: number[][] = this.createArray(height, width, 0);

        this.spiral((x: number, y: number) => {
            const value: number = this.randint_range(
                -Math.floor(this.heightRange),
                Math.floor(this.heightRange) + 1
            );
            this.fillSquare(y, x, array, height, width, this.heightSquareWidth, value);
        }, -this.heightSquareWidth);

        return array;
    }

    // Create a height map
    private heightMapWaves(): number[][] {
        const array: number[][] = this.createArray(this.size + 1, this.size + 1, 0);

        const waveCount: number = 10;
        const maxHeight: number = this.heightRange * 1.2;
        const c: number = maxHeight / waveCount;
        const k: number = 1 / 20;

        const f: number[] = []; // Frequency
        const a: number[] = []; // Amplitude
        const o: number[] = []; // Offset

        for (let i = 1; i <= waveCount; i++) {
            f.push(i * (this.random() + 0.5));
            a.push(this.random() * (c / i) * maxHeight + 0);
            f.push(i * (this.random() + 0.5));
            a.push(this.random() * (c / i) * maxHeight + 0);
            o.push(this.random() * Math.PI * 2);
            o.push(this.random() * Math.PI * 2);
        }

        for (let i = 0; i < this.size + 1; i++) {
            for (let j = 0; j < this.size + 1; j++) {
                const x = j - this.size / 2;
                const y = i - this.size / 2;

                for (let w = 0; w < waveCount * 2; w++) {
                    array[i][j] += a[w] * Math.sin(f[w] * (k * x + o[w]));
                    w++;
                    array[i][j] += a[w] * Math.sin(f[w] * (k * y + o[w]));
                }
            }
        }

        return array;
    }

    // List open spaces
    private openSpaces(array: number[][], corners: boolean): number[][][] {
        const unchecked = 0; // Unchecked open space
        const checked = 1; // Checked open space

        const spaces: number[][][] = []; // List of lists of coordinates
        for (let i = 1; i < this.size - 1; i++) {
            for (let j = 1; j < this.size - 1; j++) {
                if (array[i][j] == unchecked) {
                    // Open space found!
                    array[i][j] = checked; // Mark the space
                    const space: number[][] = []; // List of coordinates in the space
                    let index: number = 0;
                    space.push([i, j]);
                    while (index < space.length) {
                        // Use shorter variable names for frequently used values
                        const x: number = space[index][0];
                        const y: number = space[index][1];

                        // Check each adjacent space
                        if (array[x - 1][y] == unchecked) {
                            array[x - 1][y] = checked;
                            space.push([x - 1, y]);
                        }
                        if (array[x + 1][y] == unchecked) {
                            array[x + 1][y] = checked;
                            space.push([x + 1, y]);
                        }
                        if (array[x][y - 1] == unchecked) {
                            array[x][y - 1] = checked;
                            space.push([x, y - 1]);
                        }
                        if (array[x][y + 1] == unchecked) {
                            array[x][y + 1] = checked;
                            space.push([x, y + 1]);
                        }

                        // Optionally also check the corners
                        if (corners) {
                            if (array[x - 1][y - 1] == unchecked) {
                                array[x - 1][y - 1] = checked;
                                space.push([x - 1, y - 1]);
                            }
                            if (array[x + 1][y - 1] == unchecked) {
                                array[x + 1][y - 1] = checked;
                                space.push([x + 1, y - 1]);
                            }
                            if (array[x - 1][y + 1] == unchecked) {
                                array[x - 1][y + 1] = checked;
                                space.push([x - 1, y + 1]);
                            }
                            if (array[x + 1][y + 1] == unchecked) {
                                array[x + 1][y + 1] = checked;
                                space.push([x + 1, y + 1]);
                            }
                        }

                        // Mark the current space as checked
                        array[x][y] = checked;

                        // Move on to the next coordinate
                        index += 1;
                    }
                    // Add the list to the list of lists
                    spaces.push(space);
                }
            }
        }
        return spaces;
    }

    private randomize(probability: number, original: number): number {
        if (this.random() < probability) {
            return 0;
        }
        return original;
    }

    // Set up the base at the chosen location
    private setBase(base: number[], array: number[][], height: number[][]): void {
        if (!base.length) {
            return;
        }
        // Place building power paths under the tool store
        array[base[0]][base[1]] = 13; // Building power path
        array[base[0] + 1][base[1]] = 13; // Building power path

        // Change geography to accomodate our buildings
        const average: number = Math.floor(
            (height[base[0]][base[1]] +
                height[base[0] + 1][base[1]] +
                height[base[0]][base[1] + 1] +
                height[base[0] + 1][base[1] + 1]) /
                4
        );
        height[base[0]][base[1]] = average;
        height[base[0] + 1][base[1]] = average;
        height[base[0]][base[1] + 1] = average;
        height[base[0] + 1][base[1] + 1] = average;
    }

    // Shape the random noise into caves
    private speleogenesis(array: number[][]): void {
        const empty = 0;
        const filled = -1;
        let changed: boolean = true;
        while (changed) {
            // Run until nothing changes
            changed = false;

            const tmap: number[][] = structuredClone(array);

            // Decide which spaces to change
            for (let i = 1; i < this.size - 1; i++) {
                for (let j = 1; j < this.size - 1; j++) {
                    // Count adjacent spaces
                    let adjacent: number = 0;
                    if (tmap[i + 1][j] == filled) {
                        adjacent += 1;
                    }
                    if (tmap[i - 1][j] == filled) {
                        adjacent += 1;
                    }
                    if (tmap[i][j + 1] == filled) {
                        adjacent += 1;
                    }
                    if (tmap[i][j - 1] == filled) {
                        adjacent += 1;
                    }

                    // Change to empty if all neighbors are empty
                    if (adjacent == 0) {
                        if (array[i][j] != empty) {
                            changed = true;
                            array[i][j] = empty;
                        }
                    }

                    // Change to filled if at least three neighbors are filled
                    else if (adjacent >= 3) {
                        if (array[i][j] != filled) {
                            changed = true;
                            array[i][j] = filled;
                        }
                    }
                }
            }
        }
    }

    // Count how many crystals we can actually get from where we start to prevent impossible levels
    private countAccessibleCrystals(
        array: number[][],
        base: number[],
        crystalArray: number[][],
        vehicles: boolean
    ) {
        const spaces: number[][] = [base];
        const tmap = this.createArray(this.size, this.size, -1);

        // Choose the types of tiles we can cross
        let types: number[] = [0, 1, 2, 3, 8, 9, 10, 11, 13];
        if (vehicles) {
            // With vehicles we can cross water and lava
            types = [0, 1, 2, 3, 6, 7, 8, 9, 10, 11, 13];
        }

        // Mark which spaces could be accessible
        this.spiral((x: number, y: number) => {
            if (types.includes(array[y][x])) {
                tmap[y][x] = 0; //Accessible
            }
        }, 1);

        tmap[base[0]][base[1]] = 1;
        let i: number = 0;
        while (i < spaces.length) {
            // Use shorter variable names for frequently used values
            const x: number = spaces[i][0];
            const y: number = spaces[i][1];

            // Check each adjacent space
            if (tmap[x - 1][y] == 0) {
                tmap[x - 1][y] = 1;
                spaces.push([x - 1, y]);
            }
            if (tmap[x + 1][y] == 0) {
                tmap[x + 1][y] = 1;
                spaces.push([x + 1, y]);
            }
            if (tmap[x][y - 1] == 0) {
                tmap[x][y - 1] = 1;
                spaces.push([x, y - 1]);
            }
            if (tmap[x][y + 1] == 0) {
                tmap[x][y + 1] = 1;
                spaces.push([x, y + 1]);
            }

            i += 1;
        }

        // Count crystals in our list
        let count: number = 0;
        spaces.forEach((space) => {
            count += crystalArray[space[0]][space[1]];
        });

        return count;
    }

    // Make a list of undiscovered caverns
    private findCaves(array: number[][], base: number[]) {
        // Mark our obstacles
        const tmap = this.createArray(this.size, this.size, -1);

        // Mark the open spaces
        const openTiles = [0, 6, 7, 8, 9, 13];
        this.spiral((x: number, y: number) => {
            if (openTiles.includes(array[y][x])) {
                tmap[y][x] = 0;
            }
        }, 1);

        // Create the list of caverns
        const caveList = new Set(this.openSpaces(tmap, true));

        // Find which cavern contains our base and remove it
        caveList.forEach((cave) => {
            cave.forEach((tile) => {
                if (tile[0] == base[0] && tile[1] == base[1]) {
                    caveList.delete(cave);
                }
            });
        });

        return caveList;
    }

    // Convert to a Manic Miners level file
    public save(): string {
        // Count all the crystals we can reach
        let crystalCount: number = this.countAccessibleCrystals(
            this.wall_array,
            this.base,
            this.crystal_array,
            false
        );
        if (crystalCount >= 14) {
            // More than enough crystals to get vehicles
            crystalCount = this.countAccessibleCrystals(
                this.wall_array,
                this.base,
                this.crystal_array,
                true
            );
        }
        // Basic info
        let MMtext: string =
            'info{\n' +
            'rowcount:' +
            this.size +
            '\n' +
            'colcount:' +
            this.size +
            '\n' +
            'camerapos:Translation: X=' +
            (this.base[1] * 300 + 300) +
            ' Y=' +
            (this.base[0] * 300 + 300) +
            ' Z=' +
            this.height_array[this.base[0]][this.base[1]] +
            ' Rotation: P=44.999992 Y=180.000000 R=0.000000 Scale X=1.000 Y=1.000 Z=1.000\n' +
            'biome:' +
            this.biome +
            '\n' +
            'creator:Map Generator for Manic Miners\n' +
            (this.oxygen ? 'oxygen:' + this.oxygen + '/' + this.oxygen + '\n' : '') +
            'levelname:' +
            'Generated Level' +
            '\n' +
            'erosioninitialwaittime:10\n' +
            '}\n';

        // Convert the tile numbers
        MMtext += 'tiles{\n';
        const conversion: { [n: number]: number } = {
            0: 1, // Ground
            1: 26, // Dirt
            2: 30, // Loose Rock
            3: 34, // Hard Rock
            4: 38, // Solid Rock
            6: 11, // Water
            7: 6, // Lava
            8: 63, // Landslide rubble
            9: 12, // Slimy Slug hole
            10: 42, // Energy Crystal Seam
            11: 46, // Ore Seam
            12: 50, // Recharge Seam
            13: 14, // Building power path
        };

        // Apply the conversion
        const converted_walls = this.createArray(this.size, this.size, null);
        this.spiral((x: number, y: number) => {
            converted_walls[y][x] = conversion[this.wall_array[y][x]];
        }, 0);

        // List undiscovered caverns
        const caveList = this.findCaves(this.wall_array, this.base);

        // Hide undiscovered caverns
        caveList.forEach((cave) => {
            cave.forEach((space) => {
                converted_walls[space[0]][space[1]] += 100;
            });
        });

        // Add to the file
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                MMtext += converted_walls[i][j] + ',';
            }
            MMtext += '\n';
        }
        MMtext += '}\n';

        // Add the heights
        MMtext += 'height{\n';
        for (let i = 0; i < this.size + 1; i++) {
            for (let j = 0; j < this.size + 1; j++) {
                MMtext += Math.floor(this.height_array[i][j]) + ',';
            }
            MMtext += '\n';
        }
        MMtext += '}\n';

        // Add the resources
        MMtext += 'resources{\n';

        // Crystals
        MMtext += 'crystals:\n';
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                MMtext += this.crystal_array[i][j] + ',';
            }
            MMtext += '\n';
        }

        // Ore
        MMtext += 'ore:\n';
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                MMtext += this.ore_array[i][j] + ',';
            }
            MMtext += '\n';
        }
        MMtext += '}\n';

        // Objectives
        MMtext += 'objectives{\n';
        // Collect half of the crystals, maximum of 999
        MMtext += 'resources: ' + Math.min(Math.floor(crystalCount / 2), 999) + ',0,0\n';
        MMtext += '}\n';

        // Buildings
        MMtext += 'buildings{\n';
        MMtext +=
            'BuildingToolStore_C\n' +
            'Translation: X=' +
            (this.base[1] * 300 + 150.0) +
            ' Y=' +
            (this.base[0] * 300 + 150.0) +
            ' Z=' +
            this.height_array[this.base[0]][this.base[1]] +
            ' Rotation: P=' +
            '0' +
            '.000000 Y=89.999992 R=0.000000 Scale X=1.000 Y=1.000 Z=1.000\n' +
            'Level=1\n' +
            'Teleport=True\n' +
            'Health=MAX\n' +
            // X = chunk number
            // Y = row within chunk
            // Z = col within chunk
            'Powerpaths=X=' +
            (Math.floor(this.size / 8) * Math.floor(this.base[0] / 8) +
                Math.floor(this.base[1] / 8)) +
            ' Y=' +
            (this.base[0] % 8) +
            ' Z=' +
            (this.base[1] % 8) +
            '/X=' +
            (Math.floor(this.size / 8) * Math.floor((this.base[0] + 1) / 8) +
                Math.floor(this.base[1] / 8)) +
            ' Y=' +
            ((this.base[0] + 1) % 8) +
            ' Z=' +
            (this.base[1] % 8) +
            '/\n';
        MMtext += '}\n';

        // A landslide has occured
        MMtext += 'landslideFrequency{\n';
        for (let i = 1; i < this.landslide_list.length + 1; i++) {
            if (this.landslide_list[i - 1].length) {
                MMtext += i * this.landslideInterval + ':';
            }
            this.landslide_list[i - 1].forEach((space) => {
                MMtext += space[1] + ',' + space[0] + '/';
            });
            if (this.landslide_list[i - 1].length) {
                MMtext += '\n';
            }
        }
        MMtext += '}\n';

        // Erosion
        MMtext += 'lavaspread{\n';
        for (let i = 1; i < this.flow_list.length + 1; i++) {
            if (this.flow_list[i - 1].length) {
                MMtext += i * this.flowInterval + ':';
            }
            this.flow_list[i - 1].forEach((space) => {
                MMtext += space[1] + ',' + space[0] + '/';
            });
            if (this.flow_list[i - 1].length) {
                MMtext += '\n';
            }
        }
        MMtext += '}\n';

        // Miners
        MMtext += 'miners{\n';
        MMtext += '}\n';

        // Briefing
        MMtext += 'briefing{\n';
        MMtext +=
            'You must collect ' +
            Math.min(Math.floor(crystalCount / 2), 999) +
            ' energy crystals.  \n';
        MMtext += '}\n';

        return MMtext;
    }
}

export default Mapgen;
