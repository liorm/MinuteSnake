import { unstable_dev } from 'wrangler';
import type { Unstable_DevWorker } from 'wrangler';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';

describe('MyDurableObject', () => {
  let worker: Unstable_DevWorker;

  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('should return a greeting from sayHello', async () => {
    const url = new URL('http://example.com');
    url.searchParams.set('name', 'TestUser');

    const response = await worker.fetch(url.toString());
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toBe('Hello, TestUser!');
  });
});
