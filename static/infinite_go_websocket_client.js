/**
 * Handles incoming and outgoing websocket data.
 * * Parses messages from the server.
 * * Sends messages to the server in response to goban callbacks.
 */
class InfiniteGoWebsocketClient {

    /**
     * Constructs an InfiniteGoWebsocketClient.
     * Sets up goban callbacks.
     *
     * @param {WebSocket} ws - The websocket instance.
     * @param {Goban} goban - The goban instance.
     */
    constructor(ws, goban) {
        this.set_web_socket(ws);

        // set goban callbacks
        goban.on_stone_placement_request((stone) => {
            ws.send(JSON.stringify({
                type: 'stone_placement_request',
                stone: stone
            }));
        });

        goban.on_viewport_change((viewport) => {
            ws.send(JSON.stringify({
                type: 'viewport_coordinates',
                viewport: viewport
            }));
        });
        
        goban.on_team_change((color) => {
            ws.send(JSON.stringify({
                type: 'team_change',
                color: color
            }));
        });

        this._message_map = new Map();
        this._message_map.set('stone_placement_request_approved', (json) => {
            json.stones.forEach((stone) => {
                goban.grant_stone_placement_request(stone);
            });
            //TODO proper handling of multiple stone approvals?
            //goban.grant_stone_placement_request(json.stone);
        });
        this._message_map.set('stone_placement_request_denied', (json) => {
            goban.deny_stone_placement_request(json.stone);
        });
        this._message_map.set('stone_placed', (json) => {
            goban.add_stone(json.stone);
        });
        this._message_map.set('stone_removed', (json) => {
            goban.remove_stone(json.stone);
        });
        this._message_map.set('viewport_stones', (json) => {
            goban.set_stones(json.stones);
        });
        this._message_map.set('viewport_coordinates', (json) => {
            goban.set_viewport(json.viewport);
            const actual_viewport = goban.get_viewport();
            ws.send(JSON.stringify({
                type: 'viewport_coordinates_client_response',
                viewport: actual_viewport
            }));
        });
        this._message_map.set('team_change', (json) => {
            goban.change_team(json.color);
        });
        this._message_map.set('ping', () => {
            ws.send(JSON.stringify({type: 'pong'}));
        });

        this._ping_duration = 0;
    }

    /**
     * Replaces the websocket used by this InfiniteGoWebsocketClient.
     *
     * @param {WebSocket} ws - The new websocket to use.
     */
    set_web_socket(ws) {
        if (this._ws) {
            this._ws.close();
        }
        ws.onmessage = (e) => {
            const json = JSON.parse(e.data);
            if (json.type && this._message_map.has(json.type)) {
                this._message_map.get(json.type)(json);
            }
        };
        this._ws = ws;
    }

    /**
     * Sets the function to be called when the server fails to respond to a
     * ping.
     *
     * @param {Function} cb - The callback to be called when the server fails
     * tp respond to a ping.
     */
    on_missed_ping_reply(cb) {
        this._missed_ping_reply_cb = cb;
    }

    /**
     * Sets the ping frequency.
     *
     * @param {number} duration - Time in seconds between pings, or zero to
     * disable. Note that pings are disabled by default, this method must be
     * called to enable server pinging.
     */
    set_ping_frequency(duration) {
        this._ping_duration = duration * 1000;
        this._ping();
    }

    _ping() {
        this._ws.send(JSON.stringify({type: 'ping'}));
        if (this._missed_ping_reply_cb) {
            setTimeout(this._missed_ping_reply_cb, 1000);
        }
        if (this._ping_duration > 0) {
            setTimeout(this._ping, this._ping_duration);
        }
    }
}
