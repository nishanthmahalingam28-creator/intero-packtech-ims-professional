import mongoose from 'mongoose';

// One global rule for every model: send "id" (string) instead of "_id", and never send "__v" or password hashes.
// This keeps the JSON the React app receives simple and identical for every collection.
// Every model file imports this file FIRST, so the rule is registered before any model is compiled.
mongoose.plugin((schema) => {
  schema.set('toJSON', {
    transform(_doc, ret) {
      ret.id = String(ret._id);
      delete ret._id;
      delete ret.__v;
      delete ret.passwordHash;
      return ret;
    },
  });
});

mongoose.set('strictQuery', true);
