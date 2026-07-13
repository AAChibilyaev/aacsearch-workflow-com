import * as migration_20250929_111647 from './20250929_111647';
import * as migration_20260711_200002_aacsearch_multitenant_stack from './20260711_200002_aacsearch_multitenant_stack';
import * as migration_20260711_202415_hero_basic_block from './20260711_202415_hero_basic_block';
import * as migration_20260711_204901_ui_plugins_notifications_ai from './20260711_204901_ui_plugins_notifications_ai';
import * as migration_20260713_122854_registry_blocks_full_set from './20260713_122854_registry_blocks_full_set';
import * as migration_20260713_124254_apikeys_globals_cmdk from './20260713_124254_apikeys_globals_cmdk';
import * as migration_20260713_125137_search_os_core from './20260713_125137_search_os_core';
import * as migration_20260713_141541_media_multitenant from './20260713_141541_media_multitenant';
import * as migration_20260713_142500_wallet_invoices_search_fields from './20260713_142500_wallet_invoices_search_fields';
import * as migration_20260713_143841_search_designer_capabilities from './20260713_143841_search_designer_capabilities';

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
    name: '20260711_202415_hero_basic_block',
  },
  {
    up: migration_20260711_204901_ui_plugins_notifications_ai.up,
    down: migration_20260711_204901_ui_plugins_notifications_ai.down,
    name: '20260711_204901_ui_plugins_notifications_ai',
  },
  {
    up: migration_20260713_122854_registry_blocks_full_set.up,
    down: migration_20260713_122854_registry_blocks_full_set.down,
    name: '20260713_122854_registry_blocks_full_set',
  },
  {
    up: migration_20260713_124254_apikeys_globals_cmdk.up,
    down: migration_20260713_124254_apikeys_globals_cmdk.down,
    name: '20260713_124254_apikeys_globals_cmdk',
  },
  {
    up: migration_20260713_125137_search_os_core.up,
    down: migration_20260713_125137_search_os_core.down,
    name: '20260713_125137_search_os_core',
  },
  {
    up: migration_20260713_141541_media_multitenant.up,
    down: migration_20260713_141541_media_multitenant.down,
    name: '20260713_141541_media_multitenant',
  },
  {
    up: migration_20260713_142500_wallet_invoices_search_fields.up,
    down: migration_20260713_142500_wallet_invoices_search_fields.down,
    name: '20260713_142500_wallet_invoices_search_fields',
  },
  {
    up: migration_20260713_143841_search_designer_capabilities.up,
    down: migration_20260713_143841_search_designer_capabilities.down,
    name: '20260713_143841_search_designer_capabilities',
  },
];
