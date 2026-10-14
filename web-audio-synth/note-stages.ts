// ---------- libs/web-audio-synth/note-stages: a note's own stages, set by its per-note controllers (G0b; the space's until V3) ----------
import { BuiltModule, DEVICES, FILTER, GAIN, PAN_POT, type ModuleEngine, type Target } from '../web-audio-fx/index.ts';
import type { PerNoteControllerName, PerNoteValues } from '../midi/index.ts';

// the per-note controllers a note's stages answer, each with a stage of its own: #74 Brightness, #7 Volume, #10 Pan, #91 Effects 1 Depth
export type StageController = 'brightness' | 'volume' | 'pan' | 'effects 1 depth';

// the per-note controllers a note is heard by, and the port of its stage's module each sets: its air's cutoff, its level, its side;
// and its room's level
export const HEARD_PER_NOTE = Object.freeze({
  brightness: DEVICES.filter.ports.cutoff,
  volume: DEVICES.gain.ports.level,
  pan: DEVICES.pan.ports.pan,
} satisfies Partial<Record<PerNoteControllerName, string>>);
export const ROOM_PER_NOTE = Object.freeze({ 'effects 1 depth': DEVICES.gain.ports.level } satisfies Partial<
  Record<PerNoteControllerName, string>
>);

// a note's own stages, what a spot was (G0c3) and its voice's pan, set by the note's per-note controllers, not by an emitter of their
// own: the garden's emitter sends what it sets as them (mockup/architecture/done.md, G0). Built by the engine (F6c): its pan, the Pan
// module, a pan pot, at #10 Pan as it starts, as a voice was panned until V5, none for a note sent with none, a sound with no
// place; its air, the Filter module, its cutoff #74 Brightness; its dry gain, a Gain module, into `into`, its level #7 Volume; and its
// room's, another, into `room`, taken after the air, its level #91 Effects 1 Depth. Each only where its instrument answers its controller
// (answers, V3): with none, its air, its sound goes into `into` as it is; the room only after the air. A voice
// plays into its input. A controller that comes later glides there, as a synth smooths one, by the time constant the space's emitters
// glide by, from its time where that's to come. Let go once its note's controllers are detached, or its voice has stopped
export class NoteStages {
  readonly input: AudioNode;
  readonly #pan: BuiltModule | null;
  readonly #air: BuiltModule | null;
  readonly #dry: BuiltModule | null;
  readonly #room: BuiltModule | null;
  readonly #stages: ReadonlyMap<PerNoteControllerName, Target>; // by the controller that sets it; its pan set as it starts, by its params

  constructor(
    engine: ModuleEngine,
    {
      into,
      room = null,
      heard,
      answers,
    }: { into: AudioNode; room?: AudioNode | null; heard: PerNoteValues; answers: readonly StageController[] },
  ) {
    const air = (this.#air = answers.includes('brightness') ? new BuiltModule(engine, { patch: FILTER }) : null);
    const dry = (this.#dry = answers.includes('volume') ? new BuiltModule(engine, { patch: GAIN, into }) : null);
    const roomGain = (this.#room = roomOf(engine, room, air, answers));
    air?.output.connect(dry ? dry.input : into);
    this.#stages = stagesOf(air, dry, roomGain);
    setAsItStarts(this.#stages, heard);
    const front = frontOf(air, dry, into);
    const pan = (this.#pan = answers.includes('pan') ? panOf(engine, heard.pan, front) : null);
    this.input = pan ? pan.input : front;
  }
  // a controller that comes later: gliding there by its time constant, from a time to come, a context time, else from now; one it has no
  // stage for left alone
  glide(controller: PerNoteControllerName, value: number, timeConstant: number, from?: number): void {
    const stage = this.#stages.get(controller);
    stage?.stage.set(stage.port, value, { glide: timeConstant, from });
  }
  // each one's way out disconnected, its pan's too
  letGo(): void {
    this.#pan?.letGo();
    this.#air?.letGo();
    this.#dry?.letGo();
    this.#room?.letGo();
  }
}

// its room's gain, into the room, where it has one, its instrument answers #91 Effects 1 Depth and it has an air to take it after
function roomOf(
  engine: ModuleEngine,
  room: AudioNode | null,
  air: BuiltModule | null,
  answers: readonly StageController[],
): BuiltModule | null {
  if (!room || !air || !answers.includes('effects 1 depth')) {
    return null;
  }
  const gain = new BuiltModule(engine, { patch: GAIN, into: room });
  air.output.connect(gain.input); // taken after the air, so only with it
  return gain;
}
// each stage it has, by the controller that sets it
function stagesOf(
  air: BuiltModule | null,
  dry: BuiltModule | null,
  room: BuiltModule | null,
): Map<PerNoteControllerName, Target> {
  const stages = new Map<PerNoteControllerName, Target>();
  if (air) {
    stages.set('brightness', { stage: air, port: HEARD_PER_NOTE.brightness });
  }
  if (dry) {
    stages.set('volume', { stage: dry, port: HEARD_PER_NOTE.volume });
  }
  if (room) {
    stages.set('effects 1 depth', { stage: room, port: ROOM_PER_NOTE['effects 1 depth'] });
  }
  return stages;
}
// each stage at its per-note controller sent with the note, its value as it starts
function setAsItStarts(stages: ReadonlyMap<PerNoteControllerName, Target>, heard: PerNoteValues): void {
  for (const [controller, { stage, port }] of stages) {
    const value = heard[controller];
    if (value !== undefined) {
      stage.set(port, value, 'now');
    }
  }
}
// where its sound comes in, after its pan: its air, else its dry gain, else where it goes
function frontOf(air: BuiltModule | null, dry: BuiltModule | null, into: AudioNode): AudioNode {
  return air?.input ?? dry?.input ?? into;
}

// its pan pot in front of the rest, its air, at its pan; none for a note sent with none
function panOf(engine: ModuleEngine, pan: number | undefined, front: AudioNode): BuiltModule | null {
  if (pan === undefined) {
    return null;
  }
  return new BuiltModule(engine, { patch: PAN_POT, params: { pan }, into: front });
}
