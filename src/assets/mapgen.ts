import seedrandom, { type PRNG } from 'seedrandom';
import Tile from './tile';

class Mapgen {
    constructor() {
        this.seed = String(Math.floor(Math.random() * 1000000000000000));
        this.random = seedrandom(this.seed);
        this.shuffle_parameters();

        this.tiles = [];
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

    public tiles: Tile[][];
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

    // Monsters
    public monsterDensity!: number;

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

        // Monsters
        this.monsterDensity = this.random() * 0.2;

        // Slugs
        this.slugDensity = this.random() * 0.2;

        // Height
        this.heightAlgo = 0;
        this.heightRange = this.randint_range(1, 20);
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
                array[i].push(typeof fill == 'function' ? fill(i, j) : fill);
            }
        }

        return array;
    }

    // Debug function
    private logTiles(key: keyof Tile): void {
        for (let i = 0; i < this.tiles.length; i++) {
            let row = '';
            for (let j = 0; j < this.tiles[0].length; j++) {
                row += this.tiles[i][j][key] + ' ';
            }
            console.log(row);
        }
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
            monster_seed: String(this.random()),
            base_seed: String(this.random()),
        };

        // Round up to the next chunk
        this.size = Math.floor((this.size + 7) / 8) * 8;

        // Initialize the Tile array
        this.tiles = this.createArray(this.size, this.size, (y: number, x: number) => {
            return new Tile(y, x);
        });

        // Optionally set oxygen
        if (this.oxygen == -1) {
            this.oxygen = this.size * this.size * 3;
        }

        // Create the dirt, loose rock, and solid rock
        this.random = seedrandom(seeds.other_seed);
        this.spiral((x: number, y: number) => {
            this.tiles[y][x].wall = this.randomize(1 - this.wallDensity, -1);
        });
        this.speleogenesis('wall');
        this.cleanup('wall');
        this.random = seedrandom(seeds.other_seed); // Use fresh RNG
        this.details('wall', 3);
        // Apply to the tiles
        this.spiral((x: number, y: number) => {
            this.tiles[y][x].type = this.tiles[y][x].wall;
        });

        // Create the solid rock
        this.random = seedrandom(seeds.solid_seed);
        this.spiral((x: number, y: number) => {
            this.tiles[y][x].solid = this.randomize(1 - this.solidDensity, -1);
        });
        this.speleogenesis('solid');
        this.cleanup('solid');
        this.fillExtra();
        // Apply to the tiles
        this.spiral((x: number, y: number) => {
            if (this.tiles[y][x].solid == -1) {
                this.tiles[y][x].type = 4;
            }
        }, 0);

        // Create ore
        this.random = seedrandom(seeds.ore_seed);
        this.spiral((x: number, y: number) => {
            this.tiles[y][x].ore = this.randomize(1 - this.oreDensity, -1);
        });
        this.speleogenesis('ore');
        this.cleanup('ore');
        this.random = seedrandom(seeds.ore_seed); // Use fresh RNG
        this.details('ore', 4);

        // Create crystals
        this.random = seedrandom(seeds.crystal_seed);
        this.spiral((x: number, y: number) => {
            this.tiles[y][x].crystals = this.randomize(1 - this.crystalDensity, -1);
        });
        this.speleogenesis('crystals');
        this.cleanup('crystals');
        this.random = seedrandom(seeds.crystal_seed); // Use fresh RNG
        this.details('crystals', 5);

        // Create a height map
        this.random = seedrandom(seeds.height_seed);

        if (this.heightAlgo == 0) {
            this.height_array = this.heightMapSquares();
        } else if (this.heightAlgo == 1) {
            this.height_array = this.heightMapWaves();
        }

        // Flood the low areas
        this.flood(this.height_array, this.floodLevel, this.floodType);

        // Remove resources from invalid tiles
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.tiles[i][j].type < 1 || this.tiles[i][j].type > 3) {
                    this.tiles[i][j].crystals = 0;
                    this.tiles[i][j].ore = 0;
                }
            }
        }

        // Slimy Slug holes
        this.random = seedrandom(seeds.slug_seed);
        this.aSlimySlugIsInvadingYourBase(this.slugDensity);

        // Energy Crystal Seams
        this.random = seedrandom(seeds.ecs_seed);
        this.addSeams('crystals', this.crystalSeamDensity, 10);

        // Ore Seams
        this.random = seedrandom(seeds.os_seed);
        this.addSeams('ore', this.oreSeamDensity, 11);

        // Recharge seams
        this.random = seedrandom(seeds.rs_seed);
        this.addRechargeSeams(this.rechargeSeamDensity);

        // Lava Flows / Erosion
        this.random = seedrandom(seeds.erosion_seed);
        this.flow_list = [];
        if (this.floodType == 7) {
            // Lava
            this.flow_list = this.createFlowList(
                this.flowDensity,
                this.height_array,
                this.preFlow,
                this.heightRange
            );
        }

        // Set unstable walls and landslide rubble
        this.random = seedrandom(seeds.landslide_seed);
        this.landslide_list = this.aLandslideHasOccured(this.landslideDensity);

        // Set monster emerges and triggers
        this.random = seedrandom(seeds.monster_seed);
        this.aMonsterHasAppeared(seeds.monster_seed);

        // Set the starting point
        this.random = seedrandom(seeds.base_seed);
        this.base = this.chooseBase();
        if (!this.base) {
            // Make sure there is space to build
            return false;
        }
        this.setBase(this.base, this.height_array);

        // Finally done
        return true;
    }

    // Add recharge seams to replace solid rock
    private addRechargeSeams(density: number): void {
        this.spiral((x: number, y: number) => {
            this.tiles[y][x].recharge = this.randomize(1 - density, 1);
        });

        for (let i = 1; i < this.size - 1; i++) {
            for (let j = 1; j < this.size - 1; j++) {
                // Only if the space is already solid rock
                if (this.tiles[i][j].type == 4 /* Solid rock */) {
                    // Only if at least two opposite sides are solid rock
                    if (
                        ((this.tiles[i + 1][j].type == 4 && this.tiles[i - 1][j].type == 4) ||
                            (this.tiles[i][j + 1].type == 4 && this.tiles[i][j - 1].type == 4)) &&
                        // Only if at least one side is not solid rock
                        (this.tiles[i + 1][j].type != 4 ||
                            this.tiles[i - 1][j].type != 4 ||
                            this.tiles[i][j + 1].type != 4 ||
                            this.tiles[i][j - 1].type != 4)
                    ) {
                        if (this.tiles[i][j].recharge) {
                            this.tiles[i][j].type = 12; // Recharge seam
                        }
                    }
                }
            }
        }
    }

    // Add Energy Crystal and Ore seams
    private addSeams(key: keyof Tile, density: number, seam_type: number): void {
        this.spiral((x: number, y: number) => {
            if (this.random() < density) {
                if ((this.tiles[y][x][key] as number) > 2) {
                    this.tiles[y][x].type = seam_type;
                }
            }
        });
    }

    // A landslide has occured
    private aLandslideHasOccured(stability: number): number[][][] {
        this.spiral((x: number, y: number) => {
            this.tiles[y][x].landslide = this.randomize(1 - stability, -1);
        });

        this.speleogenesis('landslide');
        this.details('landslide', 3);

        // Build the list
        const landslideList: number[][][] = [[], [], []]; // Three different landslide frequencies
        for (let i = 1; i < this.size - 1; i++) {
            for (let j = 1; j < this.size - 1; j++) {
                // Fill in rubble
                if (this.tiles[i][j].landslide > 0 && this.tiles[i][j].type == 0) {
                    // Ground
                    this.tiles[i][j].type = 8; // Landslide rubble
                }
                // Landslides are possible here
                if (
                    this.tiles[i][j].landslide > 0 &&
                    this.tiles[i][j].type > 0 &&
                    this.tiles[i][j].type < 4
                ) {
                    landslideList[this.tiles[i][j].landslide - 1].push([i, j]);
                }
            }
        }

        return landslideList;
    }

    // A Monster has appeared
    private aMonsterHasAppeared(seed: string): void {
        this.spiral((x: number, y: number) => {
            this.tiles[y][x].monster = this.randomize(1 - this.monsterDensity, -1);
        });
        this.speleogenesis('monster');

        // Reset the RNG
        this.random = seedrandom(seed + 1);

        // Valid monster emerge tile types
        const emergeTypes = new Set([
            1, // Dirt
            2, // Loose Rock
            3, // Hard Rock
        ]);

        // Unique id for each trigger and emerge
        let id: number = 2; // Start from 2 because the level editor starts from 2
        this.spiral((x: number, y: number) => {
            if (this.tiles[y][x].monster && emergeTypes.has(this.tiles[y][x].type)) {
                this.tiles[y][x].emergeId = id++;
                if (this.chooseTrigger(this.tiles[y][x], id)) {
                    id++;
                }
            } else {
                this.tiles[y][x].monster = 0;
                this.random(); // Pull one RNG per tile
            }
        });
    }

    // A Slimy Slug is invading your base!
    private aSlimySlugIsInvadingYourBase(slugDensity: number): void {
        this.spiral((x: number, y: number) => {
            this.tiles[y][x].slug = this.randomize(1 - slugDensity ** 3, 9);
        });

        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.tiles[i][j].slug && this.tiles[i][j].type == 0) {
                    this.tiles[i][j].type = 9; // Slimy Slug hole
                }
            }
        }
    }

    // Choose a starting point
    private chooseBase(): number[] {
        // Find all possible starting points
        const possibleBaseList: number[][] = [];
        this.spiral((x: number, y: number) => {
            // Choose a random value as the location preference
            const preference: number = this.random();
            // Check for a 2x2 ground section to build on
            if (
                this.tiles[y][x].type == 0 &&
                this.tiles[y + 1][x].type == 0 &&
                this.tiles[y][x + 1].type == 0 &&
                this.tiles[y + 1][x + 1].type == 0
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

    // Choose a tile to trigger a monster emerge
    private chooseTrigger(tile: Tile, id: number): boolean {
        // Set of all tile types that can be a trigger
        const triggerTypes = new Set([
            0, // Ground
            1, // Dirt
            2, // Loose Rock
            3, // Hard Rock
            6, // Water
            7, // Lava
            8, // Landslide rubble
            9, // Slimy Slug hole
            10, // Energy Crystal Seam
            11, // Ore Seam
        ]);

        // List all tiles in a 7x7 box centered on the current tile
        let nearbyTiles: Tile[] = [];
        const minx = Math.max(tile.x - 3, 0);
        const maxx = Math.min(tile.x + 4, this.size);
        const miny = Math.max(tile.y - 3, 0);
        const maxy = Math.min(tile.y + 4, this.size);
        for (let i = miny; i < maxy; i++) {
            for (let j = minx; j < maxx; j++) {
                if (this.tiles[i][j] != tile) {
                    nearbyTiles.push(this.tiles[i][j]);
                }
            }
        }

        // Remove all tiles that can't be triggers
        nearbyTiles = nearbyTiles.filter((trigger) => triggerTypes.has(trigger.type));

        // Cancel if there are no valid trigger locations
        if (!nearbyTiles.length) {
            return false;
        }

        // Choose a trigger
        const trigger = nearbyTiles[this.randint_range(0, nearbyTiles.length)];
        trigger.addTrigger(tile);
        trigger.triggerId = id;
        return true;
    }

    // Clean up small map features
    private cleanup(key: keyof Tile): void {
        const empty = 0;
        let changed = true;
        while (changed == true) {
            changed = false;
            for (let i = 1; i < this.size - 1; i++) {
                for (let j = 1; j < this.size - 1; j++) {
                    if (
                        (this.tiles[i - 1][j][key] == empty &&
                            this.tiles[i + 1][j][key] == empty) ||
                        (this.tiles[i][j - 1][key] == empty && this.tiles[i][j + 1][key] == empty)
                    ) {
                        if (this.tiles[i][j][key] != empty) {
                            (this.tiles[i][j][key] as number) = empty;
                            changed = true;
                        }
                    }
                }
            }
        }
    }

    // Create a list of lava flow spaces
    private createFlowList(
        density: number,
        height: number[][],
        preFlow: number,
        heightRange: number
    ): number[][][] {
        const spillList: number[][][] = [];
        const sources: number[][] = [];

        this.spiral((x: number, y: number) => {
            if (this.random() < density) {
                if (this.tiles[y][x].type == 0) {
                    sources.push([y, x]); // Possible lava source
                }
            }
            if (this.tiles[y][x].type < 4) {
                this.tiles[y][x].erosion = 0; // Possible spill zone
            }
        });

        // Start spilling from each source
        sources.forEach((source) => {
            this.tiles[source[0]][source[1]].type = 7; // Lava
            const flowList: number[][] = [source];
            this.tiles[source[0]][source[1]].erosion = 1; // Checked

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
                        this.tiles[space[0]][space[1]].erosion == 0 &&
                        sourceElevation > elevation - heightRange * 3
                    ) {
                        flowList.push(space);
                        this.tiles[space[0]][space[1]].erosion = 1; // Checked
                    }
                });
                i += 1;
            }

            // Add the flowList to the spillList
            spillList.push(flowList);

            // Clean up the array for reuse
            flowList.forEach((space) => {
                this.tiles[space[0]][space[1]].erosion = 0;
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
                    if (this.tiles[space[0]][space[1]].type == 0) {
                        this.tiles[space[0]][space[1]].type = 7; // Lava
                        sources.push(space);
                    }
                });
            }
        }

        return spillList;
    }

    // Adjust values based on the distance from open areas
    private details(key: keyof Tile, maxDistance: number): void {
        // Set type equal to distance from edge
        for (let n = 0; n < maxDistance; n++) {
            for (let i = 1; i < this.size - 1; i++) {
                for (let j = 1; j < this.size - 1; j++) {
                    if (
                        (this.tiles[i - 1][j][key] == n ||
                            this.tiles[i + 1][j][key] == n ||
                            this.tiles[i][j - 1][key] == n ||
                            this.tiles[i][j + 1][key] == n) &&
                        this.tiles[i][j][key] == -1
                    ) {
                        (this.tiles[i][j][key] as number) = n + 1;
                    }
                }
            }
        }

        // Fix anything we missed earlier
        for (let i = 1; i < this.size - 1; i++) {
            for (let j = 1; j < this.size - 1; j++) {
                if (this.tiles[i][j][key] == -1) {
                    (this.tiles[i][j][key] as number) = maxDistance;
                }
            }
        }

        this.spiral((x: number, y: number) => {
            const blur: number = this.randint_range(-1, 2);

            if ((this.tiles[y][x][key] as number) >= 1) {
                (this.tiles[y][x][key] as number) += blur;
                if ((this.tiles[y][x][key] as number) <= 0) {
                    (this.tiles[y][x][key] as number) = 1;
                }
                if ((this.tiles[y][x][key] as number) > maxDistance) {
                    (this.tiles[y][x][key] as number) = maxDistance;
                }
            }
        });
    }

    // Fill in all open areas except for the largest one
    private fillExtra(): boolean {
        // Create the obstacle map
        const unchecked = 0; // Unchecked open space
        const obstacle = -1; // Obstacle

        const tmap: number[][] = this.createArray(this.size, this.size, unchecked);
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.tiles[i][j].solid != 0) {
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
                this.tiles[tile[0]][tile[1]].solid = obstacle;
            });
        });

        // Report that the map is playable
        return true;
    }

    // Flood low areas with a specified liquid
    private flood(heightArray: number[][], floodLevel: number, floodType: number): void {
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
                    this.tiles[i][j].type == 0 &&
                    heightArray[i][j] == floodHeight &&
                    heightArray[i + 1][j] == floodHeight &&
                    heightArray[i][j + 1] == floodHeight &&
                    heightArray[i + 1][j + 1] == floodHeight
                ) {
                    this.tiles[i][j].type = floodType;
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
    private setBase(base: number[], height: number[][]): void {
        if (!base.length) {
            return;
        }
        // Place building power paths under the tool store
        this.tiles[base[0]][base[1]].type = 13; // Building power path
        this.tiles[base[0] + 1][base[1]].type = 13; // Building power path

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
    private speleogenesis(key: keyof Tile): void {
        const empty = 0;
        const filled = -1;
        let changed: boolean = true;
        while (changed) {
            // Run until nothing changes
            changed = false;

            const tmap: number[][] = this.createArray(this.size, this.size, null);
            for (let i = 0; i < this.size; i++) {
                for (let j = 0; j < this.size; j++) {
                    tmap[i][j] = this.tiles[i][j][key] as number;
                }
            }

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
                        if ((this.tiles[i][j][key] as number) != empty) {
                            changed = true;
                            (this.tiles[i][j][key] as number) = empty;
                        }
                    }

                    // Change to filled if at least three neighbors are filled
                    else if (adjacent >= 3) {
                        if (this.tiles[i][j][key] != filled) {
                            changed = true;
                            (this.tiles[i][j][key] as number) = filled;
                        }
                    }
                }
            }
        }
    }

    // Count how many crystals we can actually get from where we start to prevent impossible levels
    private countAccessibleCrystals(base: number[], vehicles: boolean) {
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
            if (types.includes(this.tiles[y][x].type)) {
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
            count += this.tiles[space[0]][space[1]].crystals;
        });

        return count;
    }

    // Make a list of undiscovered caverns
    private findCaves(base: number[]) {
        // Mark our obstacles
        const tmap = this.createArray(this.size, this.size, -1);

        // Mark the open spaces
        const openTiles = [0, 6, 7, 8, 9, 13];
        this.spiral((x: number, y: number) => {
            if (openTiles.includes(this.tiles[y][x].type)) {
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
        let crystalCount: number = this.countAccessibleCrystals(this.base, false);
        if (crystalCount >= 14) {
            // More than enough crystals to get vehicles
            crystalCount = this.countAccessibleCrystals(this.base, true);
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
            converted_walls[y][x] = conversion[this.tiles[y][x].type];
        }, 0);

        // List undiscovered caverns
        const caveList = this.findCaves(this.base);

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
                MMtext += this.tiles[i][j].crystals + ',';
            }
            MMtext += '\n';
        }

        // Ore
        MMtext += 'ore:\n';
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                MMtext += this.tiles[i][j].ore + ',';
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
            ' energy crystals.  \n\n';
        MMtext += '}\n';

        // Briefing success
        MMtext += 'briefingsuccess{\n';
        MMtext += 'You did it \n\n';
        MMtext += '}\n';

        // Briefing failure
        MMtext += 'briefingfailure{\n';
        MMtext += "You didn't it \n\n";
        MMtext += '}\n';

        // Monster emerges
        MMtext += 'blocks{\n';

        // Emerge tiles
        let monsterType: string;
        switch (this.biome) {
            case 'rock':
                monsterType = 'CreatureRockMonster_C';
                break;
            case 'ice':
                monsterType = 'CreatureIceMonster_C';
                break;
            case 'lava':
                monsterType = 'CreatureLavaMonster_C';
                break;

            default:
                break;
        }
        this.spiral((x: number, y: number) => {
            if (this.tiles[y][x].emergeId) {
                MMtext +=
                    this.tiles[y][x].emergeId +
                    '/EventEmergeCreature:' +
                    y +
                    ',' +
                    x +
                    ',A,90.0,' +
                    monsterType +
                    ',1\n';
            }
        });

        // Trigger tiles
        this.spiral((x: number, y: number) => {
            if (this.tiles[y][x].triggerId) {
                MMtext +=
                    this.tiles[y][x].triggerId +
                    '/TriggerEnter:' +
                    y +
                    ',' +
                    x +
                    ',0.0,_,true,true\n';
            }
        });

        // Wires
        this.spiral((x: number, y: number) => {
            this.tiles[y][x].getTriggers().forEach((wire) => {
                MMtext += this.tiles[y][x].triggerId + '?' + wire.emergeId + '\n';
            });
        });

        MMtext += '}\n';

        // Script
        MMtext += 'script{\n\n}';

        return MMtext;
    }
}

export default Mapgen;
