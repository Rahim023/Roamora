import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDirectory, '..', '.env') });

function getValueType(value) {
  if (value === null) return 'null';
  if (value instanceof Date) return 'date';
  if (value instanceof mongoose.Types.ObjectId) return 'objectId';
  if (Buffer.isBuffer(value)) return 'binary';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer-or-whole-number' : 'number';
  if (typeof value === 'object') {
    if (value._bsontype) return value._bsontype;
    return 'object';
  }
  return typeof value;
}

function addFieldShape(fields, fieldPath, value) {
  const type = getValueType(value);
  let shape = fields.get(fieldPath);

  if (!shape) {
    shape = { types: new Map(), observations: 0 };
    fields.set(fieldPath, shape);
  }
  shape.types.set(type, (shape.types.get(type) ?? 0) + 1);
  shape.observations += 1;

  if (type === 'object') {
    for (const [key, nestedValue] of Object.entries(value)) {
      addFieldShape(fields, `${fieldPath}.${key}`, nestedValue);
    }
  } else if (type === 'array') {
    for (const item of value) {
      addFieldShape(fields, `${fieldPath}[]`, item);
    }
  }
}

async function inspectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Set MONGODB_URI in backend/.env before running this read-only inspection.');
  }

  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB_NAME || 'Roamora',
    serverSelectionTimeoutMS: 10000,
  });

  try {
    const database = mongoose.connection.db;
    const collections = await database.listCollections({}, { nameOnly: true }).toArray();
    const report = [];

    for (const { name } of collections) {
      const fields = new Map();
      let documentCount = 0;
      const cursor = database.collection(name).find({}).batchSize(500);

      for await (const document of cursor) {
        documentCount += 1;
        for (const [key, value] of Object.entries(document)) {
          addFieldShape(fields, key, value);
        }
      }

      report.push({
        collection: name,
        documentCount,
        fields: Object.fromEntries(
          [...fields.entries()]
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([fieldPath, shape]) => [
              fieldPath,
              {
                observations: shape.observations,
                types: Object.fromEntries([...shape.types.entries()].sort(([a], [b]) => a.localeCompare(b))),
              },
            ]),
        ),
      });
    }

    console.log(JSON.stringify({ database: mongoose.connection.name, collections: report }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

inspectDatabase().catch((error) => {
  console.error(`MongoDB schema inspection failed: ${error.message}`);
  process.exitCode = 1;
});
