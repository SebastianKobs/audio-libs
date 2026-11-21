// The Ebers-Moll PNP's unit tests (dsp/circuits/): its two currents from its two junction voltages, and their slopes.
// Checked against the law itself, against finite differences, and against ngspice-42's operating point of the
// Rangemaster with the same OC44 values (a common-emitter stage on -9 V, run by hand on 2026-11-21), at 22.765313 °C:
// ngspice takes Vt from the temperature (kT/q, CODATA 2014), and only there is it the 25.5 mV the values were measured at.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EbersMollPnp, OC44_EBERS_MOLL } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

const oc44 = new EbersMollPnp(OC44_EBERS_MOLL);
const at = (emitterBase, emitterCollector) => oc44.currentsAt(emitterBase, emitterCollector, fresh());
const fresh = () => ({
  base: 0,
  collector: 0,
  baseByEmitterBase: 0,
  baseByEmitterCollector: 0,
  collectorByEmitterBase: 0,
  collectorByEmitterCollector: 0,
});
const relative = (actual, expected) => Math.abs(actual / expected - 1);

test('no current flows with no voltage across either junction', () => {
  const currents = at(0, 0);
  near(currents.base, 0);
  near(currents.collector, 0);
});

test('amplifying, the collector carries the forward gain times the base current', () => {
  const currents = at(0.2, 5); // the emitter-base junction on, the collector-base one held off
  assert.ok(
    relative(currents.collector / currents.base, OC44_EBERS_MOLL.forwardGain) < 0.01,
    `${currents.collector / currents.base}`,
  );
});

test('amplifying, the collector current grows tenfold for each Nf·Vt·ln 10 more across the emitter-base junction', () => {
  const { forwardIdeality, thermalVoltage } = OC44_EBERS_MOLL;
  const decade = forwardIdeality * thermalVoltage * Math.LN10; // about 62 mV
  const ratio = at(0.15 + decade, 5).collector / at(0.15, 5).collector;
  assert.ok(relative(ratio, 10) < 1e-3, `${ratio}`);
});

test('saturated, both junctions on, the collector carries less than the forward gain times the base current', () => {
  const currents = at(0.25, 0.05); // the collector 50 mV from the emitter: its junction on too
  assert.ok(
    currents.collector / currents.base < OC44_EBERS_MOLL.forwardGain / 2,
    `${currents.collector / currents.base}`,
  );
});

test('its slopes are the changes of its currents, at rest, amplifying, saturated and reversed', () => {
  const step = 1e-7;
  for (const [emitterBase, emitterCollector] of [
    [0.128, 5.8],
    [0.25, 0.05],
    [0.3, 0.1],
    [-0.2, -3],
  ]) {
    const here = at(emitterBase, emitterCollector);
    const byBase = at(emitterBase + step, emitterCollector);
    const byCollector = at(emitterBase, emitterCollector + step);
    const slope = (moved, name) => (moved[name] - here[name]) / step;
    const where = `at Veb ${emitterBase} V, Vec ${emitterCollector} V`;
    const within = (expected) => Math.abs(expected) * 1e-4 + 1e-12;
    near(here.baseByEmitterBase, slope(byBase, 'base'), `the base by Veb ${where}`, within(here.baseByEmitterBase));
    near(
      here.baseByEmitterCollector,
      slope(byCollector, 'base'),
      `the base by Vec ${where}`,
      within(here.baseByEmitterCollector),
    );
    near(
      here.collectorByEmitterBase,
      slope(byBase, 'collector'),
      `the collector by Veb ${where}`,
      within(here.collectorByEmitterBase),
    );
    near(
      here.collectorByEmitterCollector,
      slope(byCollector, 'collector'),
      `the collector by Vec ${where}`,
      within(here.collectorByEmitterCollector),
    );
  }
});

test('at the Rangemaster’s operating point it carries the currents ngspice found there', () => {
  // ngspice to 13 digits, its tolerances tight and its GMIN 1e-18 S (by default 1e-12 S across each junction):
  // Veb 0.12792667321469 V, Vec 5.8137657903442 V, the collector at -6.712960631929 V, the emitter current
  // 0.23056277989344 mA; 6 digits are not enough, 5 µV on Veb moving the current by 2e-4
  const currents = at(0.12792667321469, 5.8137657903442);
  const collector = (-6.712960631929 - -9) / 10e3; // through the 10 kΩ load to -9 V
  assert.ok(relative(currents.collector, collector) < 1e-6, `${currents.collector}`);
  assert.ok(
    relative(currents.collector + currents.base, 0.23056277989344e-3) < 1e-6,
    `${currents.collector + currents.base}`,
  );
});

test('writes into what it is handed and hands it back, making nothing new for a sample', () => {
  const into = fresh();
  assert.equal(oc44.currentsAt(0.1, 4, into), into);
});
