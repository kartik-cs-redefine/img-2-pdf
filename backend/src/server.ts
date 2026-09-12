import { createApp, serverPort } from './config/app.js';

const app = createApp();

app.listen(serverPort, () => {
  console.info(`API server listening on port ${serverPort}`);
});
