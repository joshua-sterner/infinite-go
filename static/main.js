const goban = new Goban(document.getElementById('goban'));
goban.stones = [
    {color:'white', x:2, y:3},
    {color:'black', x:5, y:7},
    {color:'black', x:6, y:6},
    {color:'black', x:6, y:8},
    {color:'white', x:6, y:7},
    {color:'white', x:7, y:8},
    {color:'white', x:7, y:6},
    {color:'white', x:8, y:7},
    {color:'black', x:0, y:0},
    {color:'black', x:1, y:0},
    {color:'black', x:0, y:1},
];
window.addEventListener('resize', () => goban.resize());
window.addEventListener('load', () => {
    goban.resize();
    const panel = document.getElementById('panel');
    if (CSS.supports('backdrop-filter', 'blur(1px)')) {
        panel.classList.add('panel-backdrop-filter');
    }
    let ws = new WebSocket(`wss://${location.host}`);
    new InfiniteGoWebsocketClient(ws, goban);
});

/**
 * Opens the sidebar.
 */
function open_panel() {
    const panel_icon = document.getElementById('panel-icon');
    const panel = document.getElementById('panel');
    panel_icon.style.display = 'none';
    panel.style.display = 'grid';
    goban.resize();
}

/**
 * Closes the sidebar.
 */
function close_panel() {
    const panel_icon = document.getElementById('panel-icon');
    const panel = document.getElementById('panel');
    panel_icon.style.display = 'block';
    panel.style.display = 'none';
    goban.resize();
}

/**
 * @param {('black'|'white')} color The color of the team to switch to.
 */
function change_team(color) {
    const white_team_button = document.getElementById('white-team-button');
    const black_team_button = document.getElementById('black-team-button');
    let team_indicator = document.getElementById('team-indicator');
    if (color == 'white') {
        white_team_button.classList.add('active-team-button');
        black_team_button.classList.remove('active-team-button');
        team_indicator.innerHTML = 'Team: White';
    } else {
        black_team_button.classList.add('active-team-button');
        white_team_button.classList.remove('active-team-button');
        team_indicator.innerHTML = 'Team: Black';
    }
    goban.change_team(color);
}
