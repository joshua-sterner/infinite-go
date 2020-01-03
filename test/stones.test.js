const child_process = require('child_process');
const db = require('./test_db.js');
const assert = require('assert');
const Stones = require('../stones.js').Stones;

const test_stone_1 = {
    x: 12,
    y: 34,
    placed_by: 'first_test_user',
    date_placed: '2019-12-13T14:13:12.345Z',
    color: 'white'
};

const test_stone_2 = {
    x: -12,
    y: -34,
    placed_by: 'second_test_user',
    date_placed: '2019-12-15T14:13:12.345Z',
    color: 'black'
};

function stones_equal(lhs, rhs) {
    return lhs.x === rhs.x &&
        lhs.y === rhs.y &&
        lhs.placed_by === rhs.placed_by &&
        lhs.date_placed === rhs.date_placed &&
        lhs.color === rhs.color;
}

function stone_in_list(stone, list) {
    return list.some((stone2) => {
        return stones_equal(stone, stone2);
    });
}

describe('Stones', () => {
    let db_connection_pool;
    let stones;
    before(() => {
        db_connection_pool = new db.Pool(db.connection_settings);
    });

    beforeEach(() => {
        // prevent psql command from warning about cascading drop
        child_process.execSync(`psql ${db.connection_url} -c "DROP TABLE IF EXISTS stones;"`);
        // need to load users test data because the stone table has
        // a foreign key referencing the usernames column in users
        child_process.execSync(`psql ${db.connection_url} -f test/users.test.pre.sql`);
        child_process.execSync(`psql ${db.connection_url} -f test/stones.test.pre.sql`);
        stones = new Stones(db_connection_pool);
    });

    describe('#get_by_rect', () => {
        it('get_by_rect({x0: 12, y0: 34, x1: 12, y1: 34}) resolves to [stone @ (12, 34)]', async function() {
            const stone_list = await stones.get_by_rect({x0: 12, y0: 34, x1: 12, y1: 34});
            assert.deepStrictEqual(stone_list, [test_stone_1]);
        });
        it('get_by_rect({x0: -12, y0: -34, x1: -12, y1: -34}) resolves to [stone @ (-12, -34)]', async function() {
            const stone_list = await stones.get_by_rect({x0: -12, y0: -34, x1: -12, y1: -34});
            assert.deepStrictEqual(stone_list, [test_stone_2]);
        });
        [{x0: -12, y0: -34, x1: 12, y1: 34},
         {x0: 12, y0: -34, x1: -12, y1: 34},
         {x0: -12, y0: 34, x1: 12, y1: -34},
         {x0: 12, y0: 34, x1: -12, y1: -34}].forEach((rect) => {
            it(`get_by_rect({x0: ${rect.x0}, y0: ${rect.y0}, x1: ${rect.x1}, y1: ${rect.y1}}) resolves to stones in rect`, async function() {
                const stone_list = await(stones.get_by_rect(rect));
                assert.equal(stone_list.length, 2);
                assert(stone_in_list(test_stone_1, stone_list));
                assert(stone_in_list(test_stone_2, stone_list));
            });
        });
        it('get_by_rect over empty rect resolves to empty list', async function() {
            const rect = {x0: -1, y0: -1, x1: 1, y1: 1};
            const stone_list = await(stones.get_by_rect(rect));
            assert.equal(stone_list.length, 0);
        });
        ['x0', 'y0', 'x1', 'y1'].forEach((field) => {
            it(`rejects when rect.${field} not provided`, async function() {
                let rect = {x0: -12, y0: -34, x1: 12, y1: 34};
                eval(`delete rect.${field}`);
                await assert.rejects(stones.get_by_rect(rect));
            });
            it(`rejects when rect.${field} not an integer`, async function() {
                let rect = {x0: -12, y0: -34, x1: 12, y1: 34};
                rect[field] = 12.34;
                await assert.rejects(stones.get_by_rect(rect));
            });
        });
        it('rejects on query error', async function() {
            const rect = {x0: -12, y0: -34, x1: 12, y1: 34};
            let stones = new Stones(db.mock_throwing_pool);
            await assert.rejects(stones.get_by_rect(rect));
        });
    });

    describe('#create', () => {
        let test_stone;
        beforeEach(() => {
            test_stone = {
                x: -123,
                y: 456,
                placed_by: 'first_test_user',
                date_placed: '4321-01-23T12:34:56.789Z',
                color: 'black'
            };
        });
        it('successfully creates stone with all fields provided', async function() {
            throw new Error('Test not implemented.');
        });
        it('successfully creates stone without provided date_placed field', async function() {
            throw new Error('Test not implemented.');
        });
        it('stone created without supplied date_placed uses current time', async function() {
            throw new Error('Test not implemented.');
        });
        ['x', 'y', 'placed_by', 'color'].forEach((field) => {
            it(`rejects when ${field} is null`, async function() {
                throw new Error('Test not implemented.');
            });
            it(`rejects when ${field} is not provided`, async function() {
                throw new Error('Test not implemented.');
            });
        });
        it('rejects when date_placed is null', async function() {
            throw new Error('Test not implemented.');
        });
        it('rejects when point is not unique', async function() {
            throw new Error('Test not implemented.');
        });
        it('rejects when username not in user table', async function() {
            throw new Error('Test not implemented.');
        });
        it('rejects when stone_color incorrect value', async function() {
            throw new Error('Test not implemented.');
        });
        it('rejects on query error', async function() {
            throw new Error('Test not implemented.');
        });
    });
    
    describe('#delete_by_point', () => {
        it('successfully deletes stone @ (12, 34)', async function() {
            throw new Error('Test not implemented.');
        });
        it('successfully deletes stone @ (-12, -34)', async function() {
            throw new Error('Test not implemented.');
        });
        it('rejects when point empty', async function() {
            throw new Error('Test not implemented.');
        });
        it('rejects on query error', async function() {
            throw new Error('Test not implemented.');
        });
    });
});
