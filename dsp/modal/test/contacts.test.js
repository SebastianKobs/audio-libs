// The contacts' unit tests (dsp/modal/): contacts between points of mode banks, or a point and a barrier, every
// force solved at once each sample. A barrier pushes a bank ahead; the energy is kept without damping, as contacts
// open and close; a preload keeps a contact linear until a strike overcomes it; two contacts on one bank, and one
// between two banks; a stiff contact struck hard. No audio: the positions and energies read.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ContactLaw, Contacts, ModeBank } from '../index.ts';

const RATE = 48000;
const TIP = 0;
const BRIDGE = 1;
// a strike that swings the tip about 0.1 mm
const STRIKE = 1e4;

// a tongue's first three bending modes at C4, shaped at its tip and at the bridge
function tongue(decayTime = Infinity) {
  return new ModeBank(
    [
      { frequency: 262, decayTime, shape: [1, 0.2] },
      { frequency: 1703, decayTime, shape: [0.9, -0.5] },
      { frequency: 4533, decayTime, shape: [0.8, 0.6] },
    ],
    RATE,
  );
}

// the bridge under the tongue: the tongue presses into it moving down
function bridge(bank, values) {
  return { law: new ContactLaw(values), on: { bank, point: BRIDGE }, facing: -1 };
}

// runs a number of samples, handing each one's sample number to `each` after it
function run(contacts, samples, each = () => {}) {
  for (let i = 0; i < samples; i++) {
    contacts.advance();
    each(i);
  }
}

test('a barrier moved into a bank pushes it ahead, held by as much force as the bank pushes back', () => {
  const bank = new ModeBank([{ frequency: 262, decayTime: 0.05, shape: [1] }], RATE);
  const thumb = { law: new ContactLaw({ stiffness: 1e12, exponent: 1.5 }), on: { bank, point: TIP }, barrier: 1e-3 };
  const contacts = new Contacts([thumb], RATE);
  const ramp = RATE / 10;
  run(contacts, ramp, (i) => contacts.moveBarrier(0, 1e-3 - (3e-3 * (i + 1)) / ramp)); // down to -2 mm
  run(contacts, RATE / 2);
  const position = bank.position(TIP);
  assert.ok(position > -2e-3, 'pressed up into the thumb');
  assert.ok(Math.abs(position + 2e-3) < 2e-5, `held at ${position}`);
  const spring = (2 * Math.PI * 262) ** 2 * -position; // the mode's own pull back, per unit of its mass
  assert.ok(Math.abs(contacts.force(0) / spring - 1) < 0.01, `the thumb holds ${contacts.force(0)} against ${spring}`);
});

test('without damping, the energy is kept as a preloaded contact opens and closes', () => {
  const bank = tongue();
  const contacts = new Contacts([bridge(bank, { stiffness: 1e9, exponent: 1.5, preload: 20 })], RATE);
  bank.push(TIP, 3 * STRIKE);
  contacts.advance();
  const start = contacts.energy();
  let opened = 0;
  run(contacts, RATE / 2, () => {
    if (contacts.force(0) === -20) {
      opened++;
    }
  });
  assert.ok(opened > 0, 'it opened');
  assert.ok(Math.abs(contacts.energy() / start - 1) < 1e-6, `kept: ${contacts.energy() / start}`);
  assert.equal(contacts.stalls, 0);
});

test('with damping, the energy never rises', () => {
  const bank = tongue(2);
  const contacts = new Contacts([bridge(bank, { stiffness: 1e9, exponent: 1.5, damping: 1e4, preload: 20 })], RATE);
  bank.push(TIP, 3 * STRIKE);
  contacts.advance();
  let before = contacts.energy();
  run(contacts, RATE / 2, (i) => {
    assert.ok(contacts.energy() <= before * (1 + 1e-9), `rose at sample ${i}`);
    before = contacts.energy();
  });
});

test('under its preload a linear contact stays linear; a strike that overcomes it does not', () => {
  // the tip's swing after a strike of a size, the bridge a linear spring while it holds
  const swing = (size) => {
    const bank = tongue(1);
    // a preload that a soft strike's swing at the bridge (under 750) stays inside, a hard one's (over 40 000) not
    const contacts = new Contacts([bridge(bank, { stiffness: 1e9, exponent: 1, preload: 2000 })], RATE);
    bank.push(TIP, size);
    const positions = [];
    let opened = false;
    run(contacts, RATE / 10, () => {
      positions.push(bank.position(TIP));
      opened ||= contacts.force(0) === -2000;
    });
    return { positions, opened };
  };
  // the largest difference between a swing and twice another, against the larger one's peak
  const unlike = (twice, once) =>
    Math.max(...twice.map((x, i) => Math.abs(x - 2 * once[i]))) / Math.max(...twice.map(Math.abs));

  const soft = swing(STRIKE / 10);
  const softer = swing(STRIKE / 20);
  assert.equal(soft.opened, false, 'a soft strike never lifts the tongue');
  assert.ok(unlike(soft.positions, softer.positions) < 1e-9, 'twice the strike, twice the swing');

  const hard = swing(10 * STRIKE);
  const half = swing(5 * STRIKE);
  assert.equal(hard.opened, true, 'a hard strike lifts it');
  assert.ok(unlike(hard.positions, half.positions) > 1e-3, 'twice the strike, not twice the swing');
});

test('two contacts on one bank are solved together, the energy kept', () => {
  const bank = tongue();
  const thumb = { law: new ContactLaw({ stiffness: 1e10, exponent: 1.5 }), on: { bank, point: TIP }, barrier: 0 };
  const contacts = new Contacts([bridge(bank, { stiffness: 1e9, exponent: 1.5, preload: 20 }), thumb], RATE);
  bank.push(TIP, 3 * STRIKE);
  contacts.advance();
  const start = contacts.energy();
  let thumbHeld = 0;
  run(contacts, RATE / 4, () => {
    thumbHeld = Math.max(thumbHeld, contacts.force(1));
  });
  assert.ok(thumbHeld > 0, 'the tongue hit the thumb resting on it');
  assert.ok(Math.abs(contacts.energy() / start - 1) < 1e-6, `kept: ${contacts.energy() / start}`);
  assert.equal(contacts.stalls, 0);
});

test('a contact between two banks moves the other one, the energy kept between them', () => {
  const tine = new ModeBank([{ frequency: 262, decayTime: Infinity, shape: [1, 1] }], RATE);
  const body = new ModeBank([{ frequency: 800, decayTime: Infinity, shape: [1] }], RATE);
  const joint = {
    law: new ContactLaw({ stiffness: 1e9, exponent: 1.5, preload: 20 }),
    on: { bank: tine, point: BRIDGE },
    against: { bank: body, point: 0 },
    facing: -1,
  };
  const contacts = new Contacts([joint], RATE);
  tine.push(TIP, 3 * STRIKE);
  contacts.advance();
  const start = contacts.energy();
  run(contacts, RATE / 4);
  assert.ok(body.energy() > 0, 'the body rings along');
  assert.ok(Math.abs(contacts.energy() / start - 1) < 1e-6, `kept: ${contacts.energy() / start}`);
});

test('a stiff contact struck hard never stalls its solve', () => {
  const bank = tongue();
  const contacts = new Contacts([bridge(bank, { stiffness: 1e14, exponent: 1.5, preload: 20 })], RATE);
  bank.push(TIP, 100 * STRIKE);
  run(contacts, RATE / 4);
  assert.equal(contacts.stalls, 0);
  assert.ok(Number.isFinite(bank.position(TIP)));
});

test("a contact barely moving, long after a strike, never stalls on rounding's floor", () => {
  // F3's tongue, six modes, a thumb resting on its tip: after 2 s the bridge moves by 10⁻⁸ against its
  // rest penetration of 7·10⁻⁶, and Newton's steps bounce on rounding at 10⁻¹⁶
  const ratios = [1, 1.0017, 6.5, 17.3, 34.4, 56.8];
  const shapes = [
    [1, 0.2],
    [1, 0.2],
    [0.9, -0.5],
    [0.8, 0.6],
    [0.7, -0.6],
    [0.6, 0.5],
  ];
  const decays = [4, 4, 1, 0.3, 0.15, 0.1];
  const bank = new ModeBank(
    ratios.map((ratio, mode) => ({ frequency: 174.61 * ratio, decayTime: decays[mode], shape: shapes[mode] })),
    RATE,
  );
  const thumb = {
    law: new ContactLaw({ stiffness: 1e10, exponent: 1.5, damping: 1e3 }),
    on: { bank, point: TIP },
    barrier: 0,
  };
  const contacts = new Contacts(
    [bridge(bank, { stiffness: 1e9, exponent: 1.5, damping: 1e4, preload: 20 }), thumb],
    RATE,
  );
  bank.push(TIP, 3 * STRIKE);
  run(contacts, 2 * RATE);
  assert.equal(contacts.stalls, 0);
});
