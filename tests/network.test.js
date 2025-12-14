import { describe, it, expect, vi, afterEach } from 'vitest';

import * as utils from '../docs/utils.js';
import { NO_TOKEN_DELAY_MS } from '../docs/config.js';
import { fetchSearch, rateLimit, markFetched } from '../docs/network.js';

const realFetch = global.fetch;
const realNow = Date.now;

afterEach(() => {
  global.fetch = realFetch;
  Date.now = realNow;
  vi.restoreAllMocks();
});

describe('rateLimit', () => {
  it('skips waiting when token provided', async () => {
    const spy = vi.spyOn(utils, 'sleep');
    await rateLimit('token');
    expect(spy).not.toHaveBeenCalled();
  });

  it('waits when no token', async () => {
    const spy = vi.spyOn(utils, 'sleep').mockResolvedValue();
    Date.now = vi.fn().mockReturnValue(5000);
    await rateLimit('');
    expect(spy).toHaveBeenCalledWith(expect.any(Number));
  });

  it('marks fetched updates timer', async () => {
    Date.now = vi.fn().mockReturnValue(1000);
    markFetched();
    Date.now = vi.fn().mockReturnValue(1500);
    const spy = vi.spyOn(utils, 'sleep').mockResolvedValue();
    await rateLimit('');
    expect(spy).toHaveBeenCalled();
  });

  it('skips sleep when elapsed time exceeds window', async () => {
    const spy = vi.spyOn(utils, 'sleep');
    Date.now = vi.fn().mockReturnValue(0);
    markFetched(); // sets lastFetchAt to 0
    Date.now = vi.fn().mockReturnValue(NO_TOKEN_DELAY_MS + 5000);
    await rateLimit('');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('fetchSearch', () => {
  it('sets auth header for gh tokens and bearer tokens', async () => {
    const mockJson = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: mockJson });
    await fetchSearch('q', 'gh123');
    expect(global.fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'token gh123' }) }));
    await fetchSearch('q', 'pat_456');
    expect(global.fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer pat_456' }) }));
  });

  it('returns parsed JSON on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true })
    });
    const res = await fetchSearch('q');
    expect(res).toEqual({ ok: true });
  });

  it('throws a wrapped error on non-OK response with message', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: () => Promise.resolve({ message: 'forbidden' })
    });
    await expect(fetchSearch('q')).rejects.toThrow('GitHub search failed: 403 forbidden');
  });

  it('prefers nested errors[0].message', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: () => Promise.resolve({ errors: [{ message: 'nested message' }] })
    });
    await expect(fetchSearch('q')).rejects.toThrow('GitHub search failed: 400 nested message');
  });

  it('falls back to documentation_url', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({ documentation_url: 'https://docs' })
    });
    await expect(fetchSearch('q')).rejects.toThrow('GitHub search failed: 401 https://docs');
  });

  it('falls back to string body for error text', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server',
      json: () => Promise.resolve('plain')
    });
    await expect(fetchSearch('q')).rejects.toThrow('GitHub search failed: 500 plain');
  });

  it('prefers nested errors[0].message', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: () => Promise.resolve({ errors: [{ message: 'nested message' }] })
    });
    await expect(fetchSearch('q')).rejects.toThrow('GitHub search failed: 400 nested message');
  });

  it('falls back to documentation_url', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({ documentation_url: 'https://docs' })
    });
    await expect(fetchSearch('q')).rejects.toThrow('GitHub search failed: 401 https://docs');
  });

  it('falls back to statusText when body has no message', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: () => Promise.resolve({})
    });
    await expect(fetchSearch('q')).rejects.toThrow('GitHub search failed: 502 Bad Gateway');
  });

  it('standardizes abort errors', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    global.fetch = vi.fn().mockRejectedValue(abortError);
    await expect(fetchSearch('q', '', { signal: new AbortController().signal })).rejects.toThrow(
      'Request aborted'
    );
  });

  it('handles json parse failures gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server',
      json: () => Promise.reject(new Error('bad json'))
    });
    await expect(fetchSearch('q')).rejects.toThrow('GitHub search failed: 500 Server');
  });
});
