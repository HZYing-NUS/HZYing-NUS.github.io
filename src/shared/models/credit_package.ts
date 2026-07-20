import { asc, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { creditPackage } from '@/config/db/schema';

export type CreditPackage = typeof creditPackage.$inferSelect;

export async function getActiveCreditPackages() {
  return db()
    .select()
    .from(creditPackage)
    .where(eq(creditPackage.enabled, true))
    .orderBy(asc(creditPackage.sortOrder));
}

export async function getCreditPackageByCode(code: string) {
  const [item] = await db()
    .select()
    .from(creditPackage)
    .where(eq(creditPackage.code, code));
  return item;
}

export async function getAllCreditPackages() {
  return db()
    .select()
    .from(creditPackage)
    .orderBy(asc(creditPackage.sortOrder));
}

export async function updateCreditPackage(
  id: string,
  values: Partial<
    Pick<
      CreditPackage,
      | 'creemSandboxProductId'
      | 'creemProductionProductId'
      | 'enabled'
      | 'recommended'
    >
  >
) {
  return db().transaction(async (tx: any) => {
    if (values.recommended) {
      await tx
        .update(creditPackage)
        .set({ recommended: false })
        .where(eq(creditPackage.recommended, true));
    }
    const [updated] = await tx
      .update(creditPackage)
      .set(values)
      .where(eq(creditPackage.id, id))
      .returning();
    return updated;
  });
}

export function getPackageProductId(item: CreditPackage, environment: string) {
  return environment === 'production'
    ? item.creemProductionProductId
    : item.creemSandboxProductId;
}

export function publicCreditPackage(item: CreditPackage, locale = 'en') {
  return {
    code: item.code,
    name: locale === 'zh' ? item.nameZh : item.nameEn,
    credits: item.credits,
    priceUsd: (item.amountUsdCents / 100).toFixed(2),
    recommended: item.recommended,
  };
}
