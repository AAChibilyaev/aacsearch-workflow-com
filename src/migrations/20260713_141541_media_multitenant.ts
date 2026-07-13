import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`invoices\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`pages_id\` integer,
  	\`products_id\` integer,
  	\`documents_id\` integer,
  	\`integrations_id\` integer,
  	\`collection_definitions_id\` integer,
  	\`tenant_settings_id\` integer,
  	\`api_keys_id\` integer,
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
  	FOREIGN KEY (\`integrations_id\`) REFERENCES \`integrations\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`collection_definitions_id\`) REFERENCES \`collection_definitions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`tenant_settings_id\`) REFERENCES \`tenant_settings\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`api_keys_id\`) REFERENCES \`api_keys\`(\`id\`) ON UPDATE no action ON DELETE cascade,
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
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "pages_id", "products_id", "documents_id", "integrations_id", "collection_definitions_id", "tenant_settings_id", "api_keys_id", "users_id", "media_id", "tenants_id", "redirects_id", "search_id", "forms_id", "form_submissions_id", "notifications_id", "plugin_ai_instructions_id", "payload_mcp_api_keys_id") SELECT "id", "order", "parent_id", "path", "pages_id", "products_id", "documents_id", "integrations_id", "collection_definitions_id", "tenant_settings_id", "api_keys_id", "users_id", "media_id", "tenants_id", "redirects_id", "search_id", "forms_id", "form_submissions_id", "notifications_id", "plugin_ai_instructions_id", "payload_mcp_api_keys_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_pages_id_idx\` ON \`payload_locked_documents_rels\` (\`pages_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_products_id_idx\` ON \`payload_locked_documents_rels\` (\`products_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_documents_id_idx\` ON \`payload_locked_documents_rels\` (\`documents_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_integrations_id_idx\` ON \`payload_locked_documents_rels\` (\`integrations_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_collection_definitions_id_idx\` ON \`payload_locked_documents_rels\` (\`collection_definitions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_tenant_settings_id_idx\` ON \`payload_locked_documents_rels\` (\`tenant_settings_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_api_keys_id_idx\` ON \`payload_locked_documents_rels\` (\`api_keys_id\`);`)
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
  await db.run(sql`ALTER TABLE \`media\` ADD \`tenant_id\` integer REFERENCES tenants(id);`)
  await db.run(sql`CREATE INDEX \`media_tenant_idx\` ON \`media\` (\`tenant_id\`);`)
  await db.run(sql`ALTER TABLE \`plugin_ai_instructions\` DROP COLUMN \`anth_c_text_settings_model\`;`)
  await db.run(sql`ALTER TABLE \`plugin_ai_instructions\` DROP COLUMN \`anth_c_text_settings_max_tokens\`;`)
  await db.run(sql`ALTER TABLE \`plugin_ai_instructions\` DROP COLUMN \`anth_c_text_settings_temperature\`;`)
  await db.run(sql`ALTER TABLE \`plugin_ai_instructions\` DROP COLUMN \`anth_c_text_settings_extract_attachments\`;`)
  await db.run(sql`ALTER TABLE \`plugin_ai_instructions\` DROP COLUMN \`anth_c_object_settings_model\`;`)
  await db.run(sql`ALTER TABLE \`plugin_ai_instructions\` DROP COLUMN \`anth_c_object_settings_max_tokens\`;`)
  await db.run(sql`ALTER TABLE \`plugin_ai_instructions\` DROP COLUMN \`anth_c_object_settings_temperature\`;`)
  await db.run(sql`ALTER TABLE \`plugin_ai_instructions\` DROP COLUMN \`anth_c_object_settings_extract_attachments\`;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`invoices\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`tenant_id\` integer,
  	\`external_id\` text,
  	\`number\` text,
  	\`status\` text DEFAULT 'draft',
  	\`amount_cents\` numeric,
  	\`currency\` text DEFAULT 'USD',
  	\`invoice_type\` text DEFAULT 'subscription',
  	\`period_start\` text,
  	\`period_end\` text,
  	\`paid_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`invoices_tenant_idx\` ON \`invoices\` (\`tenant_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`invoices_external_id_idx\` ON \`invoices\` (\`external_id\`);`)
  await db.run(sql`CREATE INDEX \`invoices_updated_at_idx\` ON \`invoices\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`invoices_created_at_idx\` ON \`invoices\` (\`created_at\`);`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_media\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`url\` text,
  	\`thumbnail_u_r_l\` text,
  	\`filename\` text,
  	\`mime_type\` text,
  	\`filesize\` numeric,
  	\`width\` numeric,
  	\`height\` numeric
  );
  `)
  await db.run(sql`INSERT INTO \`__new_media\`("id", "updated_at", "created_at", "url", "thumbnail_u_r_l", "filename", "mime_type", "filesize", "width", "height") SELECT "id", "updated_at", "created_at", "url", "thumbnail_u_r_l", "filename", "mime_type", "filesize", "width", "height" FROM \`media\`;`)
  await db.run(sql`DROP TABLE \`media\`;`)
  await db.run(sql`ALTER TABLE \`__new_media\` RENAME TO \`media\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`media_updated_at_idx\` ON \`media\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`media_created_at_idx\` ON \`media\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`media_filename_idx\` ON \`media\` (\`filename\`);`)
  await db.run(sql`ALTER TABLE \`plugin_ai_instructions\` ADD \`anth_c_text_settings_model\` text DEFAULT 'claude-3-5-sonnet-latest';`)
  await db.run(sql`ALTER TABLE \`plugin_ai_instructions\` ADD \`anth_c_text_settings_max_tokens\` numeric DEFAULT 5000;`)
  await db.run(sql`ALTER TABLE \`plugin_ai_instructions\` ADD \`anth_c_text_settings_temperature\` numeric DEFAULT 0.7;`)
  await db.run(sql`ALTER TABLE \`plugin_ai_instructions\` ADD \`anth_c_text_settings_extract_attachments\` integer;`)
  await db.run(sql`ALTER TABLE \`plugin_ai_instructions\` ADD \`anth_c_object_settings_model\` text DEFAULT 'claude-3-5-sonnet-latest';`)
  await db.run(sql`ALTER TABLE \`plugin_ai_instructions\` ADD \`anth_c_object_settings_max_tokens\` numeric DEFAULT 5000;`)
  await db.run(sql`ALTER TABLE \`plugin_ai_instructions\` ADD \`anth_c_object_settings_temperature\` numeric DEFAULT 0.7;`)
  await db.run(sql`ALTER TABLE \`plugin_ai_instructions\` ADD \`anth_c_object_settings_extract_attachments\` integer;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`invoices_id\` integer REFERENCES invoices(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_invoices_id_idx\` ON \`payload_locked_documents_rels\` (\`invoices_id\`);`)
}
