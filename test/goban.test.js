const fs = require('fs');
const assert = require('assert');

class MockWindow {
    constructor() {
        this.reset();
    }

    reset() {
        this.requestAnimationFrameCalls = [];
    }

    requestAnimationFrame(cb) {
        this.requestAnimationFrameCalls.push(cb);
    }
}

const window = new MockWindow();

// Loading the Goban class definition this way because I don't want to add node.js
//  specific code to the front-end code.
const Goban = function() {
    let goban_class;
    eval(fs.readFileSync('static/goban.js').toString() + "; goban_class = Goban;");
    return goban_class;
}();

class MockCanvas {
    constructor() {
    }

    reset() {
        this.event_listeners = {};
    }

    addEventListener(event_type, cb) {
        if (!this.event_listeners[event_type]) {
            this.event_listeners[event_type] = [];
        }
        this.event_listeners[event_type].push(cb);
    }

    getContext() {
        //TODO start testing drawing methods
        // context is only used by drawing methods, which are not being tested here.
        return null;
    }

}

describe('Goban', () => {

    const canvas = new MockCanvas();
    const window = new MockWindow();
    let goban;

    beforeEach(() => {
        canvas.reset();
        window.reset();
        goban = new Goban(canvas);
    });

    describe('constructor', () => {
        ['mousedown', 'mouseup', 'mouseout', 'mousemove', 'touchstart', 'touchend', 'touchmove'].forEach((event_type) => {
            it(`adds ${event_type} event listener` , () => {
                assert.equal(canvas.event_listeners[event_type].length, 1);
            });
        });
        it('sets initial_touch_position to -1024,-1024 (far offscreen value)', () => {
            assert.equal(goban._initial_touch_position.x, -1024);
            assert.equal(goban._initial_touch_position.y, -1024);
        });
        it('sets initial offset to 0,0', () => {
            assert(goban.offset);
            assert.equal(goban.offset.x, 0);
            assert.equal(goban.offset.y, 0);
        });
    });

    describe('Event Listeners', () => {
        beforeEach(() => {

            // set up _handle_press spy
            goban._handle_press_calls = [];
            const _handle_press = goban._handle_press;
            goban._handle_press = function(x, y) {
                goban._handle_press_calls.push([x, y]);
                _handle_press.call(goban, x, y);
            };

            // set up _handle_release spy
            goban._handle_release_calls = [];
            const _handle_release = goban._handle_release;
            goban._handle_release = function(x, y) {
                goban._handle_release_calls.push([x, y]);
                _handle_release.call(goban, x, y);
            };

            // set up _handle_move spy
            goban._handle_move_calls = [];
            const _handle_move = goban._handle_move;
            goban._handle_move = function(x, y) {
                goban._handle_move_calls.push([x, y]);
                _handle_move.call(goban, x, y);
            };

            // set up _handle_out spy
            goban._handle_out_calls = 0;
            const _handle_out = goban._handle_out;
            goban._handle_out = function() {
                goban._handle_out_calls++;
                _handle_out.call(goban);
            };
        });
        describe('mousedown', () => {
            it('calls _handle_press with correct coordinates', () => {
                canvas.event_listeners['mousedown'][0]({clientX: 123, clientY: 456});
                assert.equal(goban._handle_press_calls.length, 1);
                assert.equal(goban._handle_press_calls[0][0], 123);
                assert.equal(goban._handle_press_calls[0][1], 456);
            });
        });
        describe('mouseup', () => {
            it('calls _handle_release with correct coordinates', () => {
                canvas.event_listeners['mouseup'][0]({clientX: 123, clientY: 456});
                assert.equal(goban._handle_release_calls.length, 1);
                assert.equal(goban._handle_release_calls[0][0], 123);
                assert.equal(goban._handle_release_calls[0][1], 456);
            });
        });
        describe('mousemove', () => {
            it('calls _handle_move with correct coordinates', () => {
                canvas.event_listeners['mousemove'][0]({clientX: 123, clientY: 456});
                assert.equal(goban._handle_move_calls.length, 1);
                assert.equal(goban._handle_move_calls[0][0], 123);
                assert.equal(goban._handle_move_calls[0][1], 456);
            });
        });
        describe('mouseout', () => {
            it('calls _handle_out', () => {
                canvas.event_listeners['mouseout'][0]();
                assert.equal(goban._handle_out_calls, 1);
            });
        });
        describe('touch events', () => {
            const touch = {clientX: 123, clientY: 456, identifier: 789};
            const touch2 = {clientX: 321, clientY: 654, identifier: 987};
            const single_touch_event = {touches: [touch]};
            const double_touch_event = {touches: [touch, touch2]};
            describe('touchstart', () => {
                it('calls _handle_press with correct coordinates when touches.length == 1', () => {
                    canvas.event_listeners['touchstart'][0](single_touch_event);
                    assert.equal(goban._handle_press_calls.length, 1);
                    assert.equal(goban._handle_press_calls[0][0], 123);
                    assert.equal(goban._handle_press_calls[0][1], 456);
                });
                it('calls _handle_out when touches.length != 1', () => {
                    canvas.event_listeners['touchstart'][0](double_touch_event);
                    assert.equal(goban._handle_out_calls, 1);
                });
                it('doesn\'t call _handle_press when touches.length != 1', () => {
                    canvas.event_listeners['touchstart'][0](double_touch_event);
                    assert.equal(goban._handle_press_calls.length, 0);
                });
            });
            describe('touchend', () => {
                it('calls _handle_release with correct coordinates when single touch ends', () => {
                    const touch_event = {touches: [], changedTouches: [touch]};
                    canvas.event_listeners['touchend'][0](touch_event);
                    assert.equal(goban._handle_release_calls.length, 1);
                    assert.equal(goban._handle_release_calls[0][0], 123);
                    assert.equal(goban._handle_release_calls[0][1], 456);
                });
                it('doesn\'t call _handle_release when one of two touches end', () => {
                    const touch_event = {touches: [touch, touch2], changedTouches: [touch]};
                    canvas.event_listeners['touchend'][0](touch_event);
                    assert.equal(goban._handle_release_calls.length, 0);
                });
            });
            describe('touchmove', () => {
                it('calls _handle_move with correct coordinates when touches.length == 1', () => {
                    canvas.event_listeners['touchmove'][0](single_touch_event);
                    assert.equal(goban._handle_move_calls.length, 1);
                    assert.equal(goban._handle_move_calls[0][0], 123);
                    assert.equal(goban._handle_move_calls[0][1], 456);
                });
                it('doesn\'t call _handle_move when touches.length != 1', () => {
                    canvas.event_listeners['touchmove'][0](double_touch_event);
                    assert.equal(goban._handle_move_calls.length, 0);
                });
            });
            describe('touchcancel', () => {
                it('calls _handle_out when touches.length == 1', () => {
                    canvas.event_listeners['touchcancel'][0](single_touch_event);
                    assert.equal(goban._handle_out_calls, 1);
                });
                it('doesn\'t call _handle_out when touches.length != 1', () => {
                    canvas.event_listeners['touchcancel'][0](double_touch_event);
                    assert.equal(goban._handle_out_calls, 0);
                });
            });
        });
    });

    describe('panning', () => {
        it('move after press pans', () => {
            const expected_offset = {x: goban.offset.x + 3, y: goban.offset.y + 4};
            goban._handle_press(1, 2);
            goban._handle_move(4, 6);
            assert.deepStrictEqual(goban.offset, expected_offset);
        });
        it('move before press doesn\'t pan', () => {
            const initial_offset = {x: goban.offset.x, y: goban.offset.y};
            goban._handle_move(3,4);
            assert.deepStrictEqual(goban.offset, initial_offset);
        });
        it('move after out after press doesn\'t pan', () => {
            const initial_offset = {x: goban.offset.x, y: goban.offset.y};
            goban._handle_press(1, 2);
            goban._handle_out();
            goban._handle_move(3, 4);
            assert.deepStrictEqual(goban.offset, initial_offset);
        });
        it('move after release after press doesn\'t pan', () => {
            const initial_offset = {x: goban.offset.x, y: goban.offset.y};
            goban._handle_press(1, 2);
            goban._handle_release(1, 2);
            goban._handle_move(3, 4);
            assert.deepStrictEqual(goban.offset, initial_offset);
        });
    });

    describe('tap', () => {
        //TODO decide how to test tap vs pan threshold.
        //TODO decide how to take pan offset into account for these tests.
        it('tap as white on empty grid point places unconfirmed white stone', () => {
        });
        it('tap as black on empty grid point places unconfirmed black stone', () => {
        });

        it('tap with white team selected on grid point with white stone ignored', () => {
        });
        it('tap with black team selected on grid point with white stone ignored', () => {
        });
        it('tap with white team selected on grid point with black stone ignored', () => {
        });
        it('tap with black team selected on grid point with black stone ignored', () => {
        });

        it('tap with white team selected on grid point with unconfirmed white stone places white stone, removes unconfirmed stone', () => {
        });
        it('tap with black team selected on grid point with unconfirmed white stone places white stone, removes unconfirmed stone', () => {
        });
        it('tap with white team selected on grid point with unconfirmed black stone places black stone, removes unconfirmed stone', () => {
        });
        it('tap with black team selected on grid point with unconfirmed black stone places black stone, removes unconfirmed stone', () => {
        });
    });
});


//     handle_grid_point_tap(x, y)
    //     
    //     is_click_release(x, y)
    //         click_press_position
    //         threshold
    // 
    //     on_grid_click_release(x, y)
    //         calls requestAnimationFrame
    //         calls place_unconfirmed_stone when no confirmed stone
    //         confirms unconfirmed stone when clicked on
    // 
    //     to_grid_position(x, y)
// 
//     draw_grid?
//     draw_stone?
//     draw?
// 
    //     is_point_empty(pos)
    //         
    //     place_unconfirmed_stone(color, pos)
    // 
    //     confirm_stone_placement()
// 
//     resize()
//         calls requestAnimationFrame
//         width, height, devicePixelRatio...
// 
//     change_team(color)   

