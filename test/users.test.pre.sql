CREATE TABLE users ( id serial PRIMARY KEY,
username VARCHAR (127) UNIQUE NOT NULL,
password VARCHAR (511) NOT NULL,
email VARCHAR(511) UNIQUE NOT NULL);

INSERT INTO users (username, email, password) VALUES ('first_test_user', 'nobody@nonexistant.tld', 'pw1');
INSERT INTO users (username, email, password) VALUES ('second_test_user', 'second@example.io', 'pw2');
