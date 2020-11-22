const goban = new Goban(document.getElementById('goban'));
window.addEventListener('resize', () => goban.resize());
window.addEventListener('load', () => {
    goban.resize();
    const panel = document.getElementById('panel');
    if (CSS.supports('backdrop-filter', 'blur(1px)')) {
        panel.classList.add('panel-backdrop-filter');
    }
    let ws_url = `wss://${location.host}`;
    if (dev_build) {
        ws_url = `ws://${location.host}`;
    }
    let ws = new WebSocket(ws_url);
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
