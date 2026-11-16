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
