import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`api_keys_scopes\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`api_keys\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`api_keys_scopes_order_idx\` ON \`api_keys_scopes\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`api_keys_scopes_parent_idx\` ON \`api_keys_scopes\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`api_keys\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`tenant_id\` integer,
  	\`name\` text NOT NULL,
  	\`description\` text,
  	\`key_prefix\` text,
  	\`expires_at\` text,
  	\`revoked_at\` text,
  	\`last_used_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`enable_a_p_i_key\` integer,
  	\`api_key\` text,
  	\`api_key_index\` text,
  	FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`api_keys_tenant_idx\` ON \`api_keys\` (\`tenant_id\`);`)
  await db.run(sql`CREATE INDEX \`api_keys_key_prefix_idx\` ON \`api_keys\` (\`key_prefix\`);`)
  await db.run(sql`CREATE INDEX \`api_keys_updated_at_idx\` ON \`api_keys\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`api_keys_created_at_idx\` ON \`api_keys\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`header_nav_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`url\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`header\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`header_nav_items_order_idx\` ON \`header_nav_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`header_nav_items_parent_id_idx\` ON \`header_nav_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`header_nav_items_locales\` (
  	\`label\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`header_nav_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`header_nav_items_locales_locale_parent_id_unique\` ON \`header_nav_items_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`header\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`cta_url\` text,
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `)
  await db.run(sql`CREATE TABLE \`header_locales\` (
  	\`cta_label\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`header\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`header_locales_locale_parent_id_unique\` ON \`header_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`footer_columns_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`url\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`footer_columns\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`footer_columns_links_order_idx\` ON \`footer_columns_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`footer_columns_links_parent_id_idx\` ON \`footer_columns_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`footer_columns_links_locales\` (
  	\`label\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`footer_columns_links\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`footer_columns_links_locales_locale_parent_id_unique\` ON \`footer_columns_links_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`footer_columns\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`footer\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`footer_columns_order_idx\` ON \`footer_columns\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`footer_columns_parent_id_idx\` ON \`footer_columns\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`footer_columns_locales\` (
  	\`title\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`footer_columns\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`footer_columns_locales_locale_parent_id_unique\` ON \`footer_columns_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`footer\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `)
  await db.run(sql`CREATE TABLE \`footer_locales\` (
  	\`copyright\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`footer\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`footer_locales_locale_parent_id_unique\` ON \`footer_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`ALTER TABLE \`tenants\` ADD \`billing_plan\` text;`)
  await db.run(sql`ALTER TABLE \`tenants\` ADD \`billing_plan_name\` text;`)
  await db.run(sql`ALTER TABLE \`tenants\` ADD \`billing_status\` text DEFAULT 'none';`)
  await db.run(sql`ALTER TABLE \`tenants\` ADD \`billing_trial_ends_at\` text;`)
  await db.run(sql`ALTER TABLE \`tenants\` ADD \`billing_entitlements\` text;`)
  await db.run(sql`ALTER TABLE \`tenants\` ADD \`billing_synced_at\` text;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`api_keys_id\` integer REFERENCES api_keys(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_api_keys_id_idx\` ON \`payload_locked_documents_rels\` (\`api_keys_id\`);`)
  await db.run(sql`ALTER TABLE \`payload_preferences_rels\` ADD \`api_keys_id\` integer REFERENCES api_keys(id);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_api_keys_id_idx\` ON \`payload_preferences_rels\` (\`api_keys_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`api_keys_scopes\`;`)
  await db.run(sql`DROP TABLE \`api_keys\`;`)
  await db.run(sql`DROP TABLE \`header_nav_items\`;`)
  await db.run(sql`DROP TABLE \`header_nav_items_locales\`;`)
  await db.run(sql`DROP TABLE \`header\`;`)
  await db.run(sql`DROP TABLE \`header_locales\`;`)
  await db.run(sql`DROP TABLE \`footer_columns_links\`;`)
  await db.run(sql`DROP TABLE \`footer_columns_links_locales\`;`)
  await db.run(sql`DROP TABLE \`footer_columns\`;`)
  await db.run(sql`DROP TABLE \`footer_columns_locales\`;`)
  await db.run(sql`DROP TABLE \`footer\`;`)
  await db.run(sql`DROP TABLE \`footer_locales\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`pages_id\` integer,
  	\`products_id\` integer,
  	\`documents_id\` integer,
  	\`collection_definitions_id\` integer,
  	\`tenant_settings_id\` integer,
  	\`users_id\` integer,
  	\`media_id\` integer,
  	\`tenants_id\` integer,
  	\`redirects_id\` integer,
  	\`search_id\` integer,
  	\`forms_id\` integer,
  	\`form_submissions_id\` integer,
  	\`notifications_id\` integer,
  	\`plugin_ai_instructions_id\` integer,
  	\`payload_mcp_api_keys_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`pages_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`products_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`documents_id\`) REFERENCES \`documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`collection_definitions_id\`) REFERENCES \`collection_definitions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`tenant_settings_id\`) REFERENCES \`tenant_settings\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`tenants_id\`) REFERENCES \`tenants\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`redirects_id\`) REFERENCES \`redirects\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`search_id\`) REFERENCES \`search\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`forms_id\`) REFERENCES \`forms\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`form_submissions_id\`) REFERENCES \`form_submissions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`notifications_id\`) REFERENCES \`notifications\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`plugin_ai_instructions_id\`) REFERENCES \`plugin_ai_instructions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`payload_mcp_api_keys_id\`) REFERENCES \`payload_mcp_api_keys\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "pages_id", "products_id", "documents_id", "collection_definitions_id", "tenant_settings_id", "users_id", "media_id", "tenants_id", "redirects_id", "search_id", "forms_id", "form_submissions_id", "notifications_id", "plugin_ai_instructions_id", "payload_mcp_api_keys_id") SELECT "id", "order", "parent_id", "path", "pages_id", "products_id", "documents_id", "collection_definitions_id", "tenant_settings_id", "users_id", "media_id", "tenants_id", "redirects_id", "search_id", "forms_id", "form_submissions_id", "notifications_id", "plugin_ai_instructions_id", "payload_mcp_api_keys_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_pages_id_idx\` ON \`payload_locked_documents_rels\` (\`pages_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_products_id_idx\` ON \`payload_locked_documents_rels\` (\`products_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_documents_id_idx\` ON \`payload_locked_documents_rels\` (\`documents_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_collection_definitions_id_idx\` ON \`payload_locked_documents_rels\` (\`collection_definitions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_tenant_settings_id_idx\` ON \`payload_locked_documents_rels\` (\`tenant_settings_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_tenants_id_idx\` ON \`payload_locked_documents_rels\` (\`tenants_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_redirects_id_idx\` ON \`payload_locked_documents_rels\` (\`redirects_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_search_id_idx\` ON \`payload_locked_documents_rels\` (\`search_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_forms_id_idx\` ON \`payload_locked_documents_rels\` (\`forms_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_form_submissions_id_idx\` ON \`payload_locked_documents_rels\` (\`form_submissions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_notifications_id_idx\` ON \`payload_locked_documents_rels\` (\`notifications_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_plugin_ai_instructions_id_idx\` ON \`payload_locked_documents_rels\` (\`plugin_ai_instructions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_payload_mcp_api_keys_id_idx\` ON \`payload_locked_documents_rels\` (\`payload_mcp_api_keys_id\`);`)
  await db.run(sql`CREATE TABLE \`__new_payload_preferences_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`payload_mcp_api_keys_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_preferences\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`payload_mcp_api_keys_id\`) REFERENCES \`payload_mcp_api_keys\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_preferences_rels\`("id", "order", "parent_id", "path", "users_id", "payload_mcp_api_keys_id") SELECT "id", "order", "parent_id", "path", "users_id", "payload_mcp_api_keys_id" FROM \`payload_preferences_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_preferences_rels\` RENAME TO \`payload_preferences_rels\`;`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_order_idx\` ON \`payload_preferences_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_parent_idx\` ON \`payload_preferences_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_path_idx\` ON \`payload_preferences_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_users_id_idx\` ON \`payload_preferences_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_payload_mcp_api_keys_id_idx\` ON \`payload_preferences_rels\` (\`payload_mcp_api_keys_id\`);`)
  await db.run(sql`ALTER TABLE \`tenants\` DROP COLUMN \`billing_plan\`;`)
  await db.run(sql`ALTER TABLE \`tenants\` DROP COLUMN \`billing_plan_name\`;`)
  await db.run(sql`ALTER TABLE \`tenants\` DROP COLUMN \`billing_status\`;`)
  await db.run(sql`ALTER TABLE \`tenants\` DROP COLUMN \`billing_trial_ends_at\`;`)
  await db.run(sql`ALTER TABLE \`tenants\` DROP COLUMN \`billing_entitlements\`;`)
  await db.run(sql`ALTER TABLE \`tenants\` DROP COLUMN \`billing_synced_at\`;`)
}
