import '../../../packages/common/server/env.mjs';
import { runMediaJob } from './media-jobs.mjs';

let stopping = false;
process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });
while (!stopping) {
  try {
    const result = await runMediaJob();
    if (!result.claimed) await new Promise((resolve) => setTimeout(resolve, 1500));
  } catch {
    process.stderr.write('Media processing is temporarily unavailable. Retrying shortly.\n');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
