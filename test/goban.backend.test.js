const assert = require('assert');
const Goban = require('../goban.js').Goban;

//TODO implement ko fight rule...


class MockStones {

    constructor() {
        this.reset();
    }

    create(stone) {
        this.create_calls.push(stone);
        return new Promise((resolve, reject) => {
            if (this.reject_from_create) {
                return reject();
            }
            resolve();
        });
    }

    reset() {
        this.create_calls = [];
        this.reject_from_create = false;
        this.get_by_rect_calls = [];
        this.reject_from_get_by_rect = false;
        this.reject_from_get_unprocessed_for_processing = false;
        this.reject_from_set_processing_to_processed = false;
        this.set_processing_to_processed_calls = 0;
        this.delete_by_point_calls = [];
        this.reject_from_delete_by_point = false;
        this.stone_list = [];
    }
    
    get_by_rect(rect) {
        this.get_by_rect_calls.push(rect);
        return new Promise((resolve, reject) => {
            if (this.reject_from_get_by_rect) {
                return reject();
            }

            const in_rect = function(rect) {
                return function(stone) {
                    const x_min = Math.min(rect.x0, rect.x1);
                    const x_max = Math.max(rect.x0, rect.x1);
                    const y_min = Math.min(rect.y0, rect.y1);
                    const y_max = Math.max(rect.y0, rect.y1);
                    return stone.x >= x_min && stone.x <= x_max &&
                           stone.y >= y_min && stone.y <= y_max;
                };
            };

            const stones = this.stone_list.filter(in_rect(rect));

            resolve(stones);
        });
    }

    get_unprocessed_for_processing() {
        return new Promise((resolve, reject) => {
            if (this.reject_from_get_unprocessed_for_processing) {
                return reject();
            }
            return this.stone_list.filter((stone) => {
                return stone.processed != 'processed';
            });
        });
    }

    set_processing_to_processed() {
        this.set_processing_to_processed_calls += 1;
        return new Promise((resolve, reject) => {
            if (this.reject_from_set_processing_to_processed) {
                return reject();
            }
            resolve();
        });
    }

    delete_by_point(point) {
        this.delete_by_point_calls.push(point);
        return new Promise((resolve, reject) => {
            if (this.reject_from_delete_by_point) {
                return reject();
            }
            resolve();
        });
    }

}


describe('Goban (backend)', () => {
    let stones;
    let goban;
    beforeEach(() => {
        stones = new MockStones();
        goban = new Goban(stones);
    });
    describe('#place_stone', () => {
        [{x: -3, y: -4}, {x: 1, y: 2}].forEach((point) => {
            const color = 'black';
            const opponent_color = 'white';
            describe(`place ${color} stone @ (${point.x}, ${point.y})`, () => {
                it(`with no adjacent stones`, async function() {
                    const stone = {x: point.x, y: point.y, color: 'black'};
                    await goban.place(stone);
                    await goban.process_placements();
                    assert.equal(stones.create_calls.length, 1);
                    assert.deepStrictEqual(stones.create_calls[0], stone);
                });
                it(`with 4 adjacent ${color} stones places stone`, async function() {
                    const stone = {x: point.x, y: point.y, color: 'black'};
                    await goban.place({x: stone.x-1, y: stone.y, color: color});
                    await goban.place({x: stone.x+1, y: stone.y, color: color});
                    await goban.place({x: stone.x, y: stone.y-1, color: color});
                    await goban.place({x: stone.x, y: stone.y+1, color: color});
                    await goban.place(stone);
                    await goban.process_placements();
                    assert.equal(stones.create_calls.length, 5);
                    assert.equal(stones.create_calls.filter(e => {
                        return e.x === stone.x && e.y === stone.y && e.color === stone.color;
                    }).length, 1);
                });
                it(`with 4 adjacent ${opponent_color} stones does not place stone when process called before final stone placement`, async function() {
                    const stone = {x: point.x, y: point.y, color: 'black'};
                    await goban.place({x: stone.x-1, y: stone.y, color: opponent_color});
                    await goban.place({x: stone.x+1, y: stone.y, color: opponent_color});
                    await goban.place({x: stone.x, y: stone.y-1, color: opponent_color});
                    await goban.place({x: stone.x, y: stone.y+1, color: opponent_color});
                    await goban.process_placements();
                    await goban.place(stone);
                    assert.equal(stones.create_calls.length, 4);
                    assert(!stones.create_calls.some(e => {
                        return e.x === stone.x && e.y === stone.y && e.color === stone.color;
                    }));
                });
                it(`with 4 adjacent ${opponent_color} stones does not place stone when process called after final stone placement`, async function() {
                    const stone = {x: point.x, y: point.y, color: 'black'};
                    await goban.place({x: stone.x-1, y: stone.y, color: opponent_color});
                    await goban.place({x: stone.x+1, y: stone.y, color: opponent_color});
                    await goban.place({x: stone.x, y: stone.y-1, color: opponent_color});
                    await goban.place({x: stone.x, y: stone.y+1, color: opponent_color});
                    await goban.place(stone);
                    await goban.process_placements();
                    assert.equal(stones.create_calls.length, 4);
                    assert(!stones.create_calls.some(e => {
                        return e.x === stone.x && e.y === stone.y && e.color === stone.color;
                    }));
                });
            });
        });
        it('place_stone rejects on db error', async function() {
            const stone = {x: 0, y: 0, color: 'black'};
            stones.reject_from_get_by_rect = true;
            await assert.rejects(goban.place(stone));
        });
    });
    
    describe('#constructor', () => {
        it('sets default region size to 256', () => {
            assert.equal(goban.region_size(), 256);
        });
        it('sets custom region size', () => {
            let goban = new Goban(stones, 123);
            assert.equal(goban.region_size(), 123);
        });
        it('can set custom region size to 1', () => {
            let goban = new Goban(stones, 1);
            assert.equal(goban.region_size(), 1);
        });
        it('throws when provided region size is 0', () => {
            assert.throws(() => {
                let goban = new Goban(stones, 0);
            });
        });
        it('throws when provided region size is less than 0', () => {
            assert.throws(() => {
                let goban = new Goban(stones, -1);
            });
        });
    });

    describe('#process', () => {
        //TODO captures...
        describe('returns an iterable of changed region coordinates', () => {
            describe('region_size: 1', () => {
                it('no changes', async function() {
                    let empty = true;
                    let x = await goban.process();
                    for (i of x) {
                        empty = false;
                    }
                    assert(empty);
                });
            });
        });
    });

    //retrieve_stones calls get_by_rect

    //process_captures calls stones.get_unprocessed_for_processing (implicit)
    //
    //process_captures calls stones.delete to delete captured stones
    // (implicit, use stones.delete mock to ensure proper deletion/capture of stones in different cases)
    //
});
