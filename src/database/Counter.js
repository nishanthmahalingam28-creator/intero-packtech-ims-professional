import './plugins.js';
import mongoose from 'mongoose';

// Supporting collection that hands out human-friendly sequential codes: PRD-0001, SR-000001 ...
// $inc is atomic, so two requests created at the same time never receive the same number.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "PRD" or "SR"
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

export async function nextCode(prefix, pad) {
  const counter = await Counter.findOneAndUpdate({ _id: prefix }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return `${prefix}-${String(counter.seq).padStart(pad, '0')}`;
}

export default Counter;
