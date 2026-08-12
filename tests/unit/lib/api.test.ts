import { describe, expect, it } from 'vitest';

import { apiError, apiOk } from '@/lib/api';

describe('apiOk', () => {
  it('defaults to 200 and echoes the payload', async () => {
    const response = apiOk({ code: 'abc-defg-hjk' });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ code: 'abc-defg-hjk' });
  });

  it('honours an explicit status', () => {
    expect(apiOk({ code: 'abc-defg-hjk' }, 201).status).toBe(201);
  });
});

describe('apiError', () => {
  it('shapes the body as { error: { code, message } }', async () => {
    const response = apiError('meeting_ended', 'This meeting has ended.', 410);

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error: { code: 'meeting_ended', message: 'This meeting has ended.' },
    });
  });
});
