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
            assert.equal(goban.initial_touch_position.x, -1024);
            assert.equal(goban.initial_touch_position.y, -1024);
        });
        it('sets initial offset to 0,0', () => {
            assert(goban.offset);
            assert.equal(goban.offset.x, 0);
            assert.equal(goban.offset.y, 0);
        });
    });

    describe('Event Listeners', () => {
        beforeEach(() => {

            // set up handle_press spy
            goban.handle_press_calls = [];
            const handle_press = goban.handle_press;
            goban.handle_press = function(x, y) {
                goban.handle_press_calls.push([x, y]);
                handle_press.call(goban, x, y);
            };

            // set up handle_release spy
            goban.handle_release_calls = [];
            const handle_release = goban.handle_release;
            goban.handle_release = function(x, y) {
                goban.handle_release_calls.push([x, y]);
                handle_release.call(goban, x, y);
            };

            // set up handle_move spy
            goban.handle_move_calls = [];
            const handle_move = goban.handle_move;
            goban.handle_move = function(x, y) {
                goban.handle_move_calls.push([x, y]);
                handle_move.call(goban, x, y);
            };

            // set up handle_out spy
            goban.handle_out_calls = 0;
            const handle_out = goban.handle_out;
            goban.handle_out = function() {
                goban.handle_out_calls++;
                handle_out.call(goban);
            };
        });
        describe('mousedown', () => {
            it('calls handle_press with correct coordinates', () => {
                canvas.event_listeners['mousedown'][0]({clientX: 123, clientY: 456});
                assert.equal(goban.handle_press_calls.length, 1);
                assert.equal(goban.handle_press_calls[0][0], 123);
                assert.equal(goban.handle_press_calls[0][1], 456);
            });
        });
        describe('mouseup', () => {
            it('calls handle_release with correct coordinates', () => {
                canvas.event_listeners['mouseup'][0]({clientX: 123, clientY: 456});
                assert.equal(goban.handle_release_calls.length, 1);
                assert.equal(goban.handle_release_calls[0][0], 123);
                assert.equal(goban.handle_release_calls[0][1], 456);
            });
        });
        describe('mousemove', () => {
            it('calls handle_move with correct coordinates', () => {
                canvas.event_listeners['mousemove'][0]({clientX: 123, clientY: 456});
                assert.equal(goban.handle_move_calls.length, 1);
                assert.equal(goban.handle_move_calls[0][0], 123);
                assert.equal(goban.handle_move_calls[0][1], 456);
            });
        });
        describe('mouseout', () => {
            it('calls handle_out', () => {
                canvas.event_listeners['mouseout'][0]();
                assert.equal(goban.handle_out_calls, 1);
            });
        });
        describe('touch events', () => {
            const touch = {clientX: 123, clientY: 456, identifier: 789};
            const touch2 = {clientX: 321, clientY: 654, identifier: 987};
            const single_touch_event = {touches: [touch]};
            const double_touch_event = {touches: [touch, touch2]};
            describe('touchstart', () => {
                it('calls handle_press with correct coordinates when touches.length == 1', () => {
                    canvas.event_listeners['touchstart'][0](single_touch_event);
                    assert.equal(goban.handle_press_calls.length, 1);
                    assert.equal(goban.handle_press_calls[0][0], 123);
                    assert.equal(goban.handle_press_calls[0][1], 456);
                });
                it('calls handle_out when touches.length != 1', () => {
                    canvas.event_listeners['touchstart'][0](double_touch_event);
                    assert.equal(goban.handle_out_calls, 1);
                });
                it('doesn\'t call handle_press when touches.length != 1', () => {
                    canvas.event_listeners['touchstart'][0](double_touch_event);
                    assert.equal(goban.handle_press_calls.length, 0);
                });
            });
            describe('touchend', () => {
                it('calls handle_release with correct coordinates when single touch ends', () => {
                    const touch_event = {touches: [], changedTouches: [touch]};
                    canvas.event_listeners['touchend'][0](touch_event);
                    assert.equal(goban.handle_release_calls.length, 1);
                    assert.equal(goban.handle_release_calls[0][0], 123);
                    assert.equal(goban.handle_release_calls[0][1], 456);
                });
                it('doesn\'t call handle_release when one of two touches end', () => {
                    const touch_event = {touches: [touch, touch2], changedTouches: [touch]};
                    canvas.event_listeners['touchend'][0](touch_event);
                    assert.equal(goban.handle_release_calls.length, 0);
                });
            });
            describe('touchmove', () => {
                it('calls handle_move with correct coordinates when touches.length == 1', () => {
                    canvas.event_listeners['touchmove'][0](single_touch_event);
                    assert.equal(goban.handle_move_calls.length, 1);
                    assert.equal(goban.handle_move_calls[0][0], 123);
                    assert.equal(goban.handle_move_calls[0][1], 456);
                });
                it('doesn\'t call handle_move when touches.length != 1', () => {
                    canvas.event_listeners['touchmove'][0](double_touch_event);
                    assert.equal(goban.handle_move_calls.length, 0);
                });
            });
            describe('touchcancel', () => {
                it('calls handle_out when touches.length == 1', () => {
                    canvas.event_listeners['touchcancel'][0](single_touch_event);
                    assert.equal(goban.handle_out_calls, 1);
                });
                it('doesn\'t call handle_out when touches.length != 1', () => {
                    canvas.event_listeners['touchcancel'][0](double_touch_event);
                    assert.equal(goban.handle_out_calls, 0);
                });
            });
        });
    });

    describe('panning', () => {
        it('move after press pans', () => {
            const expected_offset = {x: goban.offset.x + 3, y: goban.offset.y + 4};
            goban.handle_press(1, 2);
            goban.handle_move(4, 6);
            assert.deepStrictEqual(goban.offset, expected_offset);
        });
        it('move before press doesn\'t pan', () => {
            const initial_offset = {x: goban.offset.x, y: goban.offset.y};
            goban.handle_move(3,4);
            assert.deepStrictEqual(goban.offset, initial_offset);
        });
        it('move after out after press doesn\'t pan', () => {
            const initial_offset = {x: goban.offset.x, y: goban.offset.y};
            goban.handle_press(1, 2);
            goban.handle_out();
            goban.handle_move(3, 4);
            assert.deepStrictEqual(goban.offset, initial_offset);
        });
        it('move after release after press doesn\'t pan', () => {
            const initial_offset = {x: goban.offset.x, y: goban.offset.y};
            goban.handle_press(1, 2);
            goban.handle_release(1, 2);
            goban.handle_move(3, 4);
            assert.deepStrictEqual(goban.offset, initial_offset);
        });
    });

});


// Goban
//     constructor(canvas)
//     
//         addsEventListeners: mousedown, mouseup, mouseout, mousemove, touchstart, touchend, touchmove
//         
//         EventListener calls on_press: mousedown, touchstart
// 
//         EventListener calls on_release: mouseup, touchend
// 
//         EventListener calls on_move: mousemove, touchmove
//            
// 
//         touchstart calls on_press when single-touch
// 
//         touchstart, touchmove:
//             stops panning when touchs.length > 1
// 
//         touchend calls on_release when single-touch released
// 
//         touchend does not call on_release when multi-touch release
// 
//     on_press(x, y)
//     on_move(x, y)
//     on_release(x, y)
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

