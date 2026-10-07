import { env } from './config/env.js';
import { connectDb } from './database/connection.js';
import { createApp } from './app/serverApp.js';

await connectDb();
const app = createApp();
app.listen(env.port, () => console.log(`API listening on port ${env.port}`));
