class Stones {

    constructor(db_connection_pool) {
        this.db_connection_pool = db_connection_pool;
    }

    create(stone) {
    }

    get_by_rect(rect) {
        return new Promise((resolve, reject) => {
            if (!rect.x0 || !rect.y0 || !rect.x1 || !rect.y1) {
                return reject(new Error('get_by_rect(rect): rect must have x0, x1, y0 and y1 fields.'));
            }
            const x_min = Math.min(rect.x0, rect.x1);
            const x_max = Math.max(rect.x0, rect.x1);
            const y_min = Math.min(rect.y0, rect.y1);
            const y_max = Math.max(rect.y0, rect.y1);
            this.db_connection_pool
                .query('SELECT x, y, placed_by, to_char(date_placed, \'YYYY-MM-DD"T"HH24:MI:SS.MSZ\') AS date_placed, color FROM stones WHERE x BETWEEN $1 AND $2 AND y BETWEEN $3 AND $4',[x_min, x_max, y_min, y_max])
                .then((res) => {
                    resolve(res.rows);
                })
                .catch(err => reject(err));
        });
    }
    
    delete_by_point(point) {
    }
}

module.exports = {'Stones': Stones};
