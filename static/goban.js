class Goban {
    constructor(canvas) {
        this._canvas = canvas;
        this._ctx = canvas.getContext('2d');
        this._grid_ratio = 22/23.7;
        //TODO use grid height instead
        this._grid_width = 40;
        this._panning = false;
        this._panning_from = {x:0, y:0};
        this._panning_touch_id = null;
        this.stones = [];
        this._stone_color = 'white';
        this.offset = {x: 0, y: 0};
        this._initial_touch_position = {x: -1024, y: -1024};
        this.unconfirmed_stone = null;

        canvas.addEventListener('mousedown', (e) => this._handle_press(e.clientX, e.clientY));
        canvas.addEventListener('mouseup', (e) => this._handle_release(e.clientX, e.clientY));
        canvas.addEventListener('mousemove', (e) => this._handle_move(e.clientX, e.clientY));
        canvas.addEventListener('mouseout', () => this._handle_out());

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length != 1) {
                this._handle_out();
                return;
            }
            this._handle_press(e.touches[0].clientX, e.touches[0].clientY);
        });
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (e.touches.length == 0 && e.changedTouches.length == 1) {
                this._handle_release(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
            }
        });
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length == 1) {
                this._handle_move(e.touches[0].clientX, e.touches[0].clientY);
            }
        });
        canvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            if (e.touches.length == 1) {
                this._handle_out();
            }
        });
    }

    resize() {
        const device_pixel_ratio  = window.devicePixelRatio || 1;
        this._canvas.width = this._canvas.clientWidth * device_pixel_ratio;
        this._canvas.height = this._canvas.clientHeight * device_pixel_ratio;
        this._ctx.scale(device_pixel_ratio, device_pixel_ratio);
        this._update_viewport();
        window.requestAnimationFrame(() => this._draw());
    }

    change_team(color) {
        if (this._team_change_cb && this._stone_color != color) {
            this._team_change_cb(color);
        }
        this._stone_color = color;
        if (this.unconfirmed_stone) {
            this.unconfirmed_stone.color = color;
        }
        window.requestAnimationFrame(() => this._draw());
    }

    _handle_press(x, y) {
        this._panning = true;
        this._panning_from.x = x;
        this._panning_from.y = y;
        this._initial_touch_position = {x: x, y: y};
    }

    _handle_release(x, y) {
        this._panning = false;
        if (this._is_click(x, y)) {
            this._grid_click_release(x, y);
        }
    }

    _handle_move(x, y) {
        if (!this._panning) {
            return;
        }
        const delta_x = x - this._panning_from.x;
        const delta_y = y - this._panning_from.y;
        this.offset.x += delta_x;
        this.offset.y += delta_y;
        this._panning_from.x = x; 
        this._panning_from.y = y;
        this._update_viewport();
        window.requestAnimationFrame(() => this._draw());
    }

    _handle_out() {
        this._panning = false;
    }

    _grid_click_release(x, y) {
        const out_pos = this._to_grid_position(x, y);
        if (!this.unconfirmed_stone) {
            this._place_unconfirmed_stone(this._stone_color, out_pos);
        } else {
            if (this.unconfirmed_stone.x == out_pos.x &&
                this.unconfirmed_stone.y == out_pos.y) {
                this._request_stone_placement();
            } else {
                this._place_unconfirmed_stone(this._stone_color, out_pos);
            }
        }
        window.requestAnimationFrame(() => this._draw());
    }

    _is_click(x, y) {
        const threshold = 8;
        const delta_x = Math.abs(x - this._initial_touch_position.x);
        const delta_y = Math.abs(y - this._initial_touch_position.y);
        return delta_x < threshold && delta_y < threshold;
    }



    _to_grid_position(x, y) {
        x = Math.floor((x - this.offset.x + (0.5*this._grid_width))/this._grid_width);
        y = Math.floor((y - this.offset.y + 0.5*(this._grid_width/this._grid_ratio))/(this._grid_width/this._grid_ratio));
        return {x:x, y:y};
    }

    _draw_grid() {
        const grid_width = this._grid_width;
        const grid_height = grid_width / this._grid_ratio;

        const x_offset = this.offset.x % grid_width;
        const y_offset = this.offset.y % grid_height;

        for (let x = x_offset; x < this._canvas.width; x += grid_width) {
            this._ctx.beginPath();
            this._ctx.lineWidth = 2;
            this._ctx.strokeStyle = 'black';
            this._ctx.moveTo(x, 0);
            this._ctx.lineTo(x, this._canvas.height);
            this._ctx.stroke();
        }
        for (let y = y_offset; y < this._canvas.height; y += grid_height) {
            this._ctx.beginPath();
            this._ctx.lineWidth = 2;
            this._ctx.strokeStyle = 'black';
            this._ctx.moveTo(0, y);
            this._ctx.lineTo(this._canvas.width, y);
            this._ctx.stroke();
        }
    }

    _draw_stone(color, pos, unconfirmed, unsynced) {
        const x = pos.x * this._grid_width + this.offset.x;
        const y = pos.y * (this._grid_width/this._grid_ratio) + this.offset.y;
        this._ctx.beginPath();
        this._ctx.lineWidth = 2;
        this._ctx.strokeStyle = 'black';
        this._ctx.fillStyle = color;
        //TODO stone width
        if (unconfirmed) {
            this._ctx.strokeStyle = color;
            this._ctx.fillStyle = 'rgba(0,0,0,0)';
        }
        //TODO fix this
        unsynced = false;
        if (unsynced && !unconfirmed) {
            this._ctx.globalAlpha = 0.5;
        }
        this._ctx.arc(x, y, this._grid_width*0.5-3, 0, 2*Math.PI);
        this._ctx.fill();
        this._ctx.stroke();
        this._ctx.globalAlpha = 1.0;
    }

    _compute_viewport() {
        let viewport = {};
        viewport.left = Math.floor(-this.offset.x / this._grid_width + 0.5);
        viewport.right = Math.ceil((-this.offset.x + this._canvas.clientWidth) / this._grid_width - 0.5);
        let grid_height = this._grid_width / this._grid_ratio;
        viewport.top = Math.floor(-this.offset.y / grid_height + 0.5);
        viewport.bottom = Math.ceil((-this.offset.y + this._canvas.clientHeight) / grid_height - 0.5);
        return viewport;
    }

    _update_viewport() {
        let viewport = this._compute_viewport();
        if (!this._viewport) {
            this._viewport = viewport;
            if (this._viewport_change_cb) {
                this._viewport_change_cb(viewport);
            }
            return;
        }
        if (viewport.top != this._viewport.top ||
            viewport.bottom != this._viewport.bottom ||
            viewport.left != this._viewport.left ||
            viewport.right != this._viewport.right) {
            this._viewport = viewport;
            if (this._viewport_change_cb) {
                this._viewport_change_cb(viewport);
            }
        }
    }

    _draw() {
        this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
        this._draw_grid();
        this.stones.forEach((stone) => {
            this._draw_stone(stone.color, {x: stone.x, y: stone.y}, false, stone.unsynced);
        });
        if (this.unconfirmed_stone) {
            this._draw_stone(this.unconfirmed_stone.color, {x: this.unconfirmed_stone.x, y: this.unconfirmed_stone.y}, true);
        }
    }

    _point_empty(pos) {
        for (let i = 0; i < this.stones.length; i++) {
            const stone = this.stones[i];
            if (pos.x == stone.x && pos.y == stone.y) {
                return false;
            }
        }
        return true;
    }

    _place_unconfirmed_stone(color, pos) {
        if (this._point_empty(pos)) {
            this.unconfirmed_stone = {color: color, x: pos.x, y: pos.y, unsynced: true};
        }
    }

    _request_stone_placement() {
        this.stones.push(this.unconfirmed_stone);
        let stone = this.unconfirmed_stone;
        this.unconfirmed_stone = null;
        if (this._stone_placement_request_cb) {
            this._stone_placement_request_cb(stone);
        }
    }

    grant_stone_placement_request(stone) {
        this.stones.forEach((i) => {
            if (i.color == stone.color &&
                i.x == stone.x &&
                i.y == stone.y) {
                i.unsynced = false;
            }
        });
        window.requestAnimationFrame(() => this._draw());
    }

    deny_stone_placement_request(stone) {
        this.remove_stone(stone);
    }

    on_stone_placement_request(cb) {
        this._stone_placement_request_cb = cb;
    }

    on_viewport_change(cb) {
        this._viewport_change_cb = cb;
    }

    on_team_change(cb) {
        this._team_change_cb = cb;
    }

    set_stones(stones) {
        //TODO Fix this!
        this.stones = stones;
        window.requestAnimationFrame(() => this._draw());
    }

    /**
     * Sets the position of center of the viewport to the center of the provided viewport.
     *
     * @param {Object} viewport - The new viewport.
     */
    set_viewport(viewport) {
        //TODO test?
        let w = viewport.right - viewport.left;
        let h = viewport.bottom - viewport.top;
        let x = Math.round(w/2) + viewport.left;
        let y = Math.round(h/2) + viewport.top;
        let grid_height = this._grid_width / this._grid_ratio;
        let vw = this._canvas.clientWidth / this._grid_width;
        let vh = this._canvas.clientHeight / grid_height;
        this.offset.x = -this._grid_width * (x - vw/2);
        this.offset.y = -grid_height * (y - vh/2);
        window.requestAnimationFrame(() => this._draw());
    }

    /**
     * @returns {Object} - A copy of the current viewport.
     */
    get_viewport() {
        return this._compute_viewport();
    }

    /**
     * @param {Object} stone - The stone to add to the goban.
     */
    add_stone(stone) {
        for (let i = 0; i < this.stones.length; i++) {
            if (this.stones[i].x == stone.x &&
                this.stones[i].y == stone.y) {
                this.stones[i] = stone;
                return;
            }
        }
        this.stones.push(stone);
        window.requestAnimationFrame(() => this._draw());
    }

    /**
     * @param {Object} stone - The stone to remove from the goban.
     */
    remove_stone(stone) {
        for (let i = 0; i < this.stones.length; i++) {
            if (this.stones[i].x == stone.x &&
                this.stones[i].y == stone.y) {
                this.stones.splice(i, 1);
            }
        }
        window.requestAnimationFrame(() => this._draw());
    }
}
