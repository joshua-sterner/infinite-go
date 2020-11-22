const assert = require('assert');
const Goban = require('../goban.js').Goban;
const Stones = require('../stones.js').Stones;
const sinon = require('sinon');

describe('Goban (backend)', function() {
    let stones;
    let goban;
    beforeEach(() => {
        stones = sinon.createStubInstance(Stones);
        goban = new Goban(stones);
    });

    describe('place', function() {
        it('Resolves to false when attempting to place on existing stone.', async function() {
            stones.get_by_rect.resolves([{x: -3, y: 4, color: 'white'}]);
            let result = await goban.place({x: -3, y: 4, color: 'black'});
            assert.equal(result, false);
        });
        it('Does not place stone when attempting to place on existing stone.', async function() {
            stones.get_by_rect.resolves([{x: -3, y: 4, color: 'white'}]);
            await goban.place({x: -3, y: 4, color: 'black'});
            assert.equal(stones.create.notCalled, true);
        });
        it('Resolves to false when surrounded by opposing color.', async function() {
            stones.get_by_rect.resolves([
                {x: -3, y: 4, color: 'white'},
                {x: -2, y: 5, color: 'white'},
                {x: -2, y: 3, color: 'white'},
                {x: -1, y: 4, color: 'white'}]);
            let result = await goban.place({x: -2, y: 4, color: 'black'});
            assert.equal(result, false);
        });
        it('Does not place stone when surrounded by opposing color.', async function() {
            stones.get_by_rect.resolves([
                {x: -3, y: 4, color: 'white'},
                {x: -2, y: 5, color: 'white'},
                {x: -2, y: 3, color: 'white'},
                {x: -1, y: 4, color: 'white'}]);
            await goban.place({x: -2, y: 4, color: 'black'});
            assert.equal(stones.create.notCalled, true);
        });
        it('Resolves to true when surrounded by matching color.', async function() {
            stones.get_by_rect.resolves([
                {x: -3, y: 4, color: 'white'},
                {x: -2, y: 5, color: 'white'},
                {x: -2, y: 3, color: 'white'},
                {x: -1, y: 4, color: 'white'}]);
            stones.create.resolves();
            let result = await goban.place({x: -2, y: 4, color: 'white'}, true);
            assert.equal(result, true);
        });
        it('Places stone when surrounded by matching color.', async function() {
            stones.get_by_rect.resolves([
                {x: -3, y: 4, color: 'white'},
                {x: -2, y: 5, color: 'white'},
                {x: -2, y: 3, color: 'white'},
                {x: -1, y: 4, color: 'white'}]);
            let stone = {x: -2, y: 4, color: 'white'};
            stones.create.resolves();
            await goban.place(stone, true);
            let expected = {x: -2, y: 4, color: 'white', processed: 'unprocessed'};
            assert.deepStrictEqual(stones.create.firstCall.firstArg, expected);
            assert.equal(stone.processed, undefined);
        });
    });

    describe('capture_pass', function() {
    });
});
