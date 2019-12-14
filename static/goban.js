class Goban {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.grid_ratio = 22/23.7;
        //TODO use grid height instead
        this.grid_width = 40;
        this.offset = {x:60, y:60};
        this.panning = false;
        this.panning_from = {x:0, y:0};
        this.panning_touch_id = null;
        this.stones = [];
        this.stone_color = 'white';

        this.initial_touch_position = {x: -1024, y: -1024};

        canvas.addEventListener('mousedown', (e) => this.handle_press(e.clientX, e.clientY));
        canvas.addEventListener('mouseup', (e) => this.handle_release(e.clientX, e.clientY));
        canvas.addEventListener('mousemove', (e) => this.handle_move(e.clientX, e.clientY));
        canvas.addEventListener('mouseout', (e) => this.handle_out());

        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length != 1) {
                this.panning = false;
                return;
            }
            this.panning_from.x = e.touches[0].clientX;
            this.panning_from.y = e.touches[0].clientY;
            this.initial_touch_position = {x: e.touches[0].clientX, y: e.touches[0].clientY};
            this.panning_touch_id = e.touches[0].identifier;
            this.panning = true;
        });
        canvas.addEventListener('touchend', (e) => {
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                if (touch.identifier == this.panning_touch_id) {
                    this.panning = false;
                    this.panning_touch_id = null;
                    if (this.is_click(touch.clientX, touch.clientY)) {
                        this.grid_click_release(touch.clientX, touch.clientY);
                    }
                }
            }
        });
        canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length != 1 || e.touches[0].identifier != this.panning_touch_id) {
                this.panning = false;
                this.panning_touch_id = null;
                return;
            }
            const delta_x = e.touches[0].clientX - this.panning_from.x;
            const delta_y = e.touches[0].clientY - this.panning_from.y;
            this.offset.x += delta_x;
            this.offset.y += delta_y;
            this.panning_from.x = e.touches[0].clientX;
            this.panning_from.y = e.touches[0].clientY;
            window.requestAnimationFrame(() => this.draw());
        });
    }

    handle_press(x, y) {
        this.panning = true;
        this.panning_from.x = x;
        this.panning_from.y = y;
        this.initial_touch_position = {x: x, y: y};
    }

    handle_release(x, y) {
        this.panning = false;
        if (this.is_click(x, y)) {
            this.grid_click_release(x, y);
        }
    }

    handle_move(x, y) {
        if (!this.panning) {
            return;
        }
        const delta_x = e.clientX - this.panning_from.x;
        const delta_y = e.clientY - this.panning_from.y;
        this.offset.x += delta_x;
        this.offset.y += delta_y;
        this.panning_from.x = e.clientX;
        this.panning_from.y = e.clientY;
        window.requestAnimationFrame(() => this.draw());
    }

    handle_out() {
        this.panning = false;
    }

    is_click(x, y) {
        const threshold = 8;
        const delta_x = Math.abs(x - this.initial_touch_position.x);
        const delta_y = Math.abs(y - this.initial_touch_position.y);
        return delta_x < threshold && delta_y < threshold;
    }

    grid_click_release(x, y) {
        const out_pos = this.to_grid_position(x, y);
        if (!this.unconfirmed_stone) {
            this.place_unconfirmed_stone(this.stone_color, out_pos);
        } else {
            if (this.unconfirmed_stone.position.x == out_pos.x &&
                this.unconfirmed_stone.position.y == out_pos.y) {
                this.confirm_stone_placement();
            } else {
                this.place_unconfirmed_stone(this.stone_color, out_pos);
            }
        }
        window.requestAnimationFrame(() => this.draw());
    }

    to_grid_position(x, y) {
        x = Math.floor((x - this.offset.x + (0.5*this.grid_width))/this.grid_width);
        y = Math.floor((y - this.offset.y + 0.5*(this.grid_width/this.grid_ratio))/(this.grid_width/this.grid_ratio));
        return {x:x, y:y};
    }

    draw_grid() {
        const grid_width = this.grid_width;
        const grid_height = grid_width / this.grid_ratio;

        const x_offset = this.offset.x % grid_width;
        const y_offset = this.offset.y % grid_height;

        for (let x = x_offset; x < this.canvas.width; x += grid_width) {
            this.ctx.beginPath();
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = 'black';
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = y_offset; y < this.canvas.height; y += grid_height) {
            this.ctx.beginPath();
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = 'black';
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    draw_stone(color, pos, unconfirmed) {
        const x = pos.x * this.grid_width + this.offset.x;
        const y = pos.y * (this.grid_width/this.grid_ratio) + this.offset.y;
        this.ctx.beginPath();
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = 'black';
        this.ctx.fillStyle = color;
        //TODO stone width
        if (unconfirmed) {
            this.ctx.strokeStyle = color;
            this.ctx.fillStyle = 'rgba(0,0,0,0)';
        }
        this.ctx.arc(x, y, this.grid_width*0.5-3, 0, 2*Math.PI);
        this.ctx.fill();
        this.ctx.stroke();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.draw_grid();
        this.stones.forEach((stone) => {
            this.draw_stone(stone.color, stone.position);
        });
        if (this.unconfirmed_stone) {
            this.draw_stone(this.unconfirmed_stone.color, this.unconfirmed_stone.position, true);
        }
    }

    point_empty(pos) {
        for (let i = 0; i < this.stones.length; i++) {
            const stone = this.stones[i];
            if (pos.x == stone.position.x && pos.y == stone.position.y) {
                return false;
            }
        }
        return true;
    }

    place_unconfirmed_stone(color, pos) {
        if (this.point_empty(pos)) {
            this.unconfirmed_stone = {color: color, position: pos};
        }
    }

    confirm_stone_placement() {
        this.stones.push(this.unconfirmed_stone);
        this.unconfirmed_stone = null;
    }

    resize() {
        //TODO window.devicePixelRatio || 1
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        window.requestAnimationFrame(() => this.draw());
    }

}
