import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api', (_req, res) => {
  res.json({ name: 'expense-tracker-api', version: '0.1.0' });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
