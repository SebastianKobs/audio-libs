# libs/view/tracks/readout

The session view's, the clips' and the arrangement's: the views' jacks, in the views' own words: what their models read, each a readout, labelled as a jack on a module's panel is, by its kind, read when the model wants (the arrangement's clock, telling each 16th too, the one exception); what's done goes out on the app's bus as each plan's message. Whatever answers a readout fits it by its shape. Before the view models in the import order, so a model, its drawer and what answers it share one jack.

| | |
|---|---|
| `arrangement.ts` | What the arrangement reads, in its own words, whatever answers fitting by its shape (the view models' `arrangement/ports.ts` until SHAPE5b3, `arrangement/inputs.ts` until SHAPE5b6): the recording, its regions and lanes (`RecordingReadout`, a MIDI sequencer's recorder); the tracks in groups, a group for a kind played live or played back, each its kind and whether it's played live (since SHAPE5a0d4a, the session view's `Surface` before), a clip's name and whether it's still there (`TracksReadout`, the control surface that played them, the session's tracks reading it too); the playhead (`PlayheadReadout`, the transport); what the desk declares (`DeclaredReadout`); the clock (`ArrangementClock`) |
| `ClipSlots` | clips in slots on tracks, as what holds them knows them: a track's slots in the order put (`slotsOn(track)`), whether a slot's clip plays (`playing(slot)`); a clip player (`libs/clip-player/`) answers it for its slots, a control surface for the clips it holds on no player (`clips.ts`) |
| `ClipTrack`, `HeldClips`, `ClipsReadout` | a clip track as a view shows it: its key, its name, the roles whose instruments play its clips, whether its clips are launched and deleted from the view, and where they're held, each what holds them and their track there; the control surface the clips were played on, its clip tracks in order, a clip's name and how many notes it holds (`clips.ts`; `ClipSurface` until SHAPE5b3) |

Its readers: the view models (`libs/view/tracks/models/`), the session view's, the device view's, the arrangement's and the clip tracks'.
