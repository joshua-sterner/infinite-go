# infinite-go
An online, multiplayer go variant on an infinite board.

## Dependencies
Express.js, Passport.js, bcrypt, node-postgres

Mocha and SuperTest are required for testing.

## Running Tests
Run `npm install` in the project directory.
There are integration tests that require database access, so create a postgres
database and put the connection details in test/test_db_connection.json as
follows:

```javascript
//test_db_connection.json
{
    "user": "postgres username (default: your username)",
    "password": "postgres password (default: no password)",
    "host": "hostname of the postgres server (default: localhost)",
    "port": postgres port (default: 5432),
    "database": "name of the database to be used for testing (required)"
}
```
Tests can be run using `npm test`
