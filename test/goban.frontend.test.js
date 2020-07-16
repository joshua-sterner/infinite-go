const fs = require('fs');
const assert = require('assert');
const util = require('util');

class MockWindow {
    constructor() {
        this.reset();
    }

    reset() {
        this.num_request_animation_frame_calls = 0;
    }

    requestAnimationFrame() {
        this.num_request_animation_frame_calls += 1;
    }
}

// Loading the Goban class definition this way because I don't want to add node.js
//  specific code to the front-end code.
const Goban = function() {
    let goban_class;
    eval(fs.readFileSync('static/goban.js').toString() + '; goban_class = Goban;');
    return goban_class;
}();

class MockContext {
    constructor() {
        this.reset();
    }
    scale(x, y) {
        this.scale_calls.push({x: x, y: y});
    }
    reset() {
        this.scale_calls = [];
    }
}

class MockCanvas {
    constructor() {
        this.mock_context = new MockContext();
    }

    reset() {
        this.event_listeners = {};
        this.mock_context.reset();
    }

    addEventListener(event_type, cb) {
        if (!this.event_listeners[event_type]) {
            this.event_listeners[event_type] = [];
        }
        this.event_listeners[event_type].push(cb);
    }

    getContext(ctx_type) {
        //TODO start testing drawing methods
        // context is only used by drawing methods, which are not being tested here.
        if (ctx_type == '2d') {
            return this.mock_context;
        }
    }

}

const window = new MockWindow();

describe('Goban', () => {

    const canvas = new MockCanvas();
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
            const single_touch_event = {touches: [touch], preventDefault: function() {}};
            const double_touch_event = {touches: [touch, touch2], preventDefault: function() {}};
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
                it('calls preventDefault to prevent duplicate mouse event on mobile', () => {
                    const e = {touches: [touch], preventDefault: function() {this.prevent_default_called = true;}};
                    canvas.event_listeners['touchstart'][0](e);
                    assert(e.prevent_default_called);
                });
            });
            describe('touchend', () => {
                it('calls _handle_release with correct coordinates when single touch ends', () => {
                    const touch_event = {touches: [], changedTouches: [touch], preventDefault: function() {}};
                    canvas.event_listeners['touchend'][0](touch_event);
                    assert.equal(goban._handle_release_calls.length, 1);
                    assert.equal(goban._handle_release_calls[0][0], 123);
                    assert.equal(goban._handle_release_calls[0][1], 456);
                });
                it('doesn\'t call _handle_release when one of two touches end', () => {
                    const touch_event = {touches: [touch, touch2], changedTouches: [touch], preventDefault: function() {}};
                    canvas.event_listeners['touchend'][0](touch_event);
                    assert.equal(goban._handle_release_calls.length, 0);
                });
                it('calls preventDefault to prevent duplicate mouse event on mobile', () => {
                    const e = {touches: [touch], preventDefault: function() {this.prevent_default_called = true;}};
                    canvas.event_listeners['touchend'][0](e);
                    assert(e.prevent_default_called);
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
                it('calls preventDefault to prevent duplicate mouse event on mobile', () => {
                    const e = {touches: [touch], preventDefault: function() {this.prevent_default_called = true;}};
                    canvas.event_listeners['touchmove'][0](e);
                    assert(e.prevent_default_called);
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
                it('calls preventDefault to prevent duplicate mouse event on mobile', () => {
                    const e = {touches: [touch], preventDefault: function() {this.prevent_default_called = true;}};
                    canvas.event_listeners['touchcancel'][0](e);
                    assert(e.prevent_default_called);
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

    describe('change_team', () => {
        it('change_team(\'white\') changes unconfirmed_stone.color to white', () => {
            goban.unconfirmed_stone = {color: 'black', position:{x:0, y:0}};
            goban.change_team('white');
            assert.equal(goban.unconfirmed_stone.color, 'white');
        });
        it('change_team(\'black\') changes unconfirmed_stone.color to black', () => {
            goban.unconfirmed_stone = {color: 'white', position:{x:0, y:0}};
            goban.change_team('black');
            assert.equal(goban.unconfirmed_stone.color, 'black');
        });
        it('calls requestAnimationFrame', () => {
            goban.change_team('white');
            assert.equal(window.num_request_animation_frame_calls, 1);
        });
    });

    describe('tap', () => {
        [
            {press: {x: 0, y: 0}, release: {x: 0, y: 0}, offset: {x: 0, y: 0}, grid: {x: 0, y: 0}},
            {press: {x: 5, y: 2}, release: {x: 1, y: 3}, offset: {x: 0, y: 0}, grid: {x: 0, y: 0}},
            {press: {x: 0, y: 0}, release: {x: 0, y: 0}, offset: {x: 40, y: 0}, grid: {x: -1, y: 0}},
            {press: {x: 5, y: 2}, release: {x: 1, y: 3}, offset: {x: 40, y: 0}, grid: {x: -1, y: 0}},
            {press: {x: 0, y: 0}, release: {x: 0, y: 0}, offset: {x: -40, y: 0}, grid: {x: 1, y: 0}},
            {press: {x: 5, y: 2}, release: {x: 1, y: 3}, offset: {x: -40, y: 0}, grid: {x: 1, y: 0}},
            {press: {x: 0, y: 0}, release: {x: 0, y: 0}, offset: {x: 0, y: 43}, grid: {x: 0, y: -1}},
            {press: {x: 5, y: 2}, release: {x: 1, y: 3}, offset: {x: 0, y: 43}, grid: {x: 0, y: -1}},
            {press: {x: 0, y: 0}, release: {x: 0, y: 0}, offset: {x: 0, y: -43}, grid: {x: 0, y: 1}},
            {press: {x: 5, y: 2}, release: {x: 1, y: 3}, offset: {x: 0, y: -43}, grid: {x: 0, y: 1}},
            {press: {x: 0, y: 0}, release: {x: 0, y: 0}, offset: {x: 40, y: 43}, grid: {x: -1, y: -1}},
            {press: {x: 5, y: 2}, release: {x: 1, y: 3}, offset: {x: 40, y: 43}, grid: {x: -1, y: -1}},
            {press: {x: 0, y: 0}, release: {x: 0, y: 0}, offset: {x: -40, y: -43}, grid: {x: 1, y: 1}},
            {press: {x: 5, y: 2}, release: {x: 1, y: 3}, offset: {x: -40, y: -43}, grid: {x: 1, y: 1}}
        ].forEach((i) => {
            ['black', 'white'].forEach((color) => {
                it(`press @ (${i.press.x}, ${i.press.y}), release @ (${i.release.x}, ${i.release.y}}) with offset (${i.offset.x}, ${i.offset.y}) as ${color} on empty grid point places unconfirmed ${color} stone @ grid point (${i.grid.x}, ${i.grid.y})`, () => {
                    goban.offset = i.offset;
                    goban.change_team(color);
                    goban._handle_press(i.press.x, i.press.y);
                    goban._handle_release(i.release.x, i.release.y);
                    assert(goban.unconfirmed_stone);
                    const expected = {color: color, position: {x: i.grid.x, y: i.grid.y}, unsynced: true};
                    assert.deepStrictEqual(goban.unconfirmed_stone, expected);
                });
                it(`tap with ${color} team selected on grid point with unconfirmed ${color} stone places ${color} stone`, () => {
                    goban.stones = [{color:'white', position: {x:-12, y:-34}}];
                    goban.unconfirmed_stone = {color: color, position: {x: i.grid.x, y: i.grid.y}};
                    goban.offset = i.offset;
                    goban.change_team(color);
                    goban._handle_press(i.press.x, i.press.y);
                    goban._handle_release(i.release.x, i.release.y);
                    assert.equal(goban.stones.length, 2);
                    const expected = {color: color, position: {x: i.grid.x, y: i.grid.y}};
                    assert.deepStrictEqual(goban.stones[1], expected);
                });
                it(`tap with ${color} team selected on grid point with unconfirmed ${color} stone removes unconfirmed stone`, () => {
                    goban.stones = [{color:'white', position: {x:-12, y:-34}}];
                    goban.unconfirmed_stone = {color: color, position: {x: i.grid.x, y: i.grid.y}};
                    goban.offset = i.offset;
                    goban.change_team(color);
                    goban._handle_press(i.press.x, i.press.y);
                    goban._handle_release(i.release.x, i.release.y);
                    assert(!goban.unconfirmed_stone, `goban.unconfirmed_stone: ${util.inspect(goban.unconfirmed_stone)}`);
                });
                const team_color = color;
                ['black', 'white'].forEach((stone_color) => {
                    it(`press @ (${i.press.x}, ${i.press.y}), release @ (${i.release.x}, ${i.release.y}) with offset (${i.offset.x}, ${i.offset.y}) as ${team_color} on grid point (${i.grid.x}, ${i.grid.y}) with ${stone_color} stone doesn't place stone`, () => {
                        goban.offset = i.offset;
                        goban.stones = [{color: stone_color, position: {x: i.grid.x, y: i.grid.y}}];
                        goban.change_team(color);
                        goban._handle_press(i.press.x, i.press.y);
                        goban._handle_release(i.release.x, i.release.y);
                        assert.equal(goban.stones.length, 1);
                    });
                });
            });
        });
    });
    describe('resize', () => {
        beforeEach(() => {
            delete window.devicePixelRatio;
        });
        it('sets canvas width from clientWidth when window.devicePixelRatio undefined', () => {
            canvas.clientWidth = 1234;
            goban.resize();
            assert.equal(canvas.width, 1234);
        });
        it('sets canvas width from clientWidth when window.devicePixelRatio is defined', () => {
            canvas.clientWidth = 1234;
            window.devicePixelRatio = 2;
            goban.resize();
            assert.equal(canvas.width, 2468);
        });
        it('sets canvas height from clientHeight when window.devicePixelRatio undefined', () => {
            canvas.clientHeight = 1234;
            goban.resize();
            assert.equal(canvas.height, 1234);
        });
        it('sets canvas height from clientHeight when window.devicePixelRatio is defined', () => {
            canvas.clientHeight = 1234;
            window.devicePixelRatio = 2;
            goban.resize();
            assert.equal(canvas.height, 2468);
        });
        it('either does not call ctx.scale or calls ctx.scale(1,1) when window.devicePixelRatio undefined', () => {
            goban.resize();
            assert(canvas.mock_context.scale_calls.length == 0 || canvas.mock_context.scale_calls.length == 1);
            if (canvas.mock_context.scale_calls.length == 1) {
                assert.deepStrictEqual(canvas.mock_context.scale_calls[0], {x: 1, y: 1});
            }
        });
        it('calls ctx.scale with device_pixel_ratio when window.devicePixelRatio is defined', () => {
            window.devicePixelRatio = 2;
            goban.resize();
            assert.equal(canvas.mock_context.scale_calls.length, 1);
            assert.deepStrictEqual(canvas.mock_context.scale_calls[0], {x: 2, y: 2});
        });
        it('calls requestAnimationFrame', () => {
            goban.resize();
            assert.equal(window.num_request_animation_frame_calls, 1);
        });
    });

    describe('on_stone_placement_request', () => {
        it('callback is called when a stone placement request occurs', () => {
            let cb_calls = 0;
            goban.on_stone_placement_request(() => {
                cb_calls++;
            });
            goban._handle_press(0, 0);
            goban._handle_release(0, 0);
            assert.equal(cb_calls, 0);
            goban._handle_press(0, 0);
            goban._handle_release(0, 0);
            assert.equal(cb_calls, 1);
        });
        it('replaces previously set callback', () => {
            let cb_calls = 0;
            let cb2_calls = 0;
            goban.on_stone_placement_request(() => {
                cb_calls++;
            });
            goban.on_stone_placement_request(() => {
                cb2_calls++;
            });
            goban._handle_press(0, 0);
            goban._handle_release(0, 0);
            assert.equal(cb_calls, 0);
            assert.equal(cb2_calls, 0);
            goban._handle_press(0, 0);
            goban._handle_release(0, 0);
            assert.equal(cb_calls, 0);
            assert.equal(cb2_calls, 1);
        });
    });

    describe('on_viewport_change', () => {
        let grid_width;
        let grid_height;
        beforeEach(() => {
            grid_width = goban._grid_width;
            grid_height = goban._grid_width / goban._grid_ratio;
            canvas.width = goban._grid_width;
            canvas.height = goban._grid_width / goban._grid_ratio;
            canvas.clientWidth = canvas.width;
            canvas.clientHeight = canvas.height;
            goban.resize();
        });
        it('called when viewport resized by one grid point in the x direction.', () => {
            let cb_calls = [];
            goban.on_viewport_change((viewport) => {
                cb_calls.push(viewport);
            });
            canvas.clientWidth += grid_width;
            goban.resize();
            assert.equal(cb_calls.length, 1);
            assert.deepStrictEqual(cb_calls[0], {
                top: 0,
                left: 0,
                right: 2,
                bottom: 1,
            });
        });
        it('called when viewport resized by one grid point in the y direction.', () => {
            let cb_calls = [];
            goban.on_viewport_change((viewport) => {
                cb_calls.push(viewport);
            });
            canvas.clientHeight += grid_height;
            goban.resize();
            assert.equal(cb_calls.length, 1);
            assert.deepStrictEqual(cb_calls[0], {
                top: 0,
                left: 0,
                right: 1,
                bottom: 2,
            });
        });
        it('not called when viewport resized by less than one grid point in the x direction.', () => {
            let cb_calls = [];
            goban.on_viewport_change((viewport) => {
                cb_calls.push(viewport);
            });
            canvas.clientWidth += grid_width / 2 - 1;
            goban.resize();
            assert.equal(cb_calls.length, 0);
        });
        it('not called when viewport resized by less than one grid point in the y direction.', () => {
            let cb_calls = [];
            goban.on_viewport_change((viewport) => {
                cb_calls.push(viewport);
            });
            canvas.clientHeight += grid_height / 2 - 1;
            goban.resize();
            assert.equal(cb_calls.length, 0);
        });
    });

    describe('on_team_change', () => {
        it('callback called when team changed', () => {
            goban.change_team('black');
            let cb_calls = [];
            goban.on_team_change((team_color) => {
                cb_calls.push(team_color);
            });
            goban.change_team('white');
            goban.change_team('black');
            assert.equal(cb_calls.length, 2);
            assert.equal(cb_calls[0], 'white');
            assert.equal(cb_calls[1], 'black');
        });
        it('callback not called when change_team called with current team', () => {
            goban.change_team('black');
            let cb_calls = [];
            goban.on_team_change((team_color) => {
                cb_calls.push(team_color);
            });
            goban.change_team('black');
            assert.equal(cb_calls.length, 0);
        });
        it('on_team_change replaces callback', () => {
            goban.change_team('black');
            let cb_calls = [];
            goban.on_team_change((team_color) => {
                cb_calls.push(team_color);
            });
            let cb_calls2 = [];
            goban.on_team_change((team_color) => {
                cb_calls2.push(team_color);
            });
            goban.change_team('white');
            assert.equal(cb_calls.length, 0);
            assert.equal(cb_calls2.length, 1);
            assert.equal(cb_calls2[0], 'white');
        });
    });

    describe('grant_stone_placement_request', () => {
        it('confirms stone placement', () => {
            let unsynced_stone = {position: {x: -54, y: 2}, color: 'black', unsynced: true};
            goban.stones.push({position: {x: -14, y: 32}, color: 'black', unsynced: false});
            goban.stones.push(unsynced_stone);
            goban.stones.push({position: {x: 31, y: 94}, color: 'white', unsynced: false});
            goban.grant_stone_placement_request(unsynced_stone);
            assert.equal(goban.stones.length, 3);
            assert(goban.stones[1].unsynced == false);
        });
    });

    describe('deny_stone_placement_request', () => {
        it('removes denied stone', () => {
            let stone_a = {position: {x: -14, y: 32}, color: 'black', unsynced: false};
            let unsynced_stone = {position: {x: -54, y: 2}, color: 'black', unsynced: true};
            let stone_b = {position: {x: 31, y: 94}, color: 'white', unsynced: false};
            goban.stones.push(stone_a);
            goban.stones.push(unsynced_stone);
            goban.stones.push(stone_b);
            goban.deny_stone_placement_request(unsynced_stone);
            assert.equal(goban.stones.length, 2);
            assert.deepStrictEqual(goban.stones[0], stone_a);
            assert.deepStrictEqual(goban.stones[1], stone_b);
        });
    });

    describe('add_stone', () => {
        let stone_a = {position: {x: -14, y: 32}, color: 'black', unsynced: false};
        let stone_b = {position: {x: 31, y: 94}, color: 'white', unsynced: false};
        let stone_c = {position: {x: 11, y: 94}, color: 'white', unsynced: true};
        beforeEach(() => {
            goban.stones.push(stone_a);
            goban.stones.push(stone_b);
            goban.stones.push(stone_c);
        });
        it('replaces existing stone', () => {
            let stone_d = {position: {x: 11, y: 94}, color: 'black'};
            goban.add_stone(stone_d);
            assert.equal(goban.stones.length, 3);
            assert.deepStrictEqual(goban.stones[0], stone_a);
            assert.deepStrictEqual(goban.stones[1], stone_b);
            assert.deepStrictEqual(goban.stones[2], stone_d);
        });
        it('adds stone to list when position is empty', () => {
            let stone_d = {position: {x: 12, y: 34}, color: 'black'};
            goban.add_stone(stone_d);
            assert.equal(goban.stones.length, 4);
            assert.deepStrictEqual(goban.stones[0], stone_a);
            assert.deepStrictEqual(goban.stones[1], stone_b);
            assert.deepStrictEqual(goban.stones[2], stone_c);
            assert.deepStrictEqual(goban.stones[3], stone_d);
        });
    });

    it('remove_stone', () => {
        //TODO what if stone doesn't quite match?
        let stone_a = {position: {x: -14, y: 32}, color: 'black', unsynced: false};
        let stone_b = {position: {x: 31, y: 94}, color: 'white', unsynced: false};
        let stone_c = {position: {x: 11, y: 94}, color: 'white', unsynced: true};
        goban.stones.push(stone_a);
        goban.stones.push(stone_b);
        goban.stones.push(stone_c);
        goban.remove_stone({position: {x: 31, y: 94}, color: 'white'});
        assert.equal(goban.stones.length, 2);
        assert.equal(goban.stones[0], stone_a);
        assert.equal(goban.stones[1], stone_c);
    });

    describe('set_viewport', () => {
        beforeEach(() => {
        });
        it('calls viewport change callback if the viewport changed', () => {
        });
        it('calls viewport change callback if the viewport is different than the provided viewport', () => {
        });
        it('doesn\'t call the viewport change callback if the viewport did not change', () => {
        });
        it('centers viewport on center of provided viewport', () => {
        });
    });
});

