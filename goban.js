class Goban {
    constructor(stones) {
        this.stones = stones;
    }

    place_stone(stone) {
        // stone remains unprocessed until next capture pass
        // prevent placement if no liberties (taking into account unprocessed stones)
    }

    retrieve_stones(rect) {
        // only retrieves processed stones
    }

    process_captures() {
        // retrieve list of stones considered unprocessed
        //
        // do capturing, taking into account processed and unprocessed stones
        //
        // resolve to processed stone points
    }

}
