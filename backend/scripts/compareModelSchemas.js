import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Activity,
  Departure,
  Itinerary,
  Order,
  Package,
  Review,
  SiteContent,
  User,
  Wishlist,
} from '../src/models/index.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDirectory, '..', '.env') });

const modelsByCollection = new Map([
  ['users', User],
  ['package', Package],
  ['departures', Departure],
  ['orders', Order],
  ['wishlist', Wishlist],
  ['reviews', Review],
  ['activities', Activity],
  ['iteneraries', Itinerary],
  ['sitecontents', SiteContent],
]);

async function compareCollection(database, collectionName, model) {
  const issues = new Map();
  let documentCount = 0;
  let invalidDocuments = 0;
  let unknownFields = 0;
  const cursor = database.collection(collectionName).find({}).batchSize(500);

  for await (const document of cursor) {
    documentCount += 1;
    let instance;
    try {
      instance = new model(document);
    } catch (error) {
      invalidDocuments += 1;
      if (error instanceof mongoose.Error.StrictModeError) {
        unknownFields += 1;
        const pathName = error.path || '<unknown>';
        issues.set(`unknown:${pathName}`, (issues.get(`unknown:${pathName}`) || 0) + 1);
      } else {
        issues.set(`construction:${error.name}`, (issues.get(`construction:${error.name}`) || 0) + 1);
      }
      continue;
    }

    const validationError = instance.validateSync();
    if (!validationError) continue;

    invalidDocuments += 1;
    for (const [pathName, error] of Object.entries(validationError.errors)) {
      if (error instanceof mongoose.Error.StrictModeError) unknownFields += 1;
      const issueKey = `${error.name}:${pathName}`;
      issues.set(issueKey, (issues.get(issueKey) || 0) + 1);
    }
  }

  return {
    collection: collectionName,
    model: model.modelName,
    documentCount,
    invalidDocuments,
    unknownFieldErrors: unknownFields,
    issues: Object.fromEntries([...issues.entries()].sort(([a], [b]) => a.localeCompare(b))),
  };
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('Set MONGODB_URI in backend/.env before running this read-only comparison.');
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB_NAME || 'Roamora',
    serverSelectionTimeoutMS: 10000,
  });

  try {
    const database = mongoose.connection.db;
    const actualCollections = await database.listCollections({}, { nameOnly: true }).toArray();
    const comparisons = [];

    for (const { name } of actualCollections) {
      const model = modelsByCollection.get(name);
      if (!model) {
        comparisons.push({ collection: name, model: null, documentCount: await database.collection(name).countDocuments(), status: 'no-model' });
        continue;
      }
      comparisons.push(await compareCollection(database, name, model));
    }

    const missingCollections = [...modelsByCollection.keys()].filter(
      (collectionName) => !actualCollections.some(({ name }) => name === collectionName),
    );

    console.log(JSON.stringify({
      database: mongoose.connection.name,
      collections: comparisons,
      missingCollections,
    }, null, 2));
    if (
      missingCollections.length > 0
      || comparisons.some((comparison) => (
        comparison.invalidDocuments > 0
        || (comparison.status === 'no-model' && comparison.documentCount > 0)
      ))
    ) {
      process.exitCode = 1;
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(`MongoDB model comparison failed: ${error.message}`);
  process.exitCode = 1;
});
