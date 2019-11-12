DROP TABLE users;
CREATE TABLE users ( id serial PRIMARY KEY,
username VARCHAR (127) UNIQUE NOT NULL,
password VARCHAR (511) NOT NULL,
email VARCHAR(511) UNIQUE NOT NULL,
viewport_top INTEGER NOT NULL,
viewport_right INTEGER NOT NULL,
viewport_bottom INTEGER NOT NULL,
viewport_left INTEGER NOT NULL);

INSERT INTO users (username, email, password, viewport_top, viewport_right, viewport_bottom, viewport_left) VALUES ('first_test_user', 'nobody@nonexistant.tld', 'pw1', 10, 11, 12, 13);
INSERT INTO users (username, email, password, viewport_top, viewport_right, viewport_bottom, viewport_left) VALUES ('second_test_user', 'second@example.io', 'pw2', 6, 11, -6, -11);
