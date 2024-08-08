class Tile {
    constructor(y: number, x: number) {
        this.x = x;
        this.y = y;
    }

    public x: number;
    public y: number;
    public type: number = -1;

    public wall: number = -1;
    public solid: number = -1;
    public crystals: number = -1;
    public ore: number = -1;
    public recharge: number = -1;

    public filled: boolean = false;
    public flooded: boolean = false;

    public landslide: number = 0;
    public erosion: number = -1;
    public slug: number = 0;
    public monster: number = 0;

    private monsterTriggers: Tile[] = [];
    public triggerId: number = 0;
    public emergeId: number = 0;

    public addTrigger(tile: Tile): void {
        this.monsterTriggers.push(tile);
    }

    public getTriggers(): Tile[] {
        return this.monsterTriggers;
    }
}

export default Tile;
