// Goban
//     constructor(canvas)
//     
//         addsEventListeners: mousedown, mouseup, mouseout, mousemove, touchstart, touchend, touchmove
//         
//         EventListener calls on_press: mousedown, touchstart
// 
//         EventListener calls on_release: mouseup, touchend
// 
//         EventListener calls on_move: mousemove, touchmove
//            
// 
//         touchstart calls on_press when single-touch
// 
//         touchstart, touchmove:
//             stops panning when touchs.length > 1
// 
//         touchend calls on_release when single-touch released
// 
//         touchend does not call on_release when multi-touch release
// 
//     on_press(x, y)
//     on_move(x, y)
//     on_release(x, y)
//     
//     is_click_release(x, y)
//         click_press_position
//         threshold
// 
//     on_grid_click_release(x, y)
//         calls requestAnimationFrame
//         calls place_unconfirmed_stone when no confirmed stone
//         confirms unconfirmed stone when clicked on
// 
//     to_grid_position(x, y)
// 
//     draw_grid?
//     draw_stone?
//     draw?
// 
//     is_point_empty(pos)
//         
//     place_unconfirmed_stone(color, pos)
// 
//     confirm_stone_placement()
// 
//     resize()
//         calls requestAnimationFrame
//         width, height, devicePixelRatio...
// 
//     change_team(color)   
