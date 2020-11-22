/**
 * This class represents a Goban (Go Board), and is responsible for handling the
 * rules of stone placement and capture.
 */
class Goban {

    #stones;

    /**
     * Creates a Goban instance.
     *
     * @class
     * @param stones An object that saves stones (probably in a db).
     */
    constructor(stones) {
        this.#stones = stones;
    }

    /**
     * Retrieves a list of the stones within a specified area of the game board.
     * @param {Rect} rect - The region from which to retrieve stones.
     * @returns {Promise.<[Stone]>} - Resolves to a list of Stones within the
     * region (boundary-inclusive).
     * @returns {Promise.<Error>} - Rejects with Error when unable to retrieve
     * stones.
     */
    async retrieve(rect) {
        return this.#stones.get_by_rect(rect);
    }

    /**
     * Places a stone on the board.
     *
     * @param {Stone} stone - The stone to place on the board.
     * @returns {Promise.<bool>} - Resolves to true if placement was successful,
     * and false if the attempted stone placement is not allowed.
     * @returns {Promise.<Error>} - Rejects with an Error when unable to
     * attempt stone placement.
     */
    async place(stone) {
        const x = stone.x;
        const y = stone.y;
        let rect = {x0: x - 1, y0: y - 1, x1: x + 1, y1: y + 1};
        let nearby_stones = await this.#stones.get_by_rect(rect);
        let opponent_left = false;
        let opponent_right = false;
        let opponent_above = false;
        let opponent_below = false;
        for (let i of nearby_stones) {
            if (i.x == x && i.y == y) {
                return false;
            }
            if (i.x == x - 1 && i.y == y && i.color != stone.color) {
                opponent_left = true;
            }
            if (i.x == x + 1 && i.y == y && i.color != stone.color) {
                opponent_right = true;
            }
            if (i.x == x && i.y == y + 1 && i.color != stone.color) {
                opponent_above = true;
            }
            if (i.x == x && i.y == y - 1 && i.color != stone.color) {
                opponent_below = true;
            }
        }
        if (opponent_left && opponent_right && opponent_above && opponent_below) {
            return false;
        }
        stone = Object.assign({}, stone);
        stone.processed = 'unprocessed';
        await this.#stones.create(stone);
        return true;
    }

    /**
     * Identifies, removes, and returns captured stones from the board.
     *
     * @returns {Promise.<[Stone]>} - Resolves to a list of captured stones.
     * @returns {Promise.<[Error]>} - Rejects with an Error if the capture pass
     * failed.
     */
    async capture_pass() {
        // get ids of capturable stone groups
        // retrieve & remove captured stones
    }

}

module.exports = {Goban: Goban};
