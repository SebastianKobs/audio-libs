// ---------- plan/format/address: where a param or a setting is in a plan ----------
// Its path by names from the plan's top, as a parent puts its child's name in front:
// desk/channel 3/utility/level. Written with slashes; a name holds none.

// an address: the names on the way down, the param's or the setting's last
export type Address = readonly string[];
