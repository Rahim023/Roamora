import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDirectory, '..', '.env') });

const [{ default: app }, { connectDatabase }] = await Promise.all([
  import('./app.js'),
  import('./config/database.js'),
]);

try {
  await connectDatabase();
  
  // Diagnostic check for Travo configuration
  if (process.env.NODE_ENV !== 'test') {
    console.log('\n📍 Service Configuration Check:');
    console.log('================================');
    if (process.env.GEMINI_API_KEY) {
      console.log('✅ Travo: Configured (Gemini API key present)');
    } else {
      console.log('⚠️  Travo: Not configured (GEMINI_API_KEY missing)');
    }
    console.log('================================\n');
  }
  
  const port = Number(process.env.PORT || 5000);
  const server = app.listen(port, () => {
    console.log(`Roamora API listening on port ${port}.`);
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      server.close(() => {
        import('mongoose').then(({ default: mongoose }) => mongoose.disconnect())
          .then(() => process.exit(0))
          .catch((error) => {
            console.error(`Shutdown failed: ${error.message}`);
            process.exitCode = 1;
          });
      });
    });
  }
} catch (error) {
  console.error(`Roamora API startup failed: ${error.message}`);
  process.exitCode = 1;
}
