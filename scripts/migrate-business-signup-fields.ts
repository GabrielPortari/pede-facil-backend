import * as admin from 'firebase-admin';

function normalizeCnpj(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, '');
  return digits.length === 14 ? digits : undefined;
}

async function run() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }

  const db = admin.firestore();
  const snapshot = await db.collection('businesses').get();

  let updated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data() as Record<string, unknown>;
    const patch: Record<string, unknown> = {};

    if (typeof data.legalName !== 'string' || !data.legalName.trim()) {
      if (typeof data.name === 'string' && data.name.trim()) {
        patch.legalName = data.name.trim();
      }
    }

    const cnpj = normalizeCnpj(
      typeof data.cnpj === 'string' ? data.cnpj : undefined,
    );
    if (!cnpj) {
      skipped += 1;
      continue;
    }
    patch.cnpj = cnpj;

    if (Object.keys(patch).length === 0) {
      continue;
    }

    await doc.ref.set(patch, { merge: true });
    updated += 1;
  }

  // eslint-disable-next-line no-console
  console.log(`Migration completed. Updated: ${updated}, skipped: ${skipped}`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Migration failed:', error);
    process.exit(1);
  });
