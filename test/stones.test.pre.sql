INSERT INTO stone_groups (captured_perimeter, perimeter) VALUES (0, 4), (0, 4), (0, 4), (0, 4);
INSERT INTO stone_group_pointers (stone_group) VALUES (1), (2), (3), (4);

INSERT INTO users (username, email, password, date_created, viewport_top, viewport_right, viewport_bottom, viewport_left) VALUES ('first_test_user', 'nobody@nonexistent.tld', 'pw1', '2019-11-13T15:13:12.345Z', 10, 11, 12, 13);
INSERT INTO users (username, email, password, date_created, viewport_top, viewport_right, viewport_bottom, viewport_left) VALUES ('second_test_user', 'second@example.io', 'pw2', '2012-01-23T12:34:56.789Z', 6, 11, -6, -11);

INSERT INTO stones (x, y, placed_by, date_placed, color, stone_group_pointer) VALUES (12, 34, 'first_test_user', '2019-12-13T14:13:12.345Z', 'white', 1);
INSERT INTO stones (x, y, placed_by, date_placed, color, stone_group_pointer) VALUES (-12, -34, 'second_test_user', '2019-12-15T14:13:12.345Z', 'black', 2);
INSERT INTO stones (x, y, placed_by, date_placed, color, stone_group_pointer) VALUES (-123, -456, 'first_test_user', '2019-12-15T14:13:12.345Z', 'white', 3);
INSERT INTO stones (x, y, placed_by, date_placed, color, stone_group_pointer) VALUES (-456, -789, 'second_test_user', '2019-12-15T14:13:12.345Z', 'white', 4);

