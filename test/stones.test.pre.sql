DROP TYPE stone_color;
CREATE TYPE stone_color as ENUM ('black', 'white');
DROP TYPE processed_state;
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

INSERT INTO stones (x, y, placed_by, date_placed, color, processed) VALUES (12, 34, 'first_test_user', '2019-12-13T14:13:12.345Z', 'white', 'processed');
INSERT INTO stones (x, y, placed_by, date_placed, color, processed) VALUES (-12, -34, 'second_test_user', '2019-12-15T14:13:12.345Z', 'black', 'processing');
INSERT INTO stones (x, y, placed_by, date_placed, color, processed) VALUES (-123, -456, 'first_test_user', '2019-12-15T14:13:12.345Z', 'white', 'unprocessed');
INSERT INTO stones (x, y, placed_by, date_placed, color, processed) VALUES (-456, -789, 'second_test_user', '2019-12-15T14:13:12.345Z', 'white', 'processing');
