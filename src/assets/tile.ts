class Tile {
    constructor(y: number, x: number) {
        this.x = x;
        this.y = y;
        this.type = -1;

        this.wall = -1;
        this.solid = -1;
        this.crystals = -1;
        this.ore = 0;
        this.recharge = -1;

        this.landslide = -1;
        this.erosion = -1;
        this.slug = 9;
    }

    public x: number;
    public y: number;
    public type: number;

    public wall: number;
    public solid: number;
    public crystals: number;
    public ore: number;
    public recharge: number;

    public landslide: number;
    public erosion: number;
    public slug: number;
}

export default Tile;
