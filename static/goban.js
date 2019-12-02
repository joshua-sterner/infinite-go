class Goban {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.grid_ratio = 22/23.7;
        this.grid_width = 40;
        this.offset = {x:16, y:16};
        this.panning = false;
        this.panning_from = {x:0, y:0};
        this.panning_touch_id = null;
        this.stones = [];
        canvas.addEventListener('mousedown', (e) => {
            this.panning = true;
            this.panning_from.x = e.clientX;
            this.panning_from.y = e.clientY;
        });
        canvas.addEventListener('mouseup', (e) => {
            this.panning = false;
        });
        canvas.addEventListener('mouseout', (e) => {
            this.panning = false;
        });
        canvas.addEventListener('mousemove', (e) => {
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
        });
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length != 1) {
                this.panning = false;
                return;
            }
            this.panning_from.x = e.touches[0].clientX;
            this.panning_from.y = e.touches[0].clientY;
            this.panning_touch_id = e.touches[0].identifier;
            this.panning = true;
        });
        canvas.addEventListener('touchend', (e) => {
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                if (touch.identifier == this.panning_touch_id) {
                    this.panning = false;
                    this.panning_touch_id = null;
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


    foo() {
        console.log(this.canvas);
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

    draw_stone(color, pos) {
        const x = pos.x * this.grid_width + this.offset.x;
        const y = pos.y * (this.grid_width/this.grid_ratio) + this.offset.y;
        this.ctx.beginPath();
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = 'black';
        this.ctx.fillStyle = color;
        //TODO stone width
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
        this.draw_stone('white', {x:2, y:3});
        this.draw_stone('black', {x:5, y:7});
        this.draw_stone('black', {x:6, y:6});
        this.draw_stone('black', {x:6, y:8});
        this.draw_stone('white', {x:6, y:7});
        this.draw_stone('white', {x:7, y:8});
        this.draw_stone('white', {x:7, y:6});
        this.draw_stone('white', {x:8, y:7});

    }

    resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        window.requestAnimationFrame(() => this.draw());
    }

}
const goban = new Goban(document.getElementById('goban'));

window.addEventListener('resize', () => goban.resize());
window.addEventListener('load', () => goban.resize());
