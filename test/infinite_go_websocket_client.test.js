const fs = require('fs');
const assert = require('assert');

// Loading the InfiniteGoWebsocketClient class definition this way because I don't want to add node.js
//  specific code to the front-end code.
const ig_ws_client_loader = function() {
    let ig_ws_client_class;
    eval(fs.readFileSync('static/infinite_go_websocket_client.js').toString() + '; ig_ws_client_class = InfiniteGoWebsocketClient;');
    return ig_ws_client_class;
};
const InfiniteGoWebsocketClient = ig_ws_client_loader();

class MockWebSocket {

    constructor() {
        this.reset();
    }
    
    send(data) {
        this.sent_data.push(data);
    }

    close() {
        this.close_called = true;
    }

    reset() {
        this.onclose = null;
        this.onerror = null;
        this.onmessage = null;
        this.onopen = null;
        this.sent_data = [];
        this.close_called = false;
    }

}

class MockGoban {
    
    constructor() {
        this.reset();
    }

    set_viewport(viewport) {
        this.set_viewport_calls.push(viewport);
    }

    get_viewport() {
        return {
            top: 120,
            bottom: -340,
            left: -560,
            right: 780
        };
    }

    on_stone_placement_request(cb) {
        this.stone_placement_request_cb = cb;
    }

    grant_stone_placement_request(stone) {
        this.grant_stone_placement_request_calls.push(stone);
    }

    deny_stone_placement_request(stone) {
        this.deny_stone_placement_request_calls.push(stone);
    }
    
    set_stones(stones) {
        this.set_stones_calls.push(stones);
    }

    on_viewport_change(cb) {
        this.viewport_change_cb = cb;
    }

    on_team_change(cb) {
        this.team_change_cb = cb;
    }

    change_team(color) {
        this.change_team_calls.push(color);
    }

    add_stone(stone) {
        this.add_stone_calls.push(stone);
    }
    
    remove_stone(stone) {
        this.remove_stone_calls.push(stone);
    }

    reset() {
        this.stone_placement_request_cb = null;
        this.team_change_cb = null;
        this.viewport_change_cb = null;
        this.set_viewport_calls = [];
        this.grant_stone_placement_request_calls = [];
        this.deny_stone_placement_request_calls = [];
        this.set_stones_calls = [];
        this.change_team_calls = [];
        this.add_stone_calls = [];
        this.remove_stone_calls = [];
    }
}

describe('InfiniteGoWebsocketClient', () => {

    const ws = new MockWebSocket();
    const goban = new MockGoban();
    let ig_ws_client;

    let stone = {
        color: 'white',
        position: {x: -123, y: 456}
    };

    beforeEach(() => {
        ws.reset();
        goban.reset();
        ig_ws_client = new InfiniteGoWebsocketClient(ws, goban);
    });

    it('sends stone placement request in response to callback passed to goban.on_stone_placement_request', () => {
        goban.stone_placement_request_cb(stone);
        assert.equal(ws.sent_data.length, 1);
        let expected = {
            type: 'stone_placement_request',
            stone: stone
        };
        assert.deepStrictEqual(JSON.parse(ws.sent_data[0]), expected);
    });

    it('sends team change notification in response to callback passed to goban.on_team_change', () => {
        goban.team_change_cb('black');
        assert.equal(ws.sent_data.length, 1);
        let expected = {
            type: 'team_change',
            color: 'black'
        };
        assert.deepStrictEqual(JSON.parse(ws.sent_data[0]), expected);
    });

    it('sends viewport coords in response to callback passed to goban.on_viewport_change', () => {
        goban.viewport_change_cb({top: 12, left: -34, right: 56, bottom: -78});
        let expected = {
            type: 'viewport_coordinates',
            viewport: {
                top: 12,
                bottom: -78,
                left: -34,
                right: 56
            }
        };
        assert.equal(ws.sent_data.length, 1);
        assert.deepStrictEqual(JSON.parse(ws.sent_data[0]), expected);
    });

    describe('set_web_socket', () => {
        it('closes old websocket connection', () => {
            ig_ws_client.set_web_socket(ws);
            assert(ws.close_called);
        });
        // sets web socket correctly
    });
    
    it('handles stone placement request approval', () => {
        ws.onmessage({data: JSON.stringify({
            type: 'stone_placement_request_approved',
            stone: stone
        })});
        assert.equal(goban.grant_stone_placement_request_calls.length, 1);
        assert.deepStrictEqual(goban.grant_stone_placement_request_calls[0], stone);
    });

    it('handles stone placement request denial', () => {
        ws.onmessage({data: JSON.stringify({
            type: 'stone_placement_request_denied',
            stone: stone
        })});
        assert.equal(goban.deny_stone_placement_request_calls.length, 1);
        assert.deepStrictEqual(goban.deny_stone_placement_request_calls[0], stone);
    });

    it('handles stone placement notification', () => {
        ws.onmessage({data: JSON.stringify({
            type: 'stone_placed',
            stone: stone
        })});
        assert.equal(goban.add_stone_calls.length, 1);
        assert.deepStrictEqual(goban.add_stone_calls[0], stone);
    });

    it('handles stone removal notification', () => {
        ws.onmessage({data: JSON.stringify({
            type: 'stone_removed',
            stone: stone
        })});
        assert.equal(goban.remove_stone_calls.length, 1);
        assert.deepStrictEqual(goban.remove_stone_calls[0], stone);
    });

    it('handles viewport_stones message', () => {
        ws.onmessage({data: JSON.stringify({
            type: 'viewport_stones',
            stones: [stone]
        })});
        assert.equal(goban.set_stones_calls.length, 1);
        assert.deepStrictEqual(goban.set_stones_calls[0], [stone]);
    });

    describe('handles viewport coordinate message', () => {
        const viewport = {
            top: 12,
            bottom: -34,
            left: -56,
            right: 78
        };
        beforeEach(() => {
            ws.onmessage({data: JSON.stringify({
                type: 'viewport_coordinates',
                viewport: viewport
            })});
        });
        it('calls set_viewport', () => {
            assert.equal(goban.set_viewport_calls.length, 1);
            assert.deepStrictEqual(goban.set_viewport_calls[0], viewport);
        });
        it('sends viewport_coordinates_client_response', () => {
            const expected = {
                type: 'viewport_coordinates_client_response',
                viewport: goban.get_viewport()
            };
            assert.equal(ws.sent_data.length, 1);
            assert.deepStrictEqual(JSON.parse(ws.sent_data[0]), expected);
        });
    });

    it('handles team change notification', () => {
        ws.onmessage({data: JSON.stringify({
            type: 'team_change',
            color: 'white'
        })});
        assert.equal(goban.change_team_calls.length, 1);
        assert.equal(goban.change_team_calls[0], 'white');
    });

    it('sends pong in response to ping', () => {
        ws.onmessage({data: JSON.stringify({
            type: 'ping'
        })});
        const expected = {
            type: 'pong'
        };
        assert.equal(ws.sent_data.length, 1);
        assert.deepStrictEqual(JSON.parse(ws.sent_data[0]), expected);
    });

    describe('on_missed_ping_reply', () => {
        it('not called if pong sent within 1 second', (done) => {
            let done_called = false;
            ig_ws_client.on_missed_ping_reply(() => {
                done_called = true;
                done(false);
            });
            ig_ws_client._ping(10);
            setTimeout(() => {
                ws.onmessage({data: JSON.stringify({
                    type: 'pong'
                })});
            }, 900);
            setTimeout(() => {
                if (!done_called) {
                    done();
                }
            }, 1100);
        });
        it('called if pong not sent within 1 second', (done) => {
            let done_called = false;
            ig_ws_client.on_missed_ping_reply(() => {
                done_called = true;
                done();
            });
            ig_ws_client._ping();
            setTimeout(() => {
                if (!done_called) {
                    done(false);
                }
            }, 1100);
        });
    });
});
