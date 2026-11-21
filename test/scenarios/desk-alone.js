// Scenario 4: a desk alone, as a library's user writes it: planned from a desk written short, built for
// Web Audio into a context handed in, a value set by its address, a strip muted; no clock, no sequencer.
import { DESK_FORMS, deskTemplates } from '../../modular-audio/plan/desk/index.ts';
import { Planner } from '../../modular-audio/plan/planner/index.ts';
import { WebAudioBuilder } from '../../modular-audio/build/web-audio/index.ts';
import { MixingDesk } from '../../modular-audio/build/desk/mixing/index.ts';

// a desk written short: two channels into the master
const SMALL = {
  kind: 'Small',
  channels: [
    { name: 'voice', role: 'channel' },
    { name: 'drums', role: 'channel' },
    { name: 'master', role: 'master' },
  ],
};

// the desk built into the context's destination, the voice's volume set, the drums muted
export function mixSmallDesk(context) {
  const desk = new MixingDesk({ plan: new Planner(deskTemplates(SMALL), DESK_FORMS).plan('Small') });
  const builder = new WebAudioBuilder({ context, beat: () => 0.5 });
  desk.build((plan) => builder.build(plan, { into: context.destination }));
  desk.set(['voice', 'volume'], 0.5);
  desk.mute('drums', true);
  return desk;
}
