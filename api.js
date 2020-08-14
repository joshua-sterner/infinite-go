/**
 * Infinite Go API
 *
 * @module InfiniteGoAPI
 */

/**
 * Infinite-Go JSON API
 *
 * @class
 */
class InfiniteGoAPI {

    #users;

    /**
     * Constructor
     *
     * @param {Users} users - The Users instance that provides access to user accounts.
     */
    constructor(users) {
        this.#users = users;
        const message_map = this.message_mappings();
        message_map.max_type_length = 0;
        for (let i of message_map.keys()) {
            message_map.max_type_length = Math.max(i.length, message_map.max_type_length);
        }
        this.message_map = message_map;
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
    }

    /**
     * Called when a user disconnects from the API.
     *
     * @param {number} user_id - The id of the user who disconnected from the API.
     * @param connection_id -
     */
    disconnect(user_id, connection_id) {
    }

    /**
     * Handles an incoming JSON message.
     *
     * @param {number} user_id - The id of the user who sent the message.
     * @param {number} connection_id -
     * @param {string} json - The message the user sent.
     */
    call(json, user_id, connection_id) {
        let msg = JSON.parse(json);
        if (typeof msg.type === 'string'
            && msg.type.length <= this.message_map.max_type_length
            && this.message_map.has(msg.type)) {
            this.message_map.get(msg.type)(msg, user_id, connection_id);
        }
    }

    message_mappings() {
        const message_map = new Map();
        message_map.set('stone_placement_request', (msg, user_id, connection_id) => {
            setTimeout(() => {
                // TODO where should this confirmation actually happen?
                this.send(user_id, connection_id, JSON.stringify({
                    type: 'stone_placement_request_approved',
                    stones: [msg.stone]
                }));
            }, 1500);
        });
        //message_map.set('viewport_coordinates', (msg, user_id) => {
        //    this.ws_sessions.get(user_id).forEach((i) => { //TODO test
        //        if (i != ws) {
        //            i.send(JSON.stringify({
        //                type: 'viewport_coordinates',
        //                viewport: msg.viewport
        //            }));
        //        }
        //    });
        //});
        return message_map;
    }

}

module.exports = InfiniteGoAPI;
/**
 * @typedef User
 * @typedef Users
 */
