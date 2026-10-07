import mongoose from 'mongoose';
import { env } from '../config/env.js';


export async function connectDb(uri = env.mongoUri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });

  // Multi-document transactions (used when approving a sale) need a replica set.
  // MongoDB Atlas always is one. A plain local "mongod" is not, so we warn loudly.
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid') {
    console.warn(
      '\n[WARNING] This MongoDB server is NOT a replica set, so transactions will fail.\n' +
        '          Use MongoDB Atlas (recommended) or start local MongoDB as a replica set.\n'
    );
  }
  console.log(`MongoDB connected (${mongoose.connection.name})`);
}

export const disconnectDb = () => mongoose.disconnect();
