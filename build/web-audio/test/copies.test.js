// Every built copy of one template, an edit reaching each (mockup/src/libs/build/web-audio/copies.ts), on an owner of the test's
// own that records what it's told: a value on every copy where the copies have it, settings on every copy in one change, the
// copies as they are when the edit is made
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Copies } from '../index.ts';
import { BLOCKS } from '../../../plan/blocks/index.ts';

// a block as a plan has it, its params and settings at their defaults
function block(name, kind) {
  const { inputs, outputs, params, settings } = BLOCKS[kind];
  const jack = ({ name: jackName }) => ({ name: jackName, channels: 2 });
  const at = (spec) => ({ spec, value: spec.default });
  return {
    name,
    kind,
    inputs: inputs.map(jack),
    outputs: outputs.map(jack),
    params: params.map(at),
    settings: settings.map(at),
  };
}
// a composite of its children, as a plan has it
function composite(name, children) {
  return {
    name,
    kind: 'Room',
    inputs: [],
    outputs: [],
    params: [],
    settings: [],
    children,
    wires: [],
    macros: [],
    pools: [],
  };
}
// a desk of three rooms, each a level and a reverb, and a channel with neither; an owner recording what it's told
function deskOf() {
  const room = (name) => composite(name, [composite('room', [block('level', 'gain'), block('reverb', 'reverb')])]);
  const plan = {
    version: 1,
    node: composite('', [room('reverb'), room('far reverb'), room('hall'), block('sings', 'gain')]),
  };
  const told = [];
  const owner = {
    plan,
    set: (address, value, when) => told.push(['set', address.join('/'), value, when]),
    settings: (changed) => told.push(['settings', changed]),
  };
  return { owner, told };
}

test('a value set on every copy, at its address under each, gliding where it says; nothing where the copies have nothing there', () => {
  const { owner, told } = deskOf();
  const copies = new Copies(owner, () => [
    ['reverb', 'room'],
    ['far reverb', 'room'],
  ]);
  copies.set(['level', 'gain'], 0.5, { glide: 0.05 });
  copies.set(['level', 'drive'], 2);
  assert.deepEqual(told, [
    ['set', 'reverb/room/level/gain', 0.5, { glide: 0.05 }],
    ['set', 'far reverb/room/level/gain', 0.5, { glide: 0.05 }],
  ]);
});

test('settings changed on every copy, by their addresses under each, in one change: what is built built again once', () => {
  const { owner, told } = deskOf();
  new Copies(owner, () => [
    ['reverb', 'room'],
    ['far reverb', 'room'],
  ]).settings({ 'reverb/length': 4.5 });
  assert.deepEqual(told, [['settings', { 'reverb/room/reverb/length': 4.5, 'far reverb/room/reverb/length': 4.5 }]]);
});

test('the copies as they are when the edit is made: one added since reached, one let go not', () => {
  const { owner, told } = deskOf();
  let copies = [['reverb', 'room']];
  const edited = new Copies(owner, () => copies);
  edited.set(['level', 'gain'], 0.2);
  copies = [['hall', 'room']];
  edited.set(['level', 'gain'], 0.3);
  assert.deepEqual(
    told.map(([, address, value]) => [address, value]),
    [
      ['reverb/room/level/gain', 0.2],
      ['hall/room/level/gain', 0.3],
    ],
  );
});
