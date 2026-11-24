import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`🚀 TorqueLab Ops API escuchando en http://localhost:${env.PORT}`);
});
