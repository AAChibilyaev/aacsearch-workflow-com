import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`pages_blocks_hero_basic_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text NOT NULL,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_hero_basic\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_basic_links_order_idx\` ON \`pages_blocks_hero_basic_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_basic_links_parent_id_idx\` ON \`pages_blocks_hero_basic_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_basic_links_locale_idx\` ON \`pages_blocks_hero_basic_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_hero_basic_proof_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_hero_basic\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_basic_proof_items_order_idx\` ON \`pages_blocks_hero_basic_proof_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_basic_proof_items_parent_id_idx\` ON \`pages_blocks_hero_basic_proof_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_basic_proof_items_locale_idx\` ON \`pages_blocks_hero_basic_proof_items\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_hero_basic\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`title\` text NOT NULL,
  	\`description\` text NOT NULL,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_basic_order_idx\` ON \`pages_blocks_hero_basic\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_basic_parent_id_idx\` ON \`pages_blocks_hero_basic\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_basic_path_idx\` ON \`pages_blocks_hero_basic\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_basic_locale_idx\` ON \`pages_blocks_hero_basic\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`pages_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`locale\` text,
  	\`pages_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`pages_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_rels_order_idx\` ON \`pages_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`pages_rels_parent_idx\` ON \`pages_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_rels_path_idx\` ON \`pages_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`pages_rels_locale_idx\` ON \`pages_rels\` (\`locale\`);`)
  await db.run(sql`CREATE INDEX \`pages_rels_pages_id_idx\` ON \`pages_rels\` (\`pages_id\`,\`locale\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`pages_blocks_hero_basic_links\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_hero_basic_proof_items\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_hero_basic\`;`)
  await db.run(sql`DROP TABLE \`pages_rels\`;`)
}
