/**
 * @typedef {object} Stone
 * @property {number} x - The x position of the stone on the board.
 * @property {number} y - The y position of the stone on the board.
 * @property {string} color - The color of this stone, either 'black' or
 * 'white'.
 * @property {string} placed_by - The username of the user who placed this
 * stone.
 * @property {Date} date_placed - The date and time of placement of this stone.
 * @property {number} captured_perimeter - The number of grid points adjacent
 * to this stone's group which belong to the oppposing team.
 * @property {number} perimeter - The total number of grid points adjacent to
 * this stone's group, including those which are occupied by the opposing team.
 */

/**
 * This class represents a database which can store and retrieve go stones.
 */
class Stones {

    constructor(db_connection_pool) {
        this.db_connection_pool = db_connection_pool;
    }

    async create(stone) {
        if (!stone.x || !stone.y || !stone.placed_by || !stone.color) {
            throw new Error('create(stone): stone must have x, y, placed_by and color fields');
        }

        const date_placed = stone.date_placed || (new Date()).toJSON();
        const db = await this.db_connection_pool.connect();

        try {
            await db.query('BEGIN');
            let res = await db.query('SELECT color, stone_group_pointer FROM stones WHERE (x,y) IN (($1 - 1, $2), ($1 + 1, $2), ($1, $2 - 1), ($1, $2 + 1))', [stone.x, stone.y]);
            const adjacent_same = res.rows.filter(x => x.color == stone.color);
            const adjacent_opponents = res.rows.filter(x => x.color != stone.color);
            let stone_group_pointer;
            if (adjacent_same.length != 0) {
                stone_group_pointer = adjacent_same[0].stone_group_pointer;
                // for each additional stone_group referenced by adjacent_same
                // >>> merge with first referenced stone_group
                //      sum captured_perimeter
                //      sum perimeter
                // update additional stone_group_pointers to point to merge destination
            } else {
                const captured_perimeter = adjacent_opponents.length;
                res = await db.query('INSERT INTO stone_groups (captured_perimeter, perimeter) VALUES ($1, 4) RETURNING id', [captured_perimeter]);
                const stone_group = res.rows[0].id;
                res = await db.query('INSERT INTO stone_group_pointers (stone_group) VALUES ($1) RETURNING id', [stone_group]);
                stone_group_pointer = res.rows[0].id;
            }
            res = await db.query('INSERT INTO stones (x, y, placed_by, date_placed, color, stone_group_pointer) VALUES ($1, $2, $3, $4, $5, $6)', [stone.x, stone.y, stone.placed_by, date_placed, stone.color, stone_group_pointer]);
            await db.query('COMMIT');
        } catch (e) {
            await db.query('ROLLBACK');
            throw e;
        }finally {
            db.release();
        }
    }

    get_by_rect(rect) {
        return new Promise((resolve, reject) => {
            if (!Number.isInteger(rect.x0) || !Number.isInteger(rect.y0) || !Number.isInteger(rect.x1) || !Number.isInteger(rect.y1)) {
                return reject(new Error('get_by_rect(rect): rect must have x0, x1, y0 and y1 fields.'));
            }
            const x_min = Math.min(rect.x0, rect.x1);
            const x_max = Math.max(rect.x0, rect.x1);
            const y_min = Math.min(rect.y0, rect.y1);
            const y_max = Math.max(rect.y0, rect.y1);
            this.db_connection_pool
                .query('SELECT x, y, placed_by, to_char(date_placed, \'YYYY-MM-DD"T"HH24:MI:SS.MSZ\') AS date_placed, color, stone_group_pointer FROM stones WHERE x BETWEEN $1 AND $2 AND y BETWEEN $3 AND $4',[x_min, x_max, y_min, y_max])
                .then((res) => {
                    resolve(res.rows);
                })
                .catch(err => reject(err));
        });
    }

    delete_by_point(point) {
        return new Promise((resolve, reject) => {
            this.db_connection_pool
                .query('DELETE FROM stones WHERE x=$1 AND y=$2', [point.x, point.y])
                .then((res) => {
                    if (res.rowCount == 0) {
                        // No stone deleted
                        return reject(new Error(`Failed to delete stone @ (${point.x}, ${point.y}).`));
                    }
                    resolve();
                })
                .catch(err => reject(err));
        });
    }
}

module.exports = {'Stones': Stones};
