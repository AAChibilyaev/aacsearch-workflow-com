import type { MigrateUpArgs } from '@payloadcms/db-d1-sqlite'

export async function up({ payload }: MigrateUpArgs): Promise<void> {
    // Add wallet fields to tenants billing group
    await payload.db.drizzle.run(
        `ALTER TABLE tenants ADD COLUMN billing_walletId TEXT DEFAULT NULL;
         ALTER TABLE tenants ADD COLUMN billing_walletBalanceCents INTEGER DEFAULT 0;
         ALTER TABLE tenants ADD COLUMN billing_walletCurrency TEXT DEFAULT 'USD';`,
    )

    // Create invoices table
    await payload.db.drizzle.run(
        `CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
            lagoId TEXT UNIQUE,
            number TEXT,
            status TEXT DEFAULT 'draft',
            amountCents INTEGER DEFAULT 0,
            currency TEXT DEFAULT 'USD',
            invoiceType TEXT DEFAULT 'subscription',
            periodStart TEXT,
            periodEnd TEXT,
            paidAt TEXT,
            createdAt TEXT DEFAULT (datetime('now')),
            updatedAt TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_invoices_lagoId ON invoices(lagoId);`,
    )

    payload.logger.info({ msg: 'migration: wallet + invoices done' })
}

export async function down({ payload }: MigrateUpArgs): Promise<void> {
    await payload.db.drizzle.run(
        `ALTER TABLE tenants DROP COLUMN billing_walletId;
         ALTER TABLE tenants DROP COLUMN billing_walletBalanceCents;
         ALTER TABLE tenants DROP COLUMN billing_walletCurrency;
         DROP TABLE IF EXISTS invoices;`,
    )

    payload.logger.info({ msg: 'migration: wallet + invoices rolled back' })
}
