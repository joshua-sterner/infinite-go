CREATE TABLE users ( id serial PRIMARY KEY,
username VARCHAR (127) UNIQUE NOT NULL,
password VARCHAR (511) NOT NULL,
email VARCHAR(511) UNIQUE NOT NULL,
date_created TIMESTAMP NOT NULL,
viewport_top INTEGER NOT NULL,
viewport_right INTEGER NOT NULL,
viewport_bottom INTEGER NOT NULL,
viewport_left INTEGER NOT NULL);

CREATE TYPE stone_color as ENUM ('black', 'white');
CREATE TYPE processed_state as ENUM ('unprocessed', 'processing', 'processed');
CREATE TABLE stones (
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    placed_by VARCHAR(127) NOT NULL REFERENCES users (username) ON DELETE CASCADE ON UPDATE CASCADE,
    date_placed TIMESTAMP NOT NULL,
    color stone_color NOT NULL,
    processed processed_state NOT NULL,
    PRIMARY KEY (x, y)
);
CREATE TABLE stone_groups (
    id INTEGER NOT NULL,
    opposing_grid_point_count INTEGER NOT NULL,
    total_grid_point_count INTEGER NOT NULL,
    PRIMARY KEY (id)
);
CREATE TABLE stone_group_pointers (
    id INTEGER NOT NULL,
    stone_group INTEGER NOT NULL REFERENCES stone_groups (id) ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (id)
);
