import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDatabase } from '../src/config/database.js';
import { User } from '../src/models/index.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDirectory, '..', '.env') });

async function main() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
    throw new Error('Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters in backend/.env.');
  }

  await connectDatabase();
  try {
    const email = ADMIN_EMAIL.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const user = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          name: process.env.ADMIN_NAME || 'Roamora Admin',
          role: 'admin',
          isActive: true,
          authProvider: 'local',
          passwordHash,
        },
        $setOnInsert: { email, isDemo: false },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    console.log(`Administrator account is ready for ${user.email}. No password was printed.`);
  } finally {
    await (await import('mongoose')).default.disconnect();
  }
}

main().catch((error) => {
  console.error(`Admin bootstrap failed: ${error.message}`);
  process.exitCode = 1;
});
