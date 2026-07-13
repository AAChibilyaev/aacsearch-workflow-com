import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`cmp_grid_plans_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text NOT NULL,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`cmp_grid_plans\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`cmp_grid_plans_links_order_idx\` ON \`cmp_grid_plans_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`cmp_grid_plans_links_parent_id_idx\` ON \`cmp_grid_plans_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`cmp_grid_plans_links_locale_idx\` ON \`cmp_grid_plans_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`cmp_grid_plans\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`price\` text,
  	\`period\` text,
  	\`badge\` text,
  	\`highlighted\` integer,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`cmp_grid\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`cmp_grid_plans_order_idx\` ON \`cmp_grid_plans\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`cmp_grid_plans_parent_id_idx\` ON \`cmp_grid_plans\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`cmp_grid_plans_locale_idx\` ON \`cmp_grid_plans\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`cmp_grid_features_values\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`included\` integer,
  	\`label\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`cmp_grid_features\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`cmp_grid_features_values_order_idx\` ON \`cmp_grid_features_values\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`cmp_grid_features_values_parent_id_idx\` ON \`cmp_grid_features_values\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`cmp_grid_features_values_locale_idx\` ON \`cmp_grid_features_values\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`cmp_grid_features\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`feature\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`cmp_grid\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`cmp_grid_features_order_idx\` ON \`cmp_grid_features\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`cmp_grid_features_parent_id_idx\` ON \`cmp_grid_features\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`cmp_grid_features_locale_idx\` ON \`cmp_grid_features\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`cmp_grid\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`description\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`cmp_grid_order_idx\` ON \`cmp_grid\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`cmp_grid_parent_id_idx\` ON \`cmp_grid\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`cmp_grid_path_idx\` ON \`cmp_grid\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`cmp_grid_locale_idx\` ON \`cmp_grid\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`cmp_stack_plans_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text NOT NULL,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`cmp_stack_plans\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`cmp_stack_plans_links_order_idx\` ON \`cmp_stack_plans_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`cmp_stack_plans_links_parent_id_idx\` ON \`cmp_stack_plans_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`cmp_stack_plans_links_locale_idx\` ON \`cmp_stack_plans_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`cmp_stack_plans_features\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text NOT NULL,
  	\`included\` integer,
  	\`value\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`cmp_stack_plans\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`cmp_stack_plans_features_order_idx\` ON \`cmp_stack_plans_features\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`cmp_stack_plans_features_parent_id_idx\` ON \`cmp_stack_plans_features\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`cmp_stack_plans_features_locale_idx\` ON \`cmp_stack_plans_features\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`cmp_stack_plans\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`description\` text,
  	\`price\` text,
  	\`period\` text,
  	\`badge\` text,
  	\`highlighted\` integer,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`cmp_stack\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`cmp_stack_plans_order_idx\` ON \`cmp_stack_plans\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`cmp_stack_plans_parent_id_idx\` ON \`cmp_stack_plans\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`cmp_stack_plans_locale_idx\` ON \`cmp_stack_plans\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`cmp_stack\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`description\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`cmp_stack_order_idx\` ON \`cmp_stack\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`cmp_stack_parent_id_idx\` ON \`cmp_stack\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`cmp_stack_path_idx\` ON \`cmp_stack\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`cmp_stack_locale_idx\` ON \`cmp_stack\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`cmp_table_plans_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text NOT NULL,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`cmp_table_plans\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`cmp_table_plans_links_order_idx\` ON \`cmp_table_plans_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`cmp_table_plans_links_parent_id_idx\` ON \`cmp_table_plans_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`cmp_table_plans_links_locale_idx\` ON \`cmp_table_plans_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`cmp_table_plans\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`badge\` text,
  	\`highlighted\` integer,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`cmp_table\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`cmp_table_plans_order_idx\` ON \`cmp_table_plans\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`cmp_table_plans_parent_id_idx\` ON \`cmp_table_plans\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`cmp_table_plans_locale_idx\` ON \`cmp_table_plans\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`cmp_table_features_values\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`included\` integer,
  	\`label\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`cmp_table_features\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`cmp_table_features_values_order_idx\` ON \`cmp_table_features_values\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`cmp_table_features_values_parent_id_idx\` ON \`cmp_table_features_values\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`cmp_table_features_values_locale_idx\` ON \`cmp_table_features_values\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`cmp_table_features\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`group_label\` text,
  	\`feature\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`cmp_table\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`cmp_table_features_order_idx\` ON \`cmp_table_features\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`cmp_table_features_parent_id_idx\` ON \`cmp_table_features\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`cmp_table_features_locale_idx\` ON \`cmp_table_features\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`cmp_table\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`description\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`cmp_table_order_idx\` ON \`cmp_table\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`cmp_table_parent_id_idx\` ON \`cmp_table\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`cmp_table_path_idx\` ON \`cmp_table\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`cmp_table_locale_idx\` ON \`cmp_table\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`faq_accordion_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`question\` text NOT NULL,
  	\`answer\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`faq_accordion\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`faq_accordion_items_order_idx\` ON \`faq_accordion_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`faq_accordion_items_parent_id_idx\` ON \`faq_accordion_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`faq_accordion_items_locale_idx\` ON \`faq_accordion_items\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`faq_accordion_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text NOT NULL,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`faq_accordion\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`faq_accordion_links_order_idx\` ON \`faq_accordion_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`faq_accordion_links_parent_id_idx\` ON \`faq_accordion_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`faq_accordion_links_locale_idx\` ON \`faq_accordion_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`faq_accordion\` (
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
  await db.run(sql`CREATE INDEX \`faq_accordion_order_idx\` ON \`faq_accordion\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`faq_accordion_parent_id_idx\` ON \`faq_accordion\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`faq_accordion_path_idx\` ON \`faq_accordion\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`faq_accordion_locale_idx\` ON \`faq_accordion\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`faq_card_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`question\` text NOT NULL,
  	\`answer\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`faq_card\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`faq_card_items_order_idx\` ON \`faq_card_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`faq_card_items_parent_id_idx\` ON \`faq_card_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`faq_card_items_locale_idx\` ON \`faq_card_items\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`faq_card_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text NOT NULL,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`faq_card\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`faq_card_links_order_idx\` ON \`faq_card_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`faq_card_links_parent_id_idx\` ON \`faq_card_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`faq_card_links_locale_idx\` ON \`faq_card_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`faq_card\` (
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
  await db.run(sql`CREATE INDEX \`faq_card_order_idx\` ON \`faq_card\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`faq_card_parent_id_idx\` ON \`faq_card\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`faq_card_path_idx\` ON \`faq_card\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`faq_card_locale_idx\` ON \`faq_card\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`faq_grid_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`question\` text NOT NULL,
  	\`answer\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`faq_grid\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`faq_grid_items_order_idx\` ON \`faq_grid_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`faq_grid_items_parent_id_idx\` ON \`faq_grid_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`faq_grid_items_locale_idx\` ON \`faq_grid_items\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`faq_grid\` (
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
  await db.run(sql`CREATE INDEX \`faq_grid_order_idx\` ON \`faq_grid\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`faq_grid_parent_id_idx\` ON \`faq_grid\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`faq_grid_path_idx\` ON \`faq_grid\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`faq_grid_locale_idx\` ON \`faq_grid\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`faq_grouped_groups_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`question\` text NOT NULL,
  	\`answer\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`faq_grouped_groups\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`faq_grouped_groups_items_order_idx\` ON \`faq_grouped_groups_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`faq_grouped_groups_items_parent_id_idx\` ON \`faq_grouped_groups_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`faq_grouped_groups_items_locale_idx\` ON \`faq_grouped_groups_items\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`faq_grouped_groups\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`icon\` text,
  	\`title\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`faq_grouped\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`faq_grouped_groups_order_idx\` ON \`faq_grouped_groups\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`faq_grouped_groups_parent_id_idx\` ON \`faq_grouped_groups\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`faq_grouped_groups_locale_idx\` ON \`faq_grouped_groups\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`faq_grouped\` (
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
  await db.run(sql`CREATE INDEX \`faq_grouped_order_idx\` ON \`faq_grouped\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`faq_grouped_parent_id_idx\` ON \`faq_grouped\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`faq_grouped_path_idx\` ON \`faq_grouped\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`faq_grouped_locale_idx\` ON \`faq_grouped\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`faq_icons_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`icon\` text,
  	\`question\` text NOT NULL,
  	\`answer\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`faq_icons\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`faq_icons_items_order_idx\` ON \`faq_icons_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`faq_icons_items_parent_id_idx\` ON \`faq_icons_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`faq_icons_items_locale_idx\` ON \`faq_icons_items\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`faq_icons\` (
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
  await db.run(sql`CREATE INDEX \`faq_icons_order_idx\` ON \`faq_icons\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`faq_icons_parent_id_idx\` ON \`faq_icons\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`faq_icons_path_idx\` ON \`faq_icons\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`faq_icons_locale_idx\` ON \`faq_icons\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`faq_split_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`question\` text NOT NULL,
  	\`answer\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`faq_split\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`faq_split_items_order_idx\` ON \`faq_split_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`faq_split_items_parent_id_idx\` ON \`faq_split_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`faq_split_items_locale_idx\` ON \`faq_split_items\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`faq_split_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text NOT NULL,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`faq_split\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`faq_split_links_order_idx\` ON \`faq_split_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`faq_split_links_parent_id_idx\` ON \`faq_split_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`faq_split_links_locale_idx\` ON \`faq_split_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`faq_split\` (
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
  await db.run(sql`CREATE INDEX \`faq_split_order_idx\` ON \`faq_split\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`faq_split_parent_id_idx\` ON \`faq_split\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`faq_split_path_idx\` ON \`faq_split\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`faq_split_locale_idx\` ON \`faq_split\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`prc_cards_plans_features\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`feature\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`prc_cards_plans\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`prc_cards_plans_features_order_idx\` ON \`prc_cards_plans_features\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prc_cards_plans_features_parent_id_idx\` ON \`prc_cards_plans_features\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`prc_cards_plans_features_locale_idx\` ON \`prc_cards_plans_features\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`prc_cards_plans_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text NOT NULL,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`prc_cards_plans\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`prc_cards_plans_links_order_idx\` ON \`prc_cards_plans_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prc_cards_plans_links_parent_id_idx\` ON \`prc_cards_plans_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`prc_cards_plans_links_locale_idx\` ON \`prc_cards_plans_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`prc_cards_plans\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`price\` text NOT NULL,
  	\`period\` text,
  	\`description\` text,
  	\`featured\` integer DEFAULT false,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`prc_cards\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`prc_cards_plans_order_idx\` ON \`prc_cards_plans\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prc_cards_plans_parent_id_idx\` ON \`prc_cards_plans\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`prc_cards_plans_locale_idx\` ON \`prc_cards_plans\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`prc_cards\` (
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
  await db.run(sql`CREATE INDEX \`prc_cards_order_idx\` ON \`prc_cards\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prc_cards_parent_id_idx\` ON \`prc_cards\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`prc_cards_path_idx\` ON \`prc_cards\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`prc_cards_locale_idx\` ON \`prc_cards\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`prc_cards_cta_plans_features\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`feature\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`prc_cards_cta_plans\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`prc_cards_cta_plans_features_order_idx\` ON \`prc_cards_cta_plans_features\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prc_cards_cta_plans_features_parent_id_idx\` ON \`prc_cards_cta_plans_features\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`prc_cards_cta_plans_features_locale_idx\` ON \`prc_cards_cta_plans_features\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`prc_cards_cta_plans_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text NOT NULL,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`prc_cards_cta_plans\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`prc_cards_cta_plans_links_order_idx\` ON \`prc_cards_cta_plans_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prc_cards_cta_plans_links_parent_id_idx\` ON \`prc_cards_cta_plans_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`prc_cards_cta_plans_links_locale_idx\` ON \`prc_cards_cta_plans_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`prc_cards_cta_plans\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`price\` text NOT NULL,
  	\`period\` text,
  	\`description\` text,
  	\`featured\` integer DEFAULT false,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`prc_cards_cta\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`prc_cards_cta_plans_order_idx\` ON \`prc_cards_cta_plans\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prc_cards_cta_plans_parent_id_idx\` ON \`prc_cards_cta_plans\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`prc_cards_cta_plans_locale_idx\` ON \`prc_cards_cta_plans\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`prc_cards_cta\` (
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
  await db.run(sql`CREATE INDEX \`prc_cards_cta_order_idx\` ON \`prc_cards_cta\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prc_cards_cta_parent_id_idx\` ON \`prc_cards_cta\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`prc_cards_cta_path_idx\` ON \`prc_cards_cta\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`prc_cards_cta_locale_idx\` ON \`prc_cards_cta\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`prc_muted_plans_features\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`feature\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`prc_muted_plans\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`prc_muted_plans_features_order_idx\` ON \`prc_muted_plans_features\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prc_muted_plans_features_parent_id_idx\` ON \`prc_muted_plans_features\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`prc_muted_plans_features_locale_idx\` ON \`prc_muted_plans_features\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`prc_muted_plans_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text NOT NULL,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`prc_muted_plans\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`prc_muted_plans_links_order_idx\` ON \`prc_muted_plans_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prc_muted_plans_links_parent_id_idx\` ON \`prc_muted_plans_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`prc_muted_plans_links_locale_idx\` ON \`prc_muted_plans_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`prc_muted_plans\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`price\` text NOT NULL,
  	\`period\` text,
  	\`description\` text,
  	\`featured\` integer DEFAULT false,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`prc_muted\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`prc_muted_plans_order_idx\` ON \`prc_muted_plans\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prc_muted_plans_parent_id_idx\` ON \`prc_muted_plans\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`prc_muted_plans_locale_idx\` ON \`prc_muted_plans\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`prc_muted\` (
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
  await db.run(sql`CREATE INDEX \`prc_muted_order_idx\` ON \`prc_muted\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prc_muted_parent_id_idx\` ON \`prc_muted\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`prc_muted_path_idx\` ON \`prc_muted\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`prc_muted_locale_idx\` ON \`prc_muted\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`prc_ent_plans_features\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`feature\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`prc_ent_plans\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`prc_ent_plans_features_order_idx\` ON \`prc_ent_plans_features\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prc_ent_plans_features_parent_id_idx\` ON \`prc_ent_plans_features\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`prc_ent_plans_features_locale_idx\` ON \`prc_ent_plans_features\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`prc_ent_plans_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text NOT NULL,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`prc_ent_plans\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`prc_ent_plans_links_order_idx\` ON \`prc_ent_plans_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prc_ent_plans_links_parent_id_idx\` ON \`prc_ent_plans_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`prc_ent_plans_links_locale_idx\` ON \`prc_ent_plans_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`prc_ent_plans\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`price\` text NOT NULL,
  	\`period\` text,
  	\`description\` text,
  	\`featured\` integer DEFAULT false,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`prc_ent\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`prc_ent_plans_order_idx\` ON \`prc_ent_plans\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prc_ent_plans_parent_id_idx\` ON \`prc_ent_plans\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`prc_ent_plans_locale_idx\` ON \`prc_ent_plans\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`prc_ent_logos\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`logo_id\` integer NOT NULL,
  	\`name\` text NOT NULL,
  	\`href\` text,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`prc_ent\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`prc_ent_logos_order_idx\` ON \`prc_ent_logos\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prc_ent_logos_parent_id_idx\` ON \`prc_ent_logos\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`prc_ent_logos_locale_idx\` ON \`prc_ent_logos\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`prc_ent_logos_logo_idx\` ON \`prc_ent_logos\` (\`logo_id\`);`)
  await db.run(sql`CREATE TABLE \`prc_ent\` (
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
  await db.run(sql`CREATE INDEX \`prc_ent_order_idx\` ON \`prc_ent\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prc_ent_parent_id_idx\` ON \`prc_ent\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`prc_ent_path_idx\` ON \`prc_ent\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`prc_ent_locale_idx\` ON \`prc_ent\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`prc_split_plans_features\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`feature\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`prc_split_plans\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`prc_split_plans_features_order_idx\` ON \`prc_split_plans_features\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prc_split_plans_features_parent_id_idx\` ON \`prc_split_plans_features\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`prc_split_plans_features_locale_idx\` ON \`prc_split_plans_features\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`prc_split_plans_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text NOT NULL,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`prc_split_plans\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`prc_split_plans_links_order_idx\` ON \`prc_split_plans_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prc_split_plans_links_parent_id_idx\` ON \`prc_split_plans_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`prc_split_plans_links_locale_idx\` ON \`prc_split_plans_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`prc_split_plans\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`price\` text NOT NULL,
  	\`period\` text,
  	\`description\` text,
  	\`featured\` integer DEFAULT false,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`prc_split\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`prc_split_plans_order_idx\` ON \`prc_split_plans\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prc_split_plans_parent_id_idx\` ON \`prc_split_plans\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`prc_split_plans_locale_idx\` ON \`prc_split_plans\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`prc_split\` (
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
  await db.run(sql`CREATE INDEX \`prc_split_order_idx\` ON \`prc_split\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prc_split_parent_id_idx\` ON \`prc_split\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`prc_split_path_idx\` ON \`prc_split\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`prc_split_locale_idx\` ON \`prc_split\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`tst_bento_testimonials\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`quote\` text NOT NULL,
  	\`author\` text NOT NULL,
  	\`role\` text,
  	\`avatar_id\` integer,
  	\`logo_id\` integer,
  	\`featured\` integer DEFAULT false,
  	FOREIGN KEY (\`avatar_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`tst_bento\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`tst_bento_testimonials_order_idx\` ON \`tst_bento_testimonials\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`tst_bento_testimonials_parent_id_idx\` ON \`tst_bento_testimonials\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`tst_bento_testimonials_locale_idx\` ON \`tst_bento_testimonials\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`tst_bento_testimonials_avatar_idx\` ON \`tst_bento_testimonials\` (\`avatar_id\`);`)
  await db.run(sql`CREATE INDEX \`tst_bento_testimonials_logo_idx\` ON \`tst_bento_testimonials\` (\`logo_id\`);`)
  await db.run(sql`CREATE TABLE \`tst_bento\` (
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
  await db.run(sql`CREATE INDEX \`tst_bento_order_idx\` ON \`tst_bento\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`tst_bento_parent_id_idx\` ON \`tst_bento\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`tst_bento_path_idx\` ON \`tst_bento\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`tst_bento_locale_idx\` ON \`tst_bento\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`tst_grid_testimonials\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`quote\` text NOT NULL,
  	\`author\` text NOT NULL,
  	\`role\` text,
  	\`avatar_id\` integer,
  	FOREIGN KEY (\`avatar_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`tst_grid\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`tst_grid_testimonials_order_idx\` ON \`tst_grid_testimonials\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`tst_grid_testimonials_parent_id_idx\` ON \`tst_grid_testimonials\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`tst_grid_testimonials_locale_idx\` ON \`tst_grid_testimonials\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`tst_grid_testimonials_avatar_idx\` ON \`tst_grid_testimonials\` (\`avatar_id\`);`)
  await db.run(sql`CREATE TABLE \`tst_grid\` (
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
  await db.run(sql`CREATE INDEX \`tst_grid_order_idx\` ON \`tst_grid\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`tst_grid_parent_id_idx\` ON \`tst_grid\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`tst_grid_path_idx\` ON \`tst_grid\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`tst_grid_locale_idx\` ON \`tst_grid\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`tst_quote\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`quote\` text NOT NULL,
  	\`author\` text NOT NULL,
  	\`role\` text,
  	\`avatar_id\` integer,
  	\`block_name\` text,
  	FOREIGN KEY (\`avatar_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`tst_quote_order_idx\` ON \`tst_quote\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`tst_quote_parent_id_idx\` ON \`tst_quote\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`tst_quote_path_idx\` ON \`tst_quote\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`tst_quote_locale_idx\` ON \`tst_quote\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`tst_quote_avatar_idx\` ON \`tst_quote\` (\`avatar_id\`);`)
  await db.run(sql`CREATE TABLE \`tst_rating_testimonials\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`rating\` numeric DEFAULT 5 NOT NULL,
  	\`quote\` text NOT NULL,
  	\`author\` text NOT NULL,
  	\`role\` text,
  	\`avatar_id\` integer,
  	FOREIGN KEY (\`avatar_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`tst_rating\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`tst_rating_testimonials_order_idx\` ON \`tst_rating_testimonials\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`tst_rating_testimonials_parent_id_idx\` ON \`tst_rating_testimonials\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`tst_rating_testimonials_locale_idx\` ON \`tst_rating_testimonials\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`tst_rating_testimonials_avatar_idx\` ON \`tst_rating_testimonials\` (\`avatar_id\`);`)
  await db.run(sql`CREATE TABLE \`tst_rating\` (
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
  await db.run(sql`CREATE INDEX \`tst_rating_order_idx\` ON \`tst_rating\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`tst_rating_parent_id_idx\` ON \`tst_rating\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`tst_rating_path_idx\` ON \`tst_rating\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`tst_rating_locale_idx\` ON \`tst_rating\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`tst_spot\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`quote\` text NOT NULL,
  	\`author\` text NOT NULL,
  	\`role\` text,
  	\`avatar_id\` integer,
  	\`block_name\` text,
  	FOREIGN KEY (\`avatar_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`tst_spot_order_idx\` ON \`tst_spot\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`tst_spot_parent_id_idx\` ON \`tst_spot\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`tst_spot_path_idx\` ON \`tst_spot\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`tst_spot_locale_idx\` ON \`tst_spot\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`tst_spot_avatar_idx\` ON \`tst_spot\` (\`avatar_id\`);`)
  await db.run(sql`CREATE TABLE \`tst_wall_testimonials\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`quote\` text NOT NULL,
  	\`author\` text NOT NULL,
  	\`role\` text,
  	\`avatar_id\` integer,
  	FOREIGN KEY (\`avatar_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`tst_wall\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`tst_wall_testimonials_order_idx\` ON \`tst_wall_testimonials\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`tst_wall_testimonials_parent_id_idx\` ON \`tst_wall_testimonials\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`tst_wall_testimonials_locale_idx\` ON \`tst_wall_testimonials\` (\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`tst_wall_testimonials_avatar_idx\` ON \`tst_wall_testimonials\` (\`avatar_id\`);`)
  await db.run(sql`CREATE TABLE \`tst_wall\` (
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
  await db.run(sql`CREATE INDEX \`tst_wall_order_idx\` ON \`tst_wall\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`tst_wall_parent_id_idx\` ON \`tst_wall\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`tst_wall_path_idx\` ON \`tst_wall\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`tst_wall_locale_idx\` ON \`tst_wall\` (\`_locale\`);`)
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
  await db.run(sql`DROP TABLE \`cmp_grid_plans_links\`;`)
  await db.run(sql`DROP TABLE \`cmp_grid_plans\`;`)
  await db.run(sql`DROP TABLE \`cmp_grid_features_values\`;`)
  await db.run(sql`DROP TABLE \`cmp_grid_features\`;`)
  await db.run(sql`DROP TABLE \`cmp_grid\`;`)
  await db.run(sql`DROP TABLE \`cmp_stack_plans_links\`;`)
  await db.run(sql`DROP TABLE \`cmp_stack_plans_features\`;`)
  await db.run(sql`DROP TABLE \`cmp_stack_plans\`;`)
  await db.run(sql`DROP TABLE \`cmp_stack\`;`)
  await db.run(sql`DROP TABLE \`cmp_table_plans_links\`;`)
  await db.run(sql`DROP TABLE \`cmp_table_plans\`;`)
  await db.run(sql`DROP TABLE \`cmp_table_features_values\`;`)
  await db.run(sql`DROP TABLE \`cmp_table_features\`;`)
  await db.run(sql`DROP TABLE \`cmp_table\`;`)
  await db.run(sql`DROP TABLE \`faq_accordion_items\`;`)
  await db.run(sql`DROP TABLE \`faq_accordion_links\`;`)
  await db.run(sql`DROP TABLE \`faq_accordion\`;`)
  await db.run(sql`DROP TABLE \`faq_card_items\`;`)
  await db.run(sql`DROP TABLE \`faq_card_links\`;`)
  await db.run(sql`DROP TABLE \`faq_card\`;`)
  await db.run(sql`DROP TABLE \`faq_grid_items\`;`)
  await db.run(sql`DROP TABLE \`faq_grid\`;`)
  await db.run(sql`DROP TABLE \`faq_grouped_groups_items\`;`)
  await db.run(sql`DROP TABLE \`faq_grouped_groups\`;`)
  await db.run(sql`DROP TABLE \`faq_grouped\`;`)
  await db.run(sql`DROP TABLE \`faq_icons_items\`;`)
  await db.run(sql`DROP TABLE \`faq_icons\`;`)
  await db.run(sql`DROP TABLE \`faq_split_items\`;`)
  await db.run(sql`DROP TABLE \`faq_split_links\`;`)
  await db.run(sql`DROP TABLE \`faq_split\`;`)
  await db.run(sql`DROP TABLE \`prc_cards_plans_features\`;`)
  await db.run(sql`DROP TABLE \`prc_cards_plans_links\`;`)
  await db.run(sql`DROP TABLE \`prc_cards_plans\`;`)
  await db.run(sql`DROP TABLE \`prc_cards\`;`)
  await db.run(sql`DROP TABLE \`prc_cards_cta_plans_features\`;`)
  await db.run(sql`DROP TABLE \`prc_cards_cta_plans_links\`;`)
  await db.run(sql`DROP TABLE \`prc_cards_cta_plans\`;`)
  await db.run(sql`DROP TABLE \`prc_cards_cta\`;`)
  await db.run(sql`DROP TABLE \`prc_muted_plans_features\`;`)
  await db.run(sql`DROP TABLE \`prc_muted_plans_links\`;`)
  await db.run(sql`DROP TABLE \`prc_muted_plans\`;`)
  await db.run(sql`DROP TABLE \`prc_muted\`;`)
  await db.run(sql`DROP TABLE \`prc_ent_plans_features\`;`)
  await db.run(sql`DROP TABLE \`prc_ent_plans_links\`;`)
  await db.run(sql`DROP TABLE \`prc_ent_plans\`;`)
  await db.run(sql`DROP TABLE \`prc_ent_logos\`;`)
  await db.run(sql`DROP TABLE \`prc_ent\`;`)
  await db.run(sql`DROP TABLE \`prc_split_plans_features\`;`)
  await db.run(sql`DROP TABLE \`prc_split_plans_links\`;`)
  await db.run(sql`DROP TABLE \`prc_split_plans\`;`)
  await db.run(sql`DROP TABLE \`prc_split\`;`)
  await db.run(sql`DROP TABLE \`tst_bento_testimonials\`;`)
  await db.run(sql`DROP TABLE \`tst_bento\`;`)
  await db.run(sql`DROP TABLE \`tst_grid_testimonials\`;`)
  await db.run(sql`DROP TABLE \`tst_grid\`;`)
  await db.run(sql`DROP TABLE \`tst_quote\`;`)
  await db.run(sql`DROP TABLE \`tst_rating_testimonials\`;`)
  await db.run(sql`DROP TABLE \`tst_rating\`;`)
  await db.run(sql`DROP TABLE \`tst_spot\`;`)
  await db.run(sql`DROP TABLE \`tst_wall_testimonials\`;`)
  await db.run(sql`DROP TABLE \`tst_wall\`;`)
  await db.run(sql`ALTER TABLE \`plugin_ai_instructions\` ADD \`anth_c_text_settings_model\` text DEFAULT 'claude-3-5-sonnet-latest';`)
  await db.run(sql`ALTER TABLE \`plugin_ai_instructions\` ADD \`anth_c_text_settings_max_tokens\` numeric DEFAULT 5000;`)
  await db.run(sql`ALTER TABLE \`plugin_ai_instructions\` ADD \`anth_c_text_settings_temperature\` numeric DEFAULT 0.7;`)
  await db.run(sql`ALTER TABLE \`plugin_ai_instructions\` ADD \`anth_c_text_settings_extract_attachments\` integer;`)
  await db.run(sql`ALTER TABLE \`plugin_ai_instructions\` ADD \`anth_c_object_settings_model\` text DEFAULT 'claude-3-5-sonnet-latest';`)
  await db.run(sql`ALTER TABLE \`plugin_ai_instructions\` ADD \`anth_c_object_settings_max_tokens\` numeric DEFAULT 5000;`)
  await db.run(sql`ALTER TABLE \`plugin_ai_instructions\` ADD \`anth_c_object_settings_temperature\` numeric DEFAULT 0.7;`)
  await db.run(sql`ALTER TABLE \`plugin_ai_instructions\` ADD \`anth_c_object_settings_extract_attachments\` integer;`)
}
