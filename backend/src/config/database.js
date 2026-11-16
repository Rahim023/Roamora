import mongoose from 'mongoose';

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI must be configured in backend/.env.');
  }

  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB_NAME || 'Roamora',
    serverSelectionTimeoutMS: 10000,
  });

  return mongoose.connection;
}
