# build/track-channels

A track's channel on a mixing desk (`libs/build/desk/`): no clock, a time now handed in. Each track's channel is its pool's copy, added the first time its track is played on, the mix applied to it. Its instrument plugs in by a way in of its own. What its notes set on it is set at their time, a setup's rules saying which.

| | |
|---|---|
| `TrackChannels` | its tracks' channels: each its pool's copy, added the first time it's played on, the mix applied to it; its instrument's way in; a change its notes set on it at its time, none it doesn't (`track-channels.ts`, its entry's, the sequenced desk's own) |
| `Change`, `whenOf()` | a change to a param by its address: its value, when it lands, gliding where it says; `whenOf()` puts it on the audio's clock, at its time if it's to come, else now (`change.ts`) |

Tested in node, in its `test/` folder, on a mixing desk and the desk library's stand-in for what's built (`libs/build/desk/test/built.js`) and small studio (`libs/plan/desk/test/desks.js`): a track's way in once, a change its notes set at its time, none it doesn't, nor a live track's (`test/track-channels.test.js`).
