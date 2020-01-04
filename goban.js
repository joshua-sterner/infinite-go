class Goban {
    constructor(stones) {
        this.stones = stones;
    }

    place_stone(stone) {
        // stone remains unprocessed until next capture pass
        // prevent placement if no liberties (taking into account unprocessed stones)
    }

    retrieve_stones(rect) {
    }

    process_captures() {
        // retrieve list of stones considered unprocessed/processing
        // for each stone to be processed:
        //   see if it triggers any capturing...
        //     (this requires taking into account processed stones as well)
        //     get_by_rect calls should be used to fill a buffer/block/graph of stones for this process... (ignoring unprocessed stones, as those will be processed the next time around).
        //
        // do capturing, taking into account processed and unprocessed stones
        //
        // resolve to processed stone points
    }

}

module.exports = {Goban: Goban};
