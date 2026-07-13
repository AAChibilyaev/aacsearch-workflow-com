import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`media_locales\` (
  	\`alt\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`media_locales_locale_parent_id_unique\` ON \`media_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`media_texts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`text\` text,
  	\`locale\` text,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`media_texts_order_parent\` ON \`media_texts\` (\`order\`,\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`media_texts_locale_parent\` ON \`media_texts\` (\`locale\`,\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`notifications\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`recipient_id\` integer NOT NULL,
  	\`tenant_id\` integer NOT NULL,
  	\`message\` text NOT NULL,
  	\`link\` text,
  	\`type\` text DEFAULT 'info',
  	\`read\` integer DEFAULT false,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`recipient_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`notifications_recipient_idx\` ON \`notifications\` (\`recipient_id\`);`)
  await db.run(sql`CREATE INDEX \`notifications_tenant_idx\` ON \`notifications\` (\`tenant_id\`);`)
  await db.run(sql`CREATE INDEX \`notifications_read_idx\` ON \`notifications\` (\`read\`);`)
  await db.run(sql`CREATE INDEX \`notifications_updated_at_idx\` ON \`notifications\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`notifications_created_at_idx\` ON \`notifications\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`plugin_ai_instructions_images\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`image_id\` integer,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`plugin_ai_instructions\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`plugin_ai_instructions_images_order_idx\` ON \`plugin_ai_instructions_images\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`plugin_ai_instructions_images_parent_id_idx\` ON \`plugin_ai_instructions_images\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`plugin_ai_instructions_images_image_idx\` ON \`plugin_ai_instructions_images\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`plugin_ai_instructions\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`schema_path\` text,
  	\`field_type\` text DEFAULT 'text',
  	\`relation_to\` text,
  	\`model_id\` text,
  	\`disabled\` integer DEFAULT false,
  	\`oai_text_settings_model\` text DEFAULT 'gpt-4o-mini',
  	\`oai_text_settings_max_tokens\` numeric DEFAULT 5000,
  	\`oai_text_settings_temperature\` numeric DEFAULT 0.7,
  	\`oai_text_settings_extract_attachments\` integer,
  	\`dalle_e_settings_version\` text DEFAULT 'dall-e-3',
  	\`dalle_e_settings_size\` text DEFAULT '1024x1024',
  	\`dalle_e_settings_style\` text DEFAULT 'natural',
  	\`dalle_e_settings_enable_prompt_optimization\` integer,
  	\`gpt_image_1_settings_version\` text DEFAULT 'gpt-image-1',
  	\`gpt_image_1_settings_size\` text DEFAULT 'auto',
  	\`gpt_image_1_settings_quality\` text DEFAULT 'auto',
  	\`gpt_image_1_settings_output_format\` text DEFAULT 'png',
  	\`gpt_image_1_settings_output_compression\` numeric DEFAULT 100,
  	\`gpt_image_1_settings_background\` text DEFAULT 'white',
  	\`gpt_image_1_settings_moderation\` text DEFAULT 'auto',
  	\`oai_tts_settings_voice\` text DEFAULT 'alloy',
  	\`oai_tts_settings_model\` text DEFAULT 'tts-1',
  	\`oai_tts_settings_response_format\` text DEFAULT 'mp3',
  	\`oai_tts_settings_speed\` numeric DEFAULT 1,
  	\`oai_object_settings_model\` text DEFAULT 'gpt-4o',
  	\`oai_object_settings_max_tokens\` numeric DEFAULT 5000,
  	\`oai_object_settings_temperature\` numeric DEFAULT 0.7,
  	\`oai_object_settings_extract_attachments\` integer,
  	\`11labs_settings_voice_id\` text,
  	\`11labs_settings_stability\` numeric DEFAULT 0.5,
  	\`11labs_settings_similarity_boost\` numeric DEFAULT 0.5,
  	\`11labs_settings_style\` numeric DEFAULT 0.5,
  	\`11labs_settings_use_speaker_boost\` integer,
  	\`11labs_settings_seed\` numeric,
  	\`11labs_settings_previous_text\` text,
  	\`11labs_settings_next_text\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`plugin_ai_instructions_schema_path_idx\` ON \`plugin_ai_instructions\` (\`schema_path\`);`)
  await db.run(sql`CREATE INDEX \`plugin_ai_instructions_updated_at_idx\` ON \`plugin_ai_instructions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`plugin_ai_instructions_created_at_idx\` ON \`plugin_ai_instructions\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`plugin_ai_instructions_locales\` (
  	\`prompt\` text,
  	\`system\` text DEFAULT 'INSTRUCTIONS:
  You are a highly skilled and professional blog writer,
  renowned for crafting engaging and well-organized articles.
  When given a title, you meticulously create blogs that are not only
  informative and accurate but also captivating and beautifully structured.',
  	\`layout\` text DEFAULT '[paragraph] - Write a concise introduction (2-3 sentences) that outlines the main topic.
  [horizontalrule] - Insert a horizontal rule to separate the introduction from the main content.
  [list] - Create a list with 3-5 items. Each list item should contain:
     a. [heading] - A brief, descriptive heading (up to 5 words)
     b. [paragraph] - A short explanation or elaboration (1-2 sentences)
  [horizontalrule] - Insert another horizontal rule to separate the main content from the conclusion.
  [paragraph] - Compose a brief conclusion (2-3 sentences) summarizing the key points.
  [quote] - Include a relevant quote from a famous person, directly related to the topic. Format: "Quote text." - Author Name',
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`plugin_ai_instructions\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`plugin_ai_instructions_locales_locale_parent_id_unique\` ON \`plugin_ai_instructions_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`notifications_id\` integer REFERENCES notifications(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`plugin_ai_instructions_id\` integer REFERENCES plugin_ai_instructions(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_notifications_id_idx\` ON \`payload_locked_documents_rels\` (\`notifications_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_plugin_ai_instructions_id_idx\` ON \`payload_locked_documents_rels\` (\`plugin_ai_instructions_id\`);`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`alt\`;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`media_locales\`;`)
  await db.run(sql`DROP TABLE \`media_texts\`;`)
  await db.run(sql`DROP TABLE \`notifications\`;`)
  await db.run(sql`DROP TABLE \`plugin_ai_instructions_images\`;`)
  await db.run(sql`DROP TABLE \`plugin_ai_instructions\`;`)
  await db.run(sql`DROP TABLE \`plugin_ai_instructions_locales\`;`)
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
  	FOREIGN KEY (\`payload_mcp_api_keys_id\`) REFERENCES \`payload_mcp_api_keys\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "pages_id", "products_id", "documents_id", "collection_definitions_id", "tenant_settings_id", "users_id", "media_id", "tenants_id", "redirects_id", "search_id", "forms_id", "form_submissions_id", "payload_mcp_api_keys_id") SELECT "id", "order", "parent_id", "path", "pages_id", "products_id", "documents_id", "collection_definitions_id", "tenant_settings_id", "users_id", "media_id", "tenants_id", "redirects_id", "search_id", "forms_id", "form_submissions_id", "payload_mcp_api_keys_id" FROM \`payload_locked_documents_rels\`;`)
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
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_payload_mcp_api_keys_id_idx\` ON \`payload_locked_documents_rels\` (\`payload_mcp_api_keys_id\`);`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`alt\` text NOT NULL;`)
}
