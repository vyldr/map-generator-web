class Tile {
    constructor(y: number, x: number) {
        this.x = x;
        this.y = y;
        this.type = -1;

        this.wall = -1;
        this.solid = -1;
        this.crystals = -1;
        this.ore = -1;
        this.recharge = -1;

        this.landslide = 0;
        this.erosion = -1;
        this.slug = 0;
        this.monster = 0;

        this.monsterTriggers = [];
        this.triggerId = 0;
        this.emergeId = 0;
    }

    public x: number;
    public y: number;
    public type: number;

    public wall: number;
    public solid: number;
    public crystals: number;
    public ore: number;
    public recharge: number;

    public filled: boolean = false;

    public landslide: number;
    public erosion: number;
    public slug: number;
    public monster: number;

    private monsterTriggers: Tile[];
    public triggerId: number;
    public emergeId: number;

    public addTrigger(tile: Tile): void {
        this.monsterTriggers.push(tile);
    }

    public getTriggers(): Tile[] {
        return this.monsterTriggers;
    }
}

export default Tile;
