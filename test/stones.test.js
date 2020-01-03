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

describe('Stones', () => {
    let db_connection_pool;
    let stones;
    before(() => {
        db_connection_pool = new db.Pool(db.connection_settings);
    });

    beforeEach(() => {
        // prevent psql command from warning about cascading drop
        child_process.execSync(`psql ${db.connection_url} -c "DROP TABLE stones;"`);
        // need to load users test data because the stone table has
        // a foreign key referencing the usernames column in users
        child_process.execSync(`psql ${db.connection_url} -f test/users.test.pre.sql`);
        child_process.execSync(`psql ${db.connection_url} -f test/stones.test.pre.sql`);
        stones = new Stones(db_connection_pool);
    });

    describe('#get_by_rect', () => {
        it('get_by_rect({x0: 12, y0: 34, x1: 12, y1: 34}) resolves to [stone @ (12, 34)]', async function() {
            const stone = await stones.get_by_rect({x0: 12, y0: 34, x1: 12, y1: 34});
        });
        it('get_by_rect({x0: -12, y0: -34, x1: -12, y1: -34}) resolves to [stone @ (12, 34)]', async function() {
            throw new Error('Test not implemented.');
        });
        [{x0: -12, y0: -34, x1: 12, y1: 34},
         {x0: 12, y0: -34, x1: -12, y1: 34},
         {x0: -12, y0: 34, x1: 12, y1: -34},
         {x0: 12, y0: 34, x1: -12, y1: -34}].forEach((rect) => {
            it(`get_by_rect({x0: ${rect.x0}, y0: ${rect.y0}, x1: ${rect.x1}, y1: ${rect.y1}}) resolves to stones in rect`, async function() {
                throw new Error('Test not implemented.');
            });
        });
        it('get_by_rect over empty rect resolves to empty list', async function() {
            throw new Error('Test not implemented.');
        });
        ['x0', 'y0', 'x1', 'y1'].forEach((field) => {
            it(`rejects when rect.${field} not provided`, async function() {
                throw new Error('Test not implemented.');
            });
            it(`rejects when rect.${field} not an integer`, async function() {
                throw new Error('Test not implemented.');
            });
        });
        it('rejects on query error', async function() {
            throw new Error('Test not implemented.');
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
