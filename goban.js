class StonePlacementBuffer {

    constructor() {
        this._stones = new Map;
        this.size = 0;
        this.region_size = 512;
    }

    add(stone) {
        if (!this._stones.get(stone.x)) {
            this._stones.set(stone.x, new Map);
        }
        this._stones.get(stone.x).set(stone.y, stone);
        this.size++;
    }

    adjacent_stones(pos) {
        return {
            left: this.get({x: pos.x-1, y: pos.y}),
            right: this.get({x: pos.x+1, y: pos.y}),
            above: this.get({x: pos.x, y: pos.y+1}),
            below: this.get({x: pos.x, y: pos.y-1})
        };
    }

    get(pos) {
        if (!this._stones.get(pos.x)) {
            return null;
        }
        if (!this._stones.get(pos.x).get(pos.y)) {
            return null;
        }
        return this._stones.get(pos.x).get(pos.y);
    }

    forEach(cb) {
        for (let i of this._stones) {
            for (let j of i[1]) {
                cb(j[1]);
            }
        }
    }

    remove(pos) {
        if (this._stones.get(pos.x)) {
            if (this._stones.get(pos.x).delete(pos.y)) {
                this.size--;
                if (this._stones.get(pos.x).size == 0) {
                    this._stones.delete(pos.x);
                }
            }
        }
    }

}

class Goban {


    /**
     * Creates a Goban instance.
     *
     * @constructor
     * @param stones An object that saves stones (probably in a db).
     * @param region_size the size of the square regions in which changes are tracked.
     */
    constructor(stones, region_size=256) {
        this.stones = stones;
        this._placement_buffer = new StonePlacementBuffer;
        if (region_size <= 0) {
            throw new Error('region_size must be greater than 0');
        }
        this._region_size = region_size;
    }

    _stone_placement_blocked(stone, adjacent_stones) {
        const surrounded = adjacent_stones.left && adjacent_stones.right &&
                           adjacent_stones.above && adjacent_stones.below;
        if (surrounded) {
            return adjacent_stones.left.color != stone.color &&
                   adjacent_stones.right.color != stone.color &&
                   adjacent_stones.above.color != stone.color &&
                   adjacent_stones.below.color != stone.color;
        }
        return false;
    }

    region_size() {
        return this._region_size;
    }

    async place(stone) {
        // check if unprocessed placements block
        let adjacent_stones = this._placement_buffer.adjacent_stones(stone);
        if (this._stone_placement_blocked(stone, adjacent_stones)) {
            return;
        }

        // check if blocked when taking into account stones in db
        const stone_list = await this.stones.get_by_rect({x0: stone.x - 1, y0: stone.y - 1, x11: stone.x + 1, y1: stone.y + 1});
        stone_list.forEach((nearby_stone) => {
            if (nearby_stone.x == stone.x-1 && nearby_stone.y == stone.y) {
                adjacent_stones.left = nearby_stone;
            } else if (nearby_stone.x == stone.x+1 && nearby_stone.y == stone.y) {
                adjacent_stones.right = nearby_stone;
            } else if (nearby_stone.x == stone.x && nearby_stone.y == stone.y+1) {
                adjacent_stones.above = nearby_stone;
            } else if (nearby_stone.x == stone.x && nearby_stone.y == stone.y-1) {
                adjacent_stones.below = nearby_stone;
            }
        });

        if (this._stone_placement_blocked(stone, adjacent_stones)) {
            return;
        }

        // add to placement queue if not blocked
        this._placement_buffer.add(stone);
    }

    async retrieve(rect) {
    }

    async process_placements() {
        return new Promise((resolve, reject) => {
            this._placement_buffer.forEach((stone) => {
                this.stones.create(stone)
                    .then(() => {
                        this._placement_buffer.remove(stone);
                        if (this._placement_buffer.size == 0) {
                            resolve();
                        }
                    });
            });
            resolve();
        });
    }
    
    /**
     * @returns An iterable of changed region coordinates in the form {x0:a, y0:b x1:c, y1:d}.
     * Note that x0, y0, x1, and y1 are considered to be inside the changed region.
     */
    async process() {
        await this.process_placements();
        await this.process_captures();
        // don't need to notify clients of unplaced stones,
        //   server will notify of processing tick
        //      optimization:
        //          clients decide if they need to listen to/recieve processing tick notification...
        //          this means that clients only waiting on viewport updates, not attempted stone
        //          placements won't get unneeded packets
        //
        // However, server must know about changed viewports...
        //   could track viewports here, notify server when needed...
        //      viewports tracked in two places though, not efficient
        //   could notify server of all changes,
        //      server would need to filter through them somehow...
        //   could notify server of changed regions -- probably the best option
        //      server would need to update all viewports overlapping those regions
        //      need to define region somehow
        return;
    }

    async process_captures() {
        // retrieve list of stones considered unprocessed/processing
        // for each stone to be processed:
        //   see if it triggers any capturing...
        //     (this requires taking into account processed stones as well)
        //     get_by_rect calls should be used to fill a buffer/block/graph of stones for this process... (ignoring unprocessed stones, as those will be processed the next time around).
        //
        // do capturing, taking into account processed and unprocessed stones
        //
        // provide function to be called for each captured stone
        //   server must track captures by user, team
        // resolve to list of changed regions
        return;
    }

}

module.exports = {Goban: Goban};
