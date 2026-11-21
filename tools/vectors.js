// ---------- what the tools that write the test vectors share ----------
// The vectors are this repo's test data (test-vectors/), written again only on purpose.
// Each tool writes its own; what they share is here:
//   - a file written there (written()), as a table, a case to a line (table());
//   - numbers rounded past a float's noise (roundedTo(), significant()).
import { mkdirSync, writeFileSync } from 'node:fs';

const VECTORS = new URL('../test-vectors/', import.meta.url);
const SIGNIFICANT = 10; // digits a value keeps where its size varies: a distance

// a file under test-vectors/, its folder made where it has none
export function written(path, text) {
  const url = new URL(path, VECTORS);
  mkdirSync(new URL('.', url), { recursive: true });
  writeFileSync(url, text);
}
// a file of cases, one to a line, so it reads as a table
export function table({ about, format = 1, cases }) {
  const lines = cases.map((one) => '    ' + JSON.stringify(one)).join(',\n');
  return `{\n  "about": ${JSON.stringify(about)},\n  "format": ${format},\n  "cases": [\n${lines}\n  ]\n}\n`;
}
// a number to so many decimals, past a float's noise
export function roundedTo(decimals) {
  return (value) => +value.toFixed(decimals);
}
export function significant(value) {
  return +value.toPrecision(SIGNIFICANT);
}
