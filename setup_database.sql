CREATE TABLE users (
username VARCHAR (127) UNIQUE NOT NULL PRIMARY KEY,
password VARCHAR (511) NOT NULL,
email VARCHAR(511) UNIQUE NOT NULL,
date_created TIMESTAMP NOT NULL,
viewport_top INTEGER NOT NULL,
viewport_right INTEGER NOT NULL,
viewport_bottom INTEGER NOT NULL,
viewport_left INTEGER NOT NULL);

CREATE TABLE stone_groups (
    id SERIAL NOT NULL,
    captured_perimeter INTEGER NOT NULL,
    perimeter INTEGER NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE stone_group_shared_perimeter (
    stone_group_0 INTEGER NOT NULL REFERENCES stone_groups (id) ON DELETE CASCADE ON UPDATE CASCADE,
    stone_group_1 INTEGER NOT NULL REFERENCES stone_groups (id) ON DELETE CASCADE ON UPDATE CASCADE,
    perimeter INTEGER NOT NULL,
    captured_perimeter INTEGER NOT NULL
);

CREATE TABLE stone_group_pointers (
    id SERIAL NOT NULL,
    stone_group INTEGER NOT NULL REFERENCES stone_groups (id) ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (id)
);

CREATE TYPE stone_color as ENUM ('black', 'white');
CREATE TABLE stones (
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    placed_by VARCHAR (127) NOT NULL REFERENCES users (username) ON DELETE CASCADE ON UPDATE CASCADE,
    date_placed TIMESTAMP NOT NULL,
    color stone_color NOT NULL,
    stone_group_pointer INTEGER NOT NULL REFERENCES stone_group_pointers (id) ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (x, y)
);
