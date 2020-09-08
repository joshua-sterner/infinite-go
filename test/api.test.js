const fc = require('fast-check');
const InfiniteGoAPI = require('../api.js');

describe('InfiniteGoAPI', function() {
    let api;
    beforeEach(function() {
        api = new InfiniteGoAPI();
    });
    describe('team_change', function() {
        it('Is sent to all other connections with correct user_id when recieved by api.');
    });
    describe('viewport_coordinates', function() {
        it('Is sent to all other connections from the same user when recieved by api.');
        it('Sets user\'s viewport in db when recieved by api.');
        it('Responds with viewport_stones message.');
        it('Sends viewport_stones to other connections.');
    });
    describe('viewport_coordinates_client_response', function() {
        //TODO this should used to determine which stone updates to send to each connected device
    });
    describe('ping', function() {
        it('Responds with pong');
    });
    describe('pong', function() {
        it('Disconnects if no pong respons after timeout.');
    });
    describe('viewport_stones', function() {
        it('Ignored when recieved by api.');
    });
    describe('stones_placed', function() {
        it('Is sent to correct users in response to stone approval event from Goban.');
        it('Sends only stones within viewport and viewport buffer.');
    });
    describe('stones_removed', function() {
        it('Is sent in response to capture event from Goban.');
        it('Sends only stones within viewport and viewport buffer.');
    });
    describe('stone_placement_request', function() {
        it('Forwards request to Goban.');
    });
    describe('stone_placement_request_approved', function() {
        it('Sent in response to stone approval event from Goban.');
        it('Sent only to correct connections.');
    });
    describe('stone_placement_request_denied', function() {
        it('Sent in response to stone denial event from Goban.');
        it('Sent only to correct conections');
    });
});
