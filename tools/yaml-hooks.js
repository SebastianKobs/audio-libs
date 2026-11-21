// ---------- node's module hooks for YAML: a .yaml file imported as its data (yaml.js) ----------
// Registered before anything loads, as a module's imports load before it runs:
//   node --import ./tools/yaml-hooks.js --test …   (make test-unit)
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import { yamlModule } from './yaml.js';

registerHooks({ load: loadYaml });

// a .yaml file's module; any other loaded as node loads it
function loadYaml(url, context, nextLoad) {
  if (!url.endsWith('.yaml')) {
    return nextLoad(url, context);
  }
  const file = fileURLToPath(url);
  return { format: 'module', source: yamlModule(readFileSync(file, 'utf8'), file), shortCircuit: true };
}
