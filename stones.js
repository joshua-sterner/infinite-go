/**
 * @typedef {object} Stone
 * @property {number} x - The x position of the stone on the board.
 * @property {number} y - The y position of the stone on the board.
 * @property {string} color - The color of this stone, either 'black' or
 * 'white'.
 * @property {string} placed_by - The username of the user who placed this
 * stone.
 * @property {string} processed - The state of this stone in the capture pass.
 * One of:
 * - 'unprocessed' - Placement of this stone has not been taken into account by
 * a capture pass.
 *
 * - 'processing' - placement of this stone is being taken into account by the
 * current capture pass.
 *
 * - 'processed' - placement of this stone has been taken into account by a
 * capture pass.
 * @property {Date} date_placed - The date and time of placement of this stone.
 */

/**
 * This class represents a database which can store and retrieve go stones.
 */
class Stones {

    constructor(db_connection_pool) {
        this.db_connection_pool = db_connection_pool;
    }

    create(stone) {
        const processed = stone.processed || 'unprocessed';
        const date_placed = stone.date_placed || (new Date()).toJSON();
        return new Promise((resolve, reject) => {
            if (!stone.x || !stone.y || !stone.placed_by || !stone.color) {
                return reject(new Error('create(stone): stone must have x, y, placed_by and color fields'));
            }
            this.db_connection_pool
                .query('INSERT INTO stones (x, y, placed_by, date_placed, color, processed) VALUES ($1, $2, $3, $4, $5, $6)', [stone.x, stone.y, stone.placed_by, date_placed, stone.color, processed])
                .then(() => {
                    return resolve();
                })
                .catch(err => reject(err));
        });
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
                .query('SELECT x, y, placed_by, to_char(date_placed, \'YYYY-MM-DD"T"HH24:MI:SS.MSZ\') AS date_placed, color, processed FROM stones WHERE x BETWEEN $1 AND $2 AND y BETWEEN $3 AND $4',[x_min, x_max, y_min, y_max])
                .then((res) => {
                    resolve(res.rows);
                })
                .catch(err => reject(err));
        });
    }
    
    get_unprocessed_for_processing() {
        return new Promise((resolve, reject) => {
            this.db_connection_pool
                .query('UPDATE stones SET processed=\'processing\' WHERE processed!=\'processed\' RETURNING x, y, placed_by, to_char(date_placed, \'YYYY-MM-DD"T"HH24:MI:SS.MSZ\') AS date_placed, color, processed')
                .then((res) => {
                    resolve(res.rows);
                })
                .catch(err => reject(err));
        });
    }

    set_processing_to_processed() {
        return new Promise((resolve, reject) => {
            this.db_connection_pool
                .query('UPDATE stones SET processed=\'processed\' WHERE processed=\'processing\'')
                .then(() => {
                    resolve();
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
