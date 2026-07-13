import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`pages_blocks_feature_grid_basic_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`description\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_feature_grid_basic\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_grid_basic_items_order_idx\` ON \`pages_blocks_feature_grid_basic_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_grid_basic_items_parent_id_idx\` ON \`pages_blocks_feature_grid_basic_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_grid_basic_items_locale_idx\` ON \`pages_blocks_feature_grid_basic_items\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_feature_grid_basic_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text NOT NULL,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_feature_grid_basic\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_grid_basic_links_order_idx\` ON \`pages_blocks_feature_grid_basic_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_grid_basic_links_parent_id_idx\` ON \`pages_blocks_feature_grid_basic_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_grid_basic_links_locale_idx\` ON \`pages_blocks_feature_grid_basic_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_feature_grid_basic\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`title\` text NOT NULL,
  	\`description\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_grid_basic_order_idx\` ON \`pages_blocks_feature_grid_basic\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_grid_basic_parent_id_idx\` ON \`pages_blocks_feature_grid_basic\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_grid_basic_path_idx\` ON \`pages_blocks_feature_grid_basic\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_grid_basic_locale_idx\` ON \`pages_blocks_feature_grid_basic\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_call_to_action_centered_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text NOT NULL,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_call_to_action_centered\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_call_to_action_centered_links_order_idx\` ON \`pages_blocks_call_to_action_centered_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_call_to_action_centered_links_parent_id_idx\` ON \`pages_blocks_call_to_action_centered_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_call_to_action_centered_links_locale_idx\` ON \`pages_blocks_call_to_action_centered_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_call_to_action_centered\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`description\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_call_to_action_centered_order_idx\` ON \`pages_blocks_call_to_action_centered\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_call_to_action_centered_parent_id_idx\` ON \`pages_blocks_call_to_action_centered\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_call_to_action_centered_path_idx\` ON \`pages_blocks_call_to_action_centered\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_call_to_action_centered_locale_idx\` ON \`pages_blocks_call_to_action_centered\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_stats_paragraphs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`text\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content_stats\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_stats_paragraphs_order_idx\` ON \`pages_blocks_content_stats_paragraphs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_stats_paragraphs_parent_id_idx\` ON \`pages_blocks_content_stats_paragraphs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_stats_paragraphs_locale_idx\` ON \`pages_blocks_content_stats_paragraphs\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_stats_features\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`icon\` text,
  	\`title\` text NOT NULL,
  	\`description\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content_stats\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_stats_features_order_idx\` ON \`pages_blocks_content_stats_features\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_stats_features_parent_id_idx\` ON \`pages_blocks_content_stats_features\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_stats_features_locale_idx\` ON \`pages_blocks_content_stats_features\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_stats_stats\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`value\` text NOT NULL,
  	\`label\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content_stats\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_stats_stats_order_idx\` ON \`pages_blocks_content_stats_stats\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_stats_stats_parent_id_idx\` ON \`pages_blocks_content_stats_stats\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_stats_stats_locale_idx\` ON \`pages_blocks_content_stats_stats\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_stats\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`title\` text NOT NULL,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_stats_order_idx\` ON \`pages_blocks_content_stats\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_stats_parent_id_idx\` ON \`pages_blocks_content_stats\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_stats_path_idx\` ON \`pages_blocks_content_stats\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_stats_locale_idx\` ON \`pages_blocks_content_stats\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_integration_orbit_integrations\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`logo_id\` integer NOT NULL,
  	\`name\` text NOT NULL,
  	\`description\` text,
  	\`href\` text,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_integration_orbit\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_orbit_integrations_order_idx\` ON \`pages_blocks_integration_orbit_integrations\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_orbit_integrations_parent_id_idx\` ON \`pages_blocks_integration_orbit_integrations\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_orbit_integrations_locale_idx\` ON \`pages_blocks_integration_orbit_integrations\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_orbit_integrations_logo_idx\` ON \`pages_blocks_integration_orbit_integrations\` (\`logo_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_integration_orbit\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text NOT NULL,
  	\`subtext\` text,
  	\`featured_logo_id\` integer,
  	\`block_name\` text,
  	FOREIGN KEY (\`featured_logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_orbit_order_idx\` ON \`pages_blocks_integration_orbit\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_orbit_parent_id_idx\` ON \`pages_blocks_integration_orbit\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_orbit_path_idx\` ON \`pages_blocks_integration_orbit\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_orbit_locale_idx\` ON \`pages_blocks_integration_orbit\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_orbit_featured_logo_idx\` ON \`pages_blocks_integration_orbit\` (\`featured_logo_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_feature_split_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`description\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_feature_split\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_split_items_order_idx\` ON \`pages_blocks_feature_split_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_split_items_parent_id_idx\` ON \`pages_blocks_feature_split_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_split_items_locale_idx\` ON \`pages_blocks_feature_split_items\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_feature_split_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text NOT NULL,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_feature_split\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_split_links_order_idx\` ON \`pages_blocks_feature_split_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_split_links_parent_id_idx\` ON \`pages_blocks_feature_split_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_split_links_locale_idx\` ON \`pages_blocks_feature_split_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_feature_split\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`title\` text NOT NULL,
  	\`description\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_split_order_idx\` ON \`pages_blocks_feature_split\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_split_parent_id_idx\` ON \`pages_blocks_feature_split\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_split_path_idx\` ON \`pages_blocks_feature_split\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_split_locale_idx\` ON \`pages_blocks_feature_split\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_feature_bento_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`description\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_feature_bento\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_bento_items_order_idx\` ON \`pages_blocks_feature_bento_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_bento_items_parent_id_idx\` ON \`pages_blocks_feature_bento_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_bento_items_locale_idx\` ON \`pages_blocks_feature_bento_items\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_feature_bento_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text NOT NULL,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_feature_bento\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_bento_links_order_idx\` ON \`pages_blocks_feature_bento_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_bento_links_parent_id_idx\` ON \`pages_blocks_feature_bento_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_bento_links_locale_idx\` ON \`pages_blocks_feature_bento_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_feature_bento\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`title\` text NOT NULL,
  	\`description\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_bento_order_idx\` ON \`pages_blocks_feature_bento\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_bento_parent_id_idx\` ON \`pages_blocks_feature_bento\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_bento_path_idx\` ON \`pages_blocks_feature_bento\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_bento_locale_idx\` ON \`pages_blocks_feature_bento\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_feature_steps_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`description\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_feature_steps\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_steps_items_order_idx\` ON \`pages_blocks_feature_steps_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_steps_items_parent_id_idx\` ON \`pages_blocks_feature_steps_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_steps_items_locale_idx\` ON \`pages_blocks_feature_steps_items\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_feature_steps_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text NOT NULL,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_feature_steps\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_steps_links_order_idx\` ON \`pages_blocks_feature_steps_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_steps_links_parent_id_idx\` ON \`pages_blocks_feature_steps_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_steps_links_locale_idx\` ON \`pages_blocks_feature_steps_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_feature_steps\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`title\` text NOT NULL,
  	\`description\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_steps_order_idx\` ON \`pages_blocks_feature_steps\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_steps_parent_id_idx\` ON \`pages_blocks_feature_steps\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_steps_path_idx\` ON \`pages_blocks_feature_steps\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_feature_steps_locale_idx\` ON \`pages_blocks_feature_steps\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_embed_basic\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`url\` text NOT NULL,
  	\`title\` text NOT NULL,
  	\`aspect_ratio\` text DEFAULT '16:9' NOT NULL,
  	\`caption\` text,
  	\`allow_fullscreen\` integer DEFAULT true,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_embed_basic_order_idx\` ON \`pages_blocks_embed_basic\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_embed_basic_parent_id_idx\` ON \`pages_blocks_embed_basic\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_embed_basic_path_idx\` ON \`pages_blocks_embed_basic\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_embed_basic_locale_idx\` ON \`pages_blocks_embed_basic\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_columns_paragraphs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`text\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content_columns\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_columns_paragraphs_order_idx\` ON \`pages_blocks_content_columns_paragraphs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_columns_paragraphs_parent_id_idx\` ON \`pages_blocks_content_columns_paragraphs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_columns_paragraphs_locale_idx\` ON \`pages_blocks_content_columns_paragraphs\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_columns_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text NOT NULL,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content_columns\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_columns_links_order_idx\` ON \`pages_blocks_content_columns_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_columns_links_parent_id_idx\` ON \`pages_blocks_content_columns_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_columns_links_locale_idx\` ON \`pages_blocks_content_columns_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_columns\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`title\` text NOT NULL,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_columns_order_idx\` ON \`pages_blocks_content_columns\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_columns_parent_id_idx\` ON \`pages_blocks_content_columns\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_columns_path_idx\` ON \`pages_blocks_content_columns\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_columns_locale_idx\` ON \`pages_blocks_content_columns\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_image_lead_paragraphs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`text\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content_image_lead\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_image_lead_paragraphs_order_idx\` ON \`pages_blocks_content_image_lead_paragraphs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_image_lead_paragraphs_parent_id_idx\` ON \`pages_blocks_content_image_lead_paragraphs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_image_lead_paragraphs_locale_idx\` ON \`pages_blocks_content_image_lead_paragraphs\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_image_lead_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text NOT NULL,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content_image_lead\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_image_lead_links_order_idx\` ON \`pages_blocks_content_image_lead_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_image_lead_links_parent_id_idx\` ON \`pages_blocks_content_image_lead_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_image_lead_links_locale_idx\` ON \`pages_blocks_content_image_lead_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_image_lead\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`title\` text NOT NULL,
  	\`image_id\` integer,
  	\`block_name\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_image_lead_order_idx\` ON \`pages_blocks_content_image_lead\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_image_lead_parent_id_idx\` ON \`pages_blocks_content_image_lead\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_image_lead_path_idx\` ON \`pages_blocks_content_image_lead\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_image_lead_locale_idx\` ON \`pages_blocks_content_image_lead\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_image_lead_image_idx\` ON \`pages_blocks_content_image_lead\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_feature_media_paragraphs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`text\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content_feature_media\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_feature_media_paragraphs_order_idx\` ON \`pages_blocks_content_feature_media_paragraphs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_feature_media_paragraphs_parent_id_idx\` ON \`pages_blocks_content_feature_media_paragraphs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_feature_media_paragraphs_locale_idx\` ON \`pages_blocks_content_feature_media_paragraphs\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_feature_media_features\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`icon\` text,
  	\`title\` text NOT NULL,
  	\`description\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content_feature_media\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_feature_media_features_order_idx\` ON \`pages_blocks_content_feature_media_features\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_feature_media_features_parent_id_idx\` ON \`pages_blocks_content_feature_media_features\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_feature_media_features_locale_idx\` ON \`pages_blocks_content_feature_media_features\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_feature_media\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`title\` text NOT NULL,
  	\`image_id\` integer,
  	\`block_name\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_feature_media_order_idx\` ON \`pages_blocks_content_feature_media\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_feature_media_parent_id_idx\` ON \`pages_blocks_content_feature_media\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_feature_media_path_idx\` ON \`pages_blocks_content_feature_media\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_feature_media_locale_idx\` ON \`pages_blocks_content_feature_media\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_feature_media_image_idx\` ON \`pages_blocks_content_feature_media\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_feature_split_paragraphs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`text\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content_feature_split\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_feature_split_paragraphs_order_idx\` ON \`pages_blocks_content_feature_split_paragraphs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_feature_split_paragraphs_parent_id_idx\` ON \`pages_blocks_content_feature_split_paragraphs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_feature_split_paragraphs_locale_idx\` ON \`pages_blocks_content_feature_split_paragraphs\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_feature_split_features\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`icon\` text,
  	\`title\` text NOT NULL,
  	\`description\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content_feature_split\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_feature_split_features_order_idx\` ON \`pages_blocks_content_feature_split_features\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_feature_split_features_parent_id_idx\` ON \`pages_blocks_content_feature_split_features\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_feature_split_features_locale_idx\` ON \`pages_blocks_content_feature_split_features\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_feature_split\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`title\` text NOT NULL,
  	\`image_id\` integer,
  	\`block_name\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_feature_split_order_idx\` ON \`pages_blocks_content_feature_split\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_feature_split_parent_id_idx\` ON \`pages_blocks_content_feature_split\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_feature_split_path_idx\` ON \`pages_blocks_content_feature_split\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_feature_split_locale_idx\` ON \`pages_blocks_content_feature_split\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_feature_split_image_idx\` ON \`pages_blocks_content_feature_split\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_showcase_paragraphs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`text\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content_showcase\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_showcase_paragraphs_order_idx\` ON \`pages_blocks_content_showcase_paragraphs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_showcase_paragraphs_parent_id_idx\` ON \`pages_blocks_content_showcase_paragraphs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_showcase_paragraphs_locale_idx\` ON \`pages_blocks_content_showcase_paragraphs\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_showcase_features\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`icon\` text,
  	\`title\` text NOT NULL,
  	\`description\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content_showcase\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_showcase_features_order_idx\` ON \`pages_blocks_content_showcase_features\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_showcase_features_parent_id_idx\` ON \`pages_blocks_content_showcase_features\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_showcase_features_locale_idx\` ON \`pages_blocks_content_showcase_features\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_showcase\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`title\` text NOT NULL,
  	\`image_id\` integer,
  	\`block_name\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_showcase_order_idx\` ON \`pages_blocks_content_showcase\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_showcase_parent_id_idx\` ON \`pages_blocks_content_showcase\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_showcase_path_idx\` ON \`pages_blocks_content_showcase\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_showcase_locale_idx\` ON \`pages_blocks_content_showcase\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_showcase_image_idx\` ON \`pages_blocks_content_showcase\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_quote_paragraphs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`text\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content_quote\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_quote_paragraphs_order_idx\` ON \`pages_blocks_content_quote_paragraphs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_quote_paragraphs_parent_id_idx\` ON \`pages_blocks_content_quote_paragraphs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_quote_paragraphs_locale_idx\` ON \`pages_blocks_content_quote_paragraphs\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_quote\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`title\` text NOT NULL,
  	\`image_id\` integer,
  	\`quote\` text NOT NULL,
  	\`citation\` text NOT NULL,
  	\`logo_id\` integer,
  	\`block_name\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_quote_order_idx\` ON \`pages_blocks_content_quote\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_quote_parent_id_idx\` ON \`pages_blocks_content_quote\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_quote_path_idx\` ON \`pages_blocks_content_quote\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_quote_locale_idx\` ON \`pages_blocks_content_quote\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_quote_image_idx\` ON \`pages_blocks_content_quote\` (\`image_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_quote_logo_idx\` ON \`pages_blocks_content_quote\` (\`logo_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_community_paragraphs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`text\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content_community\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_community_paragraphs_order_idx\` ON \`pages_blocks_content_community_paragraphs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_community_paragraphs_parent_id_idx\` ON \`pages_blocks_content_community_paragraphs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_community_paragraphs_locale_idx\` ON \`pages_blocks_content_community_paragraphs\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_community_avatars\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`avatar_id\` integer NOT NULL,
  	\`name\` text NOT NULL,
  	\`href\` text,
  	FOREIGN KEY (\`avatar_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content_community\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_community_avatars_order_idx\` ON \`pages_blocks_content_community_avatars\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_community_avatars_parent_id_idx\` ON \`pages_blocks_content_community_avatars\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_community_avatars_locale_idx\` ON \`pages_blocks_content_community_avatars\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_community_avatars_avatar_idx\` ON \`pages_blocks_content_community_avatars\` (\`avatar_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_community\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`title\` text NOT NULL,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_community_order_idx\` ON \`pages_blocks_content_community\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_community_parent_id_idx\` ON \`pages_blocks_content_community\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_community_path_idx\` ON \`pages_blocks_content_community\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_community_locale_idx\` ON \`pages_blocks_content_community\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_split_rows_paragraphs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`text\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content_split_rows\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_split_rows_paragraphs_order_idx\` ON \`pages_blocks_content_split_rows_paragraphs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_split_rows_paragraphs_parent_id_idx\` ON \`pages_blocks_content_split_rows_paragraphs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_split_rows_paragraphs_locale_idx\` ON \`pages_blocks_content_split_rows_paragraphs\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_split_rows_rows\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`image_id\` integer,
  	\`title\` text NOT NULL,
  	\`description\` text NOT NULL,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content_split_rows\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_split_rows_rows_order_idx\` ON \`pages_blocks_content_split_rows_rows\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_split_rows_rows_parent_id_idx\` ON \`pages_blocks_content_split_rows_rows\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_split_rows_rows_locale_idx\` ON \`pages_blocks_content_split_rows_rows\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_split_rows_rows_image_idx\` ON \`pages_blocks_content_split_rows_rows\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_split_rows\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`title\` text NOT NULL,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_split_rows_order_idx\` ON \`pages_blocks_content_split_rows\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_split_rows_parent_id_idx\` ON \`pages_blocks_content_split_rows\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_split_rows_path_idx\` ON \`pages_blocks_content_split_rows\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_split_rows_locale_idx\` ON \`pages_blocks_content_split_rows\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_rows_paragraphs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`text\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content_rows\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_rows_paragraphs_order_idx\` ON \`pages_blocks_content_rows_paragraphs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_rows_paragraphs_parent_id_idx\` ON \`pages_blocks_content_rows_paragraphs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_rows_paragraphs_locale_idx\` ON \`pages_blocks_content_rows_paragraphs\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_rows_rows\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`image_id\` integer,
  	\`title\` text NOT NULL,
  	\`description\` text NOT NULL,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content_rows\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_rows_rows_order_idx\` ON \`pages_blocks_content_rows_rows\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_rows_rows_parent_id_idx\` ON \`pages_blocks_content_rows_rows\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_rows_rows_locale_idx\` ON \`pages_blocks_content_rows_rows\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_rows_rows_image_idx\` ON \`pages_blocks_content_rows_rows\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_rows\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`title\` text NOT NULL,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_rows_order_idx\` ON \`pages_blocks_content_rows\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_rows_parent_id_idx\` ON \`pages_blocks_content_rows\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_rows_path_idx\` ON \`pages_blocks_content_rows\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_rows_locale_idx\` ON \`pages_blocks_content_rows\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_image_frame_paragraphs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`text\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content_image_frame\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_image_frame_paragraphs_order_idx\` ON \`pages_blocks_content_image_frame_paragraphs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_image_frame_paragraphs_parent_id_idx\` ON \`pages_blocks_content_image_frame_paragraphs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_image_frame_paragraphs_locale_idx\` ON \`pages_blocks_content_image_frame_paragraphs\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_image_frame\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`title\` text NOT NULL,
  	\`image_id\` integer,
  	\`background_image_id\` integer,
  	\`block_name\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`background_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_image_frame_order_idx\` ON \`pages_blocks_content_image_frame\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_image_frame_parent_id_idx\` ON \`pages_blocks_content_image_frame\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_image_frame_path_idx\` ON \`pages_blocks_content_image_frame\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_image_frame_locale_idx\` ON \`pages_blocks_content_image_frame\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_image_frame_image_idx\` ON \`pages_blocks_content_image_frame\` (\`image_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_image_frame_background_image_idx\` ON \`pages_blocks_content_image_frame\` (\`background_image_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_list_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`term\` text NOT NULL,
  	\`description\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content_list\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_list_items_order_idx\` ON \`pages_blocks_content_list_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_list_items_parent_id_idx\` ON \`pages_blocks_content_list_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_list_items_locale_idx\` ON \`pages_blocks_content_list_items\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_list\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`title\` text NOT NULL,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_list_order_idx\` ON \`pages_blocks_content_list\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_list_parent_id_idx\` ON \`pages_blocks_content_list\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_list_path_idx\` ON \`pages_blocks_content_list\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_list_locale_idx\` ON \`pages_blocks_content_list\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_list_columns_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`term\` text NOT NULL,
  	\`description\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content_list_columns\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_list_columns_items_order_idx\` ON \`pages_blocks_content_list_columns_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_list_columns_items_parent_id_idx\` ON \`pages_blocks_content_list_columns_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_list_columns_items_locale_idx\` ON \`pages_blocks_content_list_columns_items\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_list_columns\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`title\` text NOT NULL,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_list_columns_order_idx\` ON \`pages_blocks_content_list_columns\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_list_columns_parent_id_idx\` ON \`pages_blocks_content_list_columns\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_list_columns_path_idx\` ON \`pages_blocks_content_list_columns\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_list_columns_locale_idx\` ON \`pages_blocks_content_list_columns\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_list_icons_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`icon\` text,
  	\`term\` text NOT NULL,
  	\`description\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content_list_icons\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_list_icons_items_order_idx\` ON \`pages_blocks_content_list_icons_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_list_icons_items_parent_id_idx\` ON \`pages_blocks_content_list_icons_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_list_icons_items_locale_idx\` ON \`pages_blocks_content_list_icons_items\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_list_icons\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`title\` text NOT NULL,
  	\`description\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_list_icons_order_idx\` ON \`pages_blocks_content_list_icons\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_list_icons_parent_id_idx\` ON \`pages_blocks_content_list_icons\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_list_icons_path_idx\` ON \`pages_blocks_content_list_icons\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_list_icons_locale_idx\` ON \`pages_blocks_content_list_icons\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_logo_cloud_grid_logos\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`logo_id\` integer NOT NULL,
  	\`name\` text NOT NULL,
  	\`href\` text,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_logo_cloud_grid\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_grid_logos_order_idx\` ON \`pages_blocks_logo_cloud_grid_logos\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_grid_logos_parent_id_idx\` ON \`pages_blocks_logo_cloud_grid_logos\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_grid_logos_locale_idx\` ON \`pages_blocks_logo_cloud_grid_logos\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_grid_logos_logo_idx\` ON \`pages_blocks_logo_cloud_grid_logos\` (\`logo_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_logo_cloud_grid\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text NOT NULL,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_grid_order_idx\` ON \`pages_blocks_logo_cloud_grid\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_grid_parent_id_idx\` ON \`pages_blocks_logo_cloud_grid\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_grid_path_idx\` ON \`pages_blocks_logo_cloud_grid\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_grid_locale_idx\` ON \`pages_blocks_logo_cloud_grid\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_logo_cloud_hover_logos\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`logo_id\` integer NOT NULL,
  	\`name\` text NOT NULL,
  	\`href\` text,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_logo_cloud_hover\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_hover_logos_order_idx\` ON \`pages_blocks_logo_cloud_hover_logos\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_hover_logos_parent_id_idx\` ON \`pages_blocks_logo_cloud_hover_logos\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_hover_logos_locale_idx\` ON \`pages_blocks_logo_cloud_hover_logos\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_hover_logos_logo_idx\` ON \`pages_blocks_logo_cloud_hover_logos\` (\`logo_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_logo_cloud_hover_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text NOT NULL,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_logo_cloud_hover\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_hover_links_order_idx\` ON \`pages_blocks_logo_cloud_hover_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_hover_links_parent_id_idx\` ON \`pages_blocks_logo_cloud_hover_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_hover_links_locale_idx\` ON \`pages_blocks_logo_cloud_hover_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_logo_cloud_hover\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text NOT NULL,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_hover_order_idx\` ON \`pages_blocks_logo_cloud_hover\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_hover_parent_id_idx\` ON \`pages_blocks_logo_cloud_hover\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_hover_path_idx\` ON \`pages_blocks_logo_cloud_hover\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_hover_locale_idx\` ON \`pages_blocks_logo_cloud_hover\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_logo_cloud_inline_logos\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`logo_id\` integer NOT NULL,
  	\`name\` text NOT NULL,
  	\`href\` text,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_logo_cloud_inline\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_inline_logos_order_idx\` ON \`pages_blocks_logo_cloud_inline_logos\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_inline_logos_parent_id_idx\` ON \`pages_blocks_logo_cloud_inline_logos\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_inline_logos_locale_idx\` ON \`pages_blocks_logo_cloud_inline_logos\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_inline_logos_logo_idx\` ON \`pages_blocks_logo_cloud_inline_logos\` (\`logo_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_logo_cloud_inline\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text NOT NULL,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_inline_order_idx\` ON \`pages_blocks_logo_cloud_inline\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_inline_parent_id_idx\` ON \`pages_blocks_logo_cloud_inline\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_inline_path_idx\` ON \`pages_blocks_logo_cloud_inline\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_inline_locale_idx\` ON \`pages_blocks_logo_cloud_inline\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_logo_cloud_inline_wrap_logos\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`logo_id\` integer NOT NULL,
  	\`name\` text NOT NULL,
  	\`href\` text,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_logo_cloud_inline_wrap\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_inline_wrap_logos_order_idx\` ON \`pages_blocks_logo_cloud_inline_wrap_logos\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_inline_wrap_logos_parent_id_idx\` ON \`pages_blocks_logo_cloud_inline_wrap_logos\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_inline_wrap_logos_locale_idx\` ON \`pages_blocks_logo_cloud_inline_wrap_logos\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_inline_wrap_logos_logo_idx\` ON \`pages_blocks_logo_cloud_inline_wrap_logos\` (\`logo_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_logo_cloud_inline_wrap\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text NOT NULL,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_inline_wrap_order_idx\` ON \`pages_blocks_logo_cloud_inline_wrap\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_inline_wrap_parent_id_idx\` ON \`pages_blocks_logo_cloud_inline_wrap\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_inline_wrap_path_idx\` ON \`pages_blocks_logo_cloud_inline_wrap\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_inline_wrap_locale_idx\` ON \`pages_blocks_logo_cloud_inline_wrap\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_integration_grid_integrations\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`logo_id\` integer NOT NULL,
  	\`name\` text NOT NULL,
  	\`description\` text,
  	\`href\` text,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_integration_grid\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_grid_integrations_order_idx\` ON \`pages_blocks_integration_grid_integrations\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_grid_integrations_parent_id_idx\` ON \`pages_blocks_integration_grid_integrations\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_grid_integrations_locale_idx\` ON \`pages_blocks_integration_grid_integrations\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_grid_integrations_logo_idx\` ON \`pages_blocks_integration_grid_integrations\` (\`logo_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_integration_grid\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text NOT NULL,
  	\`subtext\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_grid_order_idx\` ON \`pages_blocks_integration_grid\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_grid_parent_id_idx\` ON \`pages_blocks_integration_grid\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_grid_path_idx\` ON \`pages_blocks_integration_grid\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_grid_locale_idx\` ON \`pages_blocks_integration_grid\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_integration_cluster_integrations\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`logo_id\` integer NOT NULL,
  	\`name\` text NOT NULL,
  	\`description\` text,
  	\`href\` text,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_integration_cluster\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_cluster_integrations_order_idx\` ON \`pages_blocks_integration_cluster_integrations\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_cluster_integrations_parent_id_idx\` ON \`pages_blocks_integration_cluster_integrations\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_cluster_integrations_locale_idx\` ON \`pages_blocks_integration_cluster_integrations\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_cluster_integrations_logo_idx\` ON \`pages_blocks_integration_cluster_integrations\` (\`logo_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_integration_cluster_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text NOT NULL,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_integration_cluster\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_cluster_links_order_idx\` ON \`pages_blocks_integration_cluster_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_cluster_links_parent_id_idx\` ON \`pages_blocks_integration_cluster_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_cluster_links_locale_idx\` ON \`pages_blocks_integration_cluster_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_integration_cluster\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text NOT NULL,
  	\`subtext\` text,
  	\`featured_logo_id\` integer,
  	\`block_name\` text,
  	FOREIGN KEY (\`featured_logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_cluster_order_idx\` ON \`pages_blocks_integration_cluster\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_cluster_parent_id_idx\` ON \`pages_blocks_integration_cluster\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_cluster_path_idx\` ON \`pages_blocks_integration_cluster\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_cluster_locale_idx\` ON \`pages_blocks_integration_cluster\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_cluster_featured_logo_idx\` ON \`pages_blocks_integration_cluster\` (\`featured_logo_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_integration_split_integrations\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`logo_id\` integer NOT NULL,
  	\`name\` text NOT NULL,
  	\`description\` text,
  	\`href\` text,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_integration_split\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_split_integrations_order_idx\` ON \`pages_blocks_integration_split_integrations\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_split_integrations_parent_id_idx\` ON \`pages_blocks_integration_split_integrations\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_split_integrations_locale_idx\` ON \`pages_blocks_integration_split_integrations\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_split_integrations_logo_idx\` ON \`pages_blocks_integration_split_integrations\` (\`logo_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_integration_split_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text NOT NULL,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_integration_split\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_split_links_order_idx\` ON \`pages_blocks_integration_split_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_split_links_parent_id_idx\` ON \`pages_blocks_integration_split_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_split_links_locale_idx\` ON \`pages_blocks_integration_split_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_integration_split\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text NOT NULL,
  	\`subtext\` text,
  	\`featured_logo_id\` integer,
  	\`block_name\` text,
  	FOREIGN KEY (\`featured_logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_split_order_idx\` ON \`pages_blocks_integration_split\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_split_parent_id_idx\` ON \`pages_blocks_integration_split\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_split_path_idx\` ON \`pages_blocks_integration_split\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_split_locale_idx\` ON \`pages_blocks_integration_split\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_split_featured_logo_idx\` ON \`pages_blocks_integration_split\` (\`featured_logo_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_integration_connect_integrations\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`logo_id\` integer NOT NULL,
  	\`name\` text NOT NULL,
  	\`description\` text,
  	\`href\` text,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_integration_connect\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_connect_integrations_order_idx\` ON \`pages_blocks_integration_connect_integrations\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_connect_integrations_parent_id_idx\` ON \`pages_blocks_integration_connect_integrations\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_connect_integrations_locale_idx\` ON \`pages_blocks_integration_connect_integrations\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_connect_integrations_logo_idx\` ON \`pages_blocks_integration_connect_integrations\` (\`logo_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_integration_connect\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text NOT NULL,
  	\`subtext\` text,
  	\`featured_logo_id\` integer,
  	\`block_name\` text,
  	FOREIGN KEY (\`featured_logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_connect_order_idx\` ON \`pages_blocks_integration_connect\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_connect_parent_id_idx\` ON \`pages_blocks_integration_connect\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_connect_path_idx\` ON \`pages_blocks_integration_connect\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_connect_locale_idx\` ON \`pages_blocks_integration_connect\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_connect_featured_logo_idx\` ON \`pages_blocks_integration_connect\` (\`featured_logo_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_integration_list_integrations\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`logo_id\` integer NOT NULL,
  	\`name\` text NOT NULL,
  	\`description\` text,
  	\`href\` text,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_integration_list\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_list_integrations_order_idx\` ON \`pages_blocks_integration_list_integrations\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_list_integrations_parent_id_idx\` ON \`pages_blocks_integration_list_integrations\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_list_integrations_locale_idx\` ON \`pages_blocks_integration_list_integrations\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_list_integrations_logo_idx\` ON \`pages_blocks_integration_list_integrations\` (\`logo_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_integration_list\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text NOT NULL,
  	\`subtext\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_list_order_idx\` ON \`pages_blocks_integration_list\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_list_parent_id_idx\` ON \`pages_blocks_integration_list\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_list_path_idx\` ON \`pages_blocks_integration_list\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_list_locale_idx\` ON \`pages_blocks_integration_list\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_integration_testimonial_integrations\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`logo_id\` integer NOT NULL,
  	\`name\` text NOT NULL,
  	\`description\` text,
  	\`href\` text,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_integration_testimonial\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_testimonial_integrations_order_idx\` ON \`pages_blocks_integration_testimonial_integrations\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_testimonial_integrations_parent_id_idx\` ON \`pages_blocks_integration_testimonial_integrations\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_testimonial_integrations_locale_idx\` ON \`pages_blocks_integration_testimonial_integrations\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_testimonial_integrations_logo_idx\` ON \`pages_blocks_integration_testimonial_integrations\` (\`logo_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_integration_testimonial\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text NOT NULL,
  	\`subtext\` text,
  	\`quote\` text NOT NULL,
  	\`author\` text NOT NULL,
  	\`role\` text,
  	\`author_avatar_id\` integer,
  	\`block_name\` text,
  	FOREIGN KEY (\`author_avatar_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_testimonial_order_idx\` ON \`pages_blocks_integration_testimonial\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_testimonial_parent_id_idx\` ON \`pages_blocks_integration_testimonial\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_testimonial_path_idx\` ON \`pages_blocks_integration_testimonial\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_testimonial_locale_idx\` ON \`pages_blocks_integration_testimonial\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_testimonial_author_avatar_idx\` ON \`pages_blocks_integration_testimonial\` (\`author_avatar_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_call_to_action_boxed_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text NOT NULL,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_call_to_action_boxed\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_call_to_action_boxed_links_order_idx\` ON \`pages_blocks_call_to_action_boxed_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_call_to_action_boxed_links_parent_id_idx\` ON \`pages_blocks_call_to_action_boxed_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_call_to_action_boxed_links_locale_idx\` ON \`pages_blocks_call_to_action_boxed_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_call_to_action_boxed\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`description\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_call_to_action_boxed_order_idx\` ON \`pages_blocks_call_to_action_boxed\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_call_to_action_boxed_parent_id_idx\` ON \`pages_blocks_call_to_action_boxed\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_call_to_action_boxed_path_idx\` ON \`pages_blocks_call_to_action_boxed\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_call_to_action_boxed_locale_idx\` ON \`pages_blocks_call_to_action_boxed\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_team_roster_groups_members\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`avatar_id\` integer NOT NULL,
  	\`name\` text NOT NULL,
  	\`role\` text NOT NULL,
  	\`href\` text,
  	FOREIGN KEY (\`avatar_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_team_roster_groups\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_team_roster_groups_members_order_idx\` ON \`pages_blocks_team_roster_groups_members\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_team_roster_groups_members_parent_id_idx\` ON \`pages_blocks_team_roster_groups_members\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_team_roster_groups_members_locale_idx\` ON \`pages_blocks_team_roster_groups_members\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_team_roster_groups_members_avatar_idx\` ON \`pages_blocks_team_roster_groups_members\` (\`avatar_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_team_roster_groups\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_team_roster\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_team_roster_groups_order_idx\` ON \`pages_blocks_team_roster_groups\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_team_roster_groups_parent_id_idx\` ON \`pages_blocks_team_roster_groups\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_team_roster_groups_locale_idx\` ON \`pages_blocks_team_roster_groups\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_team_roster\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`title\` text NOT NULL,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_team_roster_order_idx\` ON \`pages_blocks_team_roster\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_team_roster_parent_id_idx\` ON \`pages_blocks_team_roster\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_team_roster_path_idx\` ON \`pages_blocks_team_roster\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_team_roster_locale_idx\` ON \`pages_blocks_team_roster\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_team_grid_members\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`avatar_id\` integer NOT NULL,
  	\`name\` text NOT NULL,
  	\`role\` text NOT NULL,
  	\`href\` text,
  	FOREIGN KEY (\`avatar_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_team_grid\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_team_grid_members_order_idx\` ON \`pages_blocks_team_grid_members\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_team_grid_members_parent_id_idx\` ON \`pages_blocks_team_grid_members\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_team_grid_members_locale_idx\` ON \`pages_blocks_team_grid_members\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_team_grid_members_avatar_idx\` ON \`pages_blocks_team_grid_members\` (\`avatar_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_team_grid\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`title\` text NOT NULL,
  	\`description\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_team_grid_order_idx\` ON \`pages_blocks_team_grid\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_team_grid_parent_id_idx\` ON \`pages_blocks_team_grid\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_team_grid_path_idx\` ON \`pages_blocks_team_grid\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_team_grid_locale_idx\` ON \`pages_blocks_team_grid\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_logo_cloud_marquee_logos\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`logo_id\` integer NOT NULL,
  	\`name\` text NOT NULL,
  	\`href\` text,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_logo_cloud_marquee\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_marquee_logos_order_idx\` ON \`pages_blocks_logo_cloud_marquee_logos\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_marquee_logos_parent_id_idx\` ON \`pages_blocks_logo_cloud_marquee_logos\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_marquee_logos_locale_idx\` ON \`pages_blocks_logo_cloud_marquee_logos\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_marquee_logos_logo_idx\` ON \`pages_blocks_logo_cloud_marquee_logos\` (\`logo_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_logo_cloud_marquee\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text NOT NULL,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_marquee_order_idx\` ON \`pages_blocks_logo_cloud_marquee\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_marquee_parent_id_idx\` ON \`pages_blocks_logo_cloud_marquee\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_marquee_path_idx\` ON \`pages_blocks_logo_cloud_marquee\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_logo_cloud_marquee_locale_idx\` ON \`pages_blocks_logo_cloud_marquee\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_integration_marquee_integrations\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`logo_id\` integer NOT NULL,
  	\`name\` text NOT NULL,
  	\`description\` text,
  	\`href\` text,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_integration_marquee\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_marquee_integrations_order_idx\` ON \`pages_blocks_integration_marquee_integrations\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_marquee_integrations_parent_id_idx\` ON \`pages_blocks_integration_marquee_integrations\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_marquee_integrations_locale_idx\` ON \`pages_blocks_integration_marquee_integrations\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_marquee_integrations_logo_idx\` ON \`pages_blocks_integration_marquee_integrations\` (\`logo_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_integration_marquee\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text NOT NULL,
  	\`subtext\` text,
  	\`featured_logo_id\` integer,
  	\`block_name\` text,
  	FOREIGN KEY (\`featured_logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_marquee_order_idx\` ON \`pages_blocks_integration_marquee\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_marquee_parent_id_idx\` ON \`pages_blocks_integration_marquee\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_marquee_path_idx\` ON \`pages_blocks_integration_marquee\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_marquee_locale_idx\` ON \`pages_blocks_integration_marquee\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_integration_marquee_featured_logo_idx\` ON \`pages_blocks_integration_marquee\` (\`featured_logo_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_call_to_action_signup\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`description\` text,
  	\`email_placeholder\` text,
  	\`submit_label\` text,
  	\`action\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_call_to_action_signup_order_idx\` ON \`pages_blocks_call_to_action_signup\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_call_to_action_signup_parent_id_idx\` ON \`pages_blocks_call_to_action_signup\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_call_to_action_signup_path_idx\` ON \`pages_blocks_call_to_action_signup\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_call_to_action_signup_locale_idx\` ON \`pages_blocks_call_to_action_signup\` (\`_locale\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`pages_blocks_feature_grid_basic_items\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_feature_grid_basic_links\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_feature_grid_basic\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_call_to_action_centered_links\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_call_to_action_centered\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_stats_paragraphs\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_stats_features\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_stats_stats\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_stats\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_integration_orbit_integrations\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_integration_orbit\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_feature_split_items\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_feature_split_links\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_feature_split\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_feature_bento_items\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_feature_bento_links\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_feature_bento\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_feature_steps_items\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_feature_steps_links\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_feature_steps\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_embed_basic\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_columns_paragraphs\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_columns_links\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_columns\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_image_lead_paragraphs\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_image_lead_links\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_image_lead\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_feature_media_paragraphs\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_feature_media_features\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_feature_media\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_feature_split_paragraphs\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_feature_split_features\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_feature_split\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_showcase_paragraphs\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_showcase_features\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_showcase\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_quote_paragraphs\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_quote\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_community_paragraphs\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_community_avatars\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_community\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_split_rows_paragraphs\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_split_rows_rows\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_split_rows\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_rows_paragraphs\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_rows_rows\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_rows\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_image_frame_paragraphs\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_image_frame\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_list_items\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_list\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_list_columns_items\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_list_columns\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_list_icons_items\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_list_icons\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_logo_cloud_grid_logos\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_logo_cloud_grid\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_logo_cloud_hover_logos\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_logo_cloud_hover_links\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_logo_cloud_hover\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_logo_cloud_inline_logos\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_logo_cloud_inline\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_logo_cloud_inline_wrap_logos\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_logo_cloud_inline_wrap\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_integration_grid_integrations\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_integration_grid\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_integration_cluster_integrations\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_integration_cluster_links\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_integration_cluster\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_integration_split_integrations\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_integration_split_links\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_integration_split\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_integration_connect_integrations\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_integration_connect\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_integration_list_integrations\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_integration_list\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_integration_testimonial_integrations\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_integration_testimonial\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_call_to_action_boxed_links\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_call_to_action_boxed\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_team_roster_groups_members\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_team_roster_groups\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_team_roster\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_team_grid_members\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_team_grid\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_logo_cloud_marquee_logos\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_logo_cloud_marquee\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_integration_marquee_integrations\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_integration_marquee\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_call_to_action_signup\`;`)
}
