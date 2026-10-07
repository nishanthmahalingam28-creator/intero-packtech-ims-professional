import mongoose from 'mongoose';
import { AppError } from './AppError.js';

// Runs `work(session)` as ONE all-or-nothing MongoDB transaction.
//  - If `work` finishes, every write inside it is saved together.
//  - If `work` throws, every write inside it is undone.
// Mongo automatically retries the whole function when two transactions collide (a "write conflict"),
// which is exactly what happens when two managers press Approve on the same request at the same moment.
export async function runInTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (err) {
    if (err?.codeName === 'IllegalOperation' || /replica set member or mongos/i.test(err?.message || '')) {
      console.error('Transactions are not supported by this MongoDB server. Use Atlas or a replica set.');
      throw new AppError('The database does not support transactions. Please contact the administrator.', 500);
    }
    throw err;
  } finally {
    await session.endSession();
  }
}
