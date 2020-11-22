/**
 * Infinite Go API
 *
 * @module InfiniteGoAPI
 */

const Ajv = require('ajv');

/**
 * Infinite-Go JSON API
 *
 * @class
 */
class InfiniteGoAPI {

    #users;
    #goban;

    /**
     * Constructor
     *
     * @param {Users} users - The Users instance that provides access to user accounts.
     */
    constructor(users, goban) {
        this.#users = users;
        this.#goban = goban;
        const message_map = this.message_mappings();
        message_map.max_type_length = 0;
        for (let i of message_map.keys()) {
            message_map.max_type_length = Math.max(i.length, message_map.max_type_length);
        }
        this.message_map = message_map;
        this._ajv = new Ajv();
        this._validate = this._ajv.compile(require('./schemas/schemas.json'));
        this.connections = new Map();
    }
    
    /**
     * Sets the hook functions for sending messages and closing connections.
     *
     * @param {Function} send - function(user, connection_id, json) that sends a message to the user.
     * @param {Function} close - function(user, connection_id) that closes the users API connection.
     */
    set_hooks(send, close) {
        this.send = send;
        this.close = close;
    }

    /**
     * Called when a user connects to the API.
     *
     * @param {number} user - The id of the user who connected to the API.
     * @param connection_id -
     */
    connect(user_id, connection_id) {
        if (!this.connections.has(user_id)) {
            this.connections.set(user_id, new Set([connection_id]));
        }
    }

    /**
     * Called when a user disconnects from the API.
     *
     * @param {number} user_id - The id of the user who disconnected from the API.
     * @param connection_id -
     */
    disconnect(user_id, connection_id) {
        this.connections.get(user_id).delete(connection_id);
        if (this.connections.get(user_id).size == 0) {
            this.connections.delete(user_id);
        }
    }

    // stone_placement_request: forwards req to goban, which either approves or denies it
    //   goban emits approval & denial events, and capture events as appropriate
    //   api sends approval/denial event to requester
    //   api sends stones_placed to other users based on approved stones & viewports
    //   api sends stones_removed to users based on captured stones & viewports

    /**
     * Handles an incoming JSON message.
     *
     * @param {number} user_id - The id of the user who sent the message.
     * @param {number} connection_id -
     * @param {string} json - The message the user sent.
     */
    call(json, user_id, connection_id) {
        let msg = JSON.parse(json);
        let valid = this._validate(msg);
        if (!valid) {
            return;
        }
        if (this.message_map.has(msg.type)) {
            this.message_map.get(msg.type)(msg, user_id, connection_id);
        }
    }

    message_mappings() {
        const message_map = new Map();
        message_map.set('stone_placement_request', (msg, user_id, connection_id) => {
            msg.stone.placed_by = user_id;
            this.#goban.place(msg.stone).then((placed) => {
                if (placed) {
                    this.send(user_id, connection_id, JSON.stringify({
                        type: 'stone_placement_request_approved',
                        stones: [msg.stone]
                    }));
                    //TODO notify other users
                } else {
                    this.send(user_id, connection_id, JSON.stringify({
                        type: 'stone_placement_request_denied',
                        stones: [msg.stone]
                    }));
                }
            });
        });
        message_map.set('viewport_coordinates', (msg, user_id, connection_id) => {
            this.#goban.retrieve({x0: msg.viewport.left,
                x1: msg.viewport.right,
                y1: msg.viewport.bottom,
                y0: msg.viewport.top}).then((stones) => {
                this.send(user_id, connection_id, JSON.stringify({
                    type: 'viewport_stones',
                    stones: stones
                }));
            });
            this.connections.get(user_id).forEach((i) => { //TODO test
                if (i != connection_id) {
                    this.send(user_id, i, JSON.stringify({
                        type: 'viewport_coordinates',
                        viewport: msg.viewport
                    }));
                }
            });
        });
        return message_map;
    }

}

module.exports = InfiniteGoAPI;
/**
 * @typedef User
 * @typedef Users
 */
