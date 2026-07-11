import * as migration_20250929_111647 from './20250929_111647';
import * as migration_20260711_200002_aacsearch_multitenant_stack from './20260711_200002_aacsearch_multitenant_stack';
import * as migration_20260711_202415_hero_basic_block from './20260711_202415_hero_basic_block';

export const migrations = [
  {
    up: migration_20250929_111647.up,
    down: migration_20250929_111647.down,
    name: '20250929_111647',
  },
  {
    up: migration_20260711_200002_aacsearch_multitenant_stack.up,
    down: migration_20260711_200002_aacsearch_multitenant_stack.down,
    name: '20260711_200002_aacsearch_multitenant_stack',
  },
  {
    up: migration_20260711_202415_hero_basic_block.up,
    down: migration_20260711_202415_hero_basic_block.down,
    name: '20260711_202415_hero_basic_block'
  },
];
