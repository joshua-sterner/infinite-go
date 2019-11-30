const Goban = function(canvas) {

    const ctx = canvas.getContext('2d');

    const grid_ratio = 22/23.7;

    function draw_grid(grid_width, offset) {

        const grid_height = grid_width / grid_ratio;

        let x_offset = offset.x % grid_width;
        let y_offset = offset.y % grid_height;

        for (let x = x_offset; x < canvas.width; x += grid_width) {
            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'black';
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = y_offset; y < canvas.height; y += grid_height) {
            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'black';
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }
    
    function draw() {
        draw_grid(40, {x:16, y:16});
    }

    function resize() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        window.requestAnimationFrame(draw);
    }

    this.resize = resize;
}

const goban = new Goban(document.getElementById('goban'));

window.addEventListener('resize', goban.resize);
window.addEventListener('load', goban.resize);
