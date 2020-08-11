const child_process = require('child_process');
const db = require('./test_db.js');
const assert = require('assert');
const Stones = require('../stones.js').Stones;
const timestamps_equal = require('./util.js').timestamps_equal;

const test_stone_1 = {
    x: 12,
    y: 34,
    placed_by: 'first_test_user',
    date_placed: '2019-12-13T14:13:12.345Z',
    color: 'white',
    processed: 'processed'
};

const test_stone_2 = {
    x: -12,
    y: -34,
    placed_by: 'second_test_user',
    date_placed: '2019-12-15T14:13:12.345Z',
    color: 'black',
    processed: 'processing'
};

const test_stone_3 = {
    x: -123,
    y: -456,
    placed_by: 'first_test_user',
    date_placed: '2019-12-15T14:13:12.345Z',
    color: 'white',
    processed: 'unprocessed'
};

const test_stone_4 = {
    x: -456,
    y: -789,
    placed_by: 'second_test_user',
    date_placed: '2019-12-15T14:13:12.345Z',
    color: 'white',
    processed: 'processing'
};

/**
 * @param lhs
 * @param rhs
 */
function stones_equal(lhs, rhs) {
    return lhs.x === rhs.x &&
        lhs.y === rhs.y &&
        lhs.placed_by === rhs.placed_by &&
        lhs.date_placed === rhs.date_placed &&
        lhs.color === rhs.color &&
        lhs.processed === rhs.processed;
}

/**
 * @param stone
 * @param list
 */
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
        child_process.execSync(`psql -c "DROP TABLE IF EXISTS stones;" ${db.connection_url}`);
        // need to load users test data because the stone table has
        // a foreign key referencing the usernames column in users
        child_process.execSync(`psql -f test/users.test.pre.sql ${db.connection_url}`);
        child_process.execSync(`psql -f test/stones.test.pre.sql ${db.connection_url}`);
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
        let test_stone_5;
        beforeEach(() => {
            test_stone_5 = {
                x: -123,
                y: 456,
                placed_by: 'first_test_user',
                date_placed: '4321-01-23T12:34:56.789Z',
                color: 'black',
                processed: 'unprocessed'
            };
        });
        it('successfully creates stone with all fields provided and processed set to unprocessed', async function() {
            await stones.create(test_stone_5);
            const stone_list = await stones.get_by_rect({x0: -123, y0: 456, x1: -123, y1: 456});
            assert.equal(stone_list.length, 1);
            assert.deepStrictEqual(stone_list[0], test_stone_5);
        });
        it('successfully creates stone with all fields provided and processed set to to processed', async function() {
            test_stone_5.processed = 'processed';
            await stones.create(test_stone_5);
            const stone_list = await stones.get_by_rect({x0: -123, y0: 456, x1: -123, y1: 456});
            assert.equal(stone_list.length, 1);
            assert.deepStrictEqual(stone_list[0], test_stone_5);
        });
        it('successfully creates stone at same x position as existing stone', async function() {
            test_stone_5.x = test_stone_1.x;
            await stones.create(test_stone_5);
            const stone_list = await stones.get_by_rect({x0: test_stone_1.x, y0: 456, x1: test_stone_1.x, y1: 456});
            assert.equal(stone_list.length, 1);
            assert.deepStrictEqual(stone_list[0], test_stone_5);
        });
        it('successfully creates stone at same y position as existing stone', async function() {
            test_stone_5.y = test_stone_1.y;
            await stones.create(test_stone_5);
            const stone_list = await stones.get_by_rect({x0: -123, y0: test_stone_1.y, x1: -123, y1: test_stone_1.y});
            assert.equal(stone_list.length, 1);
            assert.deepStrictEqual(stone_list[0], test_stone_5);
        });
        it('successfully creates stone without provided date_placed field', async function() {
            delete test_stone_5.date_placed;
            await stones.create(test_stone_5);
            const stone_list = await stones.get_by_rect({x0: -123, y0: 456, x1: -123, y1: 456});
            assert.equal(stone_list.length, 1);
            test_stone_5.date_placed = stone_list[0].date_placed;
            assert.deepStrictEqual(stone_list[0], test_stone_5);
        });
        it('stone created without supplied date_placed uses current time', async function() {
            delete test_stone_5.date_placed;
            const now = new Date();
            await stones.create(test_stone_5);
            const stone_list = await stones.get_by_rect({x0: -123, y0: 456, x1: -123, y1: 456});
            assert(timestamps_equal(stone_list[0].date_placed, now.toJSON()));
        });
        it('stone created without supplied processed field sets processed to unprocessed', async function() {
            delete test_stone_5.processed;
            await stones.create(test_stone_5);
            const stone_list = await stones.get_by_rect({x0: -123, y0: 456, x1: -123, y1: 456});
            assert.equal(stone_list[0].processed, 'unprocessed');
        });
        ['x', 'y', 'placed_by', 'color'].forEach((field) => {
            it(`rejects when ${field} is null`, async function() {
                test_stone_5[field] = null;
                await assert.rejects(stones.create(test_stone_5));
            });
            it(`rejects when ${field} is not provided`, async function() {
                eval(`delete test_stone_5.${field};`);
                await assert.rejects(stones.create(test_stone_5));
            });
        });
        it('rejects when point is not unique', async function() {
            test_stone_5.x = test_stone_1.x;
            test_stone_5.y = test_stone_1.y;
            await assert.rejects(stones.create(test_stone_5));
        });
        it('rejects when username not in user table', async function() {
            test_stone_5.placed_by = 'non-existant username';
            await assert.rejects(stones.create(test_stone_5));
        });
        it('rejects when stone_color incorrect value', async function() {
            test_stone_5.color = 'red';
            await assert.rejects(stones.create(test_stone_5));
        });
        it('rejects on query error', async function() {
            let stones = new Stones(db.mock_throwing_pool);
            await assert.rejects(stones.create(test_stone_5));
        });
    });
    
    describe('#delete_by_point', () => {
        it('successfully deletes stone @ (12, 34)', async function() {
            await stones.delete_by_point({x: 12, y: 34});
            const stone_list = await stones.get_by_rect({x0:12, y0: 34, x1: 12, y1: 34});
            assert.equal(stone_list.length, 0);

        });
        it('successfully deletes stone @ (-12, -34)', async function() {
            await stones.delete_by_point({x: -12, y: -34});
            const stone_list = await stones.get_by_rect({x0:-12, y0: -34, x1: -12, y1: -34});
            assert.equal(stone_list.length, 0);
        });
        it('rejects when point empty', async function() {
            await assert.rejects(stones.delete_by_point({x: 0, y: 0}));
        });
        it('rejects on query error', async function() {
            let stones = new Stones(db.mock_throwing_pool);
            await assert.rejects(stones.delete_by_point({x: 12, y: 34}));
        });
    });

    describe('#get_unprocessed_for_processing', () => {
        it('retrieves all unprocssed stones', async function() {
            const  stone_list = await stones.get_unprocessed_for_processing();
            assert.equal(stone_list.length, 3);
            let stone_3 = Object.assign({}, test_stone_3);
            stone_3.processed = 'processing';
            assert.equal(stone_list.length, 3);
            assert(stone_in_list(test_stone_2, stone_list));
            assert(stone_in_list(stone_3, stone_list));
            assert(stone_in_list(test_stone_4, stone_list));
        });
        it('sets all retrieved stones as processing', async function() {
            await stones.get_unprocessed_for_processing();
            const stone_2 = (await stones.get_by_rect({x0: -12, y0: -34, x1: -12, y1: -34}))[0];
            const stone_3 = (await stones.get_by_rect({x0: -123, y0: -456, x1: -123, y1: -456}))[0];
            const stone_4 = (await stones.get_by_rect({x0: -456, y0: -789, x1: -456, y1: -789}))[0];
            assert.equal(stone_2.processed, 'processing');
            assert.equal(stone_3.processed, 'processing');
            assert.equal(stone_4.processed, 'processing');
        });
        it('rejects on query error', async function() {
            let stones = new Stones(db.mock_throwing_pool);
            await assert.rejects(stones.get_unprocessed_for_processing());
        });
    });

    describe('#set_processing_to_processed', () => {
        it('sets processing stones to processed', async function() {
            await stones.set_processing_to_processed();
            const stone_2 = (await stones.get_by_rect({x0: -12, y0: -34, x1: -12, y1: -34}))[0];
            const stone_4 = (await stones.get_by_rect({x0: -456, y0: -789, x1: -456, y1: -789}))[0];
            assert.equal(stone_2.processed, 'processed');
            assert.equal(stone_4.processed, 'processed');
        });
        it('rejects on query error', async function() {
            let stones = new Stones(db.mock_throwing_pool);
            await assert.rejects(stones.set_processing_to_processed());
        });
    });

});
