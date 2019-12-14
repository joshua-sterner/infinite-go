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
                assert(canvas.event_listeners[event_type].length == 1);
            });
        });
        it('sets initial_touch_position to -1024,-1024 (far offscreen value)', () => {
            assert(goban.initial_touch_position.x == -1024);
            assert(goban.initial_touch_position.y == -1024);
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
                assert(goban.handle_press_calls.length == 1);
                assert(goban.handle_press_calls[0][0] == 123);
                assert(goban.handle_press_calls[0][1] == 456);
            });
        });
        describe('mouseup', () => {
            it('calls handle_release with correct coordinates', () => {
                canvas.event_listeners['mouseup'][0]({clientX: 123, clientY: 456});
                assert(goban.handle_release_calls.length == 1);
                assert(goban.handle_release_calls[0][0] == 123);
                assert(goban.handle_release_calls[0][1] == 456);
            });
        });
        describe('mousemove', () => {
            it('calls handle_move with correct coordinates', () => {
                canvas.event_listeners['mousemove'][0]({clientX: 123, clientY: 456});
                assert(goban.handle_move_calls.length == 1);
                assert(goban.handle_move_calls[0][0] == 123);
                assert(goban.handle_move_calls[0][1] == 456);
            });
        });
        describe('mouseout', () => {
            it('calls handle_out', () => {
                canvas.event_listeners['mouseout'][0]();
                assert(goban.handle_out_calls === 1);
            });
        });
        describe('touchstart', () => {

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

