function timestamps_equal(lhs, rhs) {
    const max_time_delta = 4; // milliseconds
    const ms_lhs = new Date(lhs).getTime();
    const ms_rhs = new Date(rhs).getTime();
    const time_delta = Math.abs(ms_lhs - ms_rhs);
    return time_delta < max_time_delta;
}

module.exports = {
    timestamps_equal: timestamps_equal
};
