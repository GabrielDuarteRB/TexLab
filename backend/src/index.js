import express from 'express';
import cors from 'cors';
import config from './config/index.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api', routes);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Backend running on http://localhost:${config.port}`);
});
