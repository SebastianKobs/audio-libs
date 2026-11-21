// YAML read as data (tools/yaml.js): a file a module, its data its default export, its comments left out; read so by a
// project's build (Vite's plugin) and by the tests in node (tools/yaml-hooks.js, which make test-unit registers)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { yamlModule, yamlPlugin } from '../../tools/yaml.js';
import delay from './fixtures/delay.yaml';

const DELAY = { name: 'delay', chain: ['delay'], params: { note: '1/8', feedback: 0.45 } };

test('a YAML file imported in node: its data, as JSON has it, its comments left out', () => {
  assert.deepEqual(delay, DELAY);
});

test("a YAML file as a module: its data its default export; a file that isn't YAML refused, naming it", async () => {
  const source = yamlModule('a: 1 # why\nb: [x, y]\n', 'a.yaml');
  const module = await import(`data:text/javascript,${encodeURIComponent(source)}`);
  assert.deepEqual(module.default, { a: 1, b: ['x', 'y'] });
  assert.throws(() => yamlModule('a: [1, 2\n', 'broken.yaml'), /broken\.yaml/, 'a list not closed');
  assert.throws(() => yamlModule('a: 1\na: 2\n', 'twice.yaml'), /twice\.yaml/, 'a key written twice');
});

test("Vite's plugin turns a .yaml file into its data's module; any other file is left to Vite", async () => {
  const plugin = yamlPlugin();
  const { code, map } = plugin.transform('name: delay\nparams: { note: 1/8 }\n', 'delay.yaml');
  const module = await import(`data:text/javascript,${encodeURIComponent(code)}`);
  assert.deepEqual(module.default, { name: 'delay', params: { note: '1/8' } });
  assert.equal(map, null);
  assert.equal(plugin.transform('export default 1;', 'a.js'), null, 'a module of its own');
});
