# view/control-surface

What a view's models read and play through, in the views' own words, types only: whatever answers fits them by its shape. Before the view models in the import order, so a model, its drawer and what answers it share one port.

| | |
|---|---|
| `ClipSlots` | clips in slots on tracks, as what holds them knows them: a track's slots in the order put (`slotsOn(track)`), whether a slot's clip plays (`playing(slot)`); a clip player (`libs/clip-player/`) answers it for its slots, a control surface for the clips it holds on no player (`clips.ts`) |
| `ClipTrack`, `HeldClips`, `ClipSurface` | a clip track as a view shows it: its key, its name, the roles whose instruments play its clips, whether its clips are launched and deleted from the view, and where they're held, each what holds them and their track there; the control surface the clips were played on, its clip tracks in order, a clip's name and how many notes it holds (`clips.ts`) |

Its readers: the clip tracks' view model (`libs/view/models/clip-tracks.ts`). SHAPE5b moves the view models' other ports in: the control surface a model reads and plays through (`ModelPort` today), a desk's, a preset's.
