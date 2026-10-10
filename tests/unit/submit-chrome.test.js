// @vitest-environment node
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { test, expect, vi, afterEach } from 'vitest';

import { submitChrome } from '../../scripts/submit-chrome.mjs';

const env = {
  CHROME_CLIENT_ID: 'test-client', CHROME_CLIENT_SECRET: 'private-client-secret',
  CHROME_REFRESH_TOKEN: 'private-refresh-token', CHROME_PUBLISHER_ID: 'publisher-123',
  CHROME_EXTENSION_ID: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
};
const itemStatus = { name: 'publishers/publisher-123/items/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', itemId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' };
const tokenResponse = { access_token: 'private-access-token', token_type: 'Bearer' };
const temporaryDirectories = [];

afterEach(async () => {
  for (const path of temporaryDirectories.splice(0)) await rm(path, { recursive: true, force: true });
});

test('dry-run verifies OAuth and item ownership without changing a pending release', async () => {
  // Arrange
  const request = vi.fn().mockResolvedValueOnce(Response.json(tokenResponse))
    .mockResolvedValueOnce(Response.json({ ...itemStatus, submittedItemRevisionStatus: { state: 'PENDING_REVIEW' } }));
  const log = vi.fn();

  // Act
  await submitChrome({ env, dryRun: true, request, log });

  // Assert
  expect(request).toHaveBeenCalledTimes(2);
  expect(request.mock.calls[0][0]).toBe('https://oauth2.googleapis.com/token');
  expect(request.mock.calls[0][1].body.get('grant_type')).toBe('refresh_token');
  expect(request.mock.calls[1][0]).toBe('https://chromewebstore.googleapis.com/v2/publishers/publisher-123/items/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:fetchStatus');
  expect(request.mock.calls[1][1].method).toBeUndefined();
  expect(log).toHaveBeenCalledWith('Chrome Store API v2 authentication verified; submitted state: PENDING_REVIEW');
  expect(JSON.stringify(log.mock.calls)).not.toContain('private-access-token');
});

test('new releases use API v2 binary uploads and publish automatically after approval', async () => {
  // Arrange
  const directory = await mkdtemp(join(tmpdir(), 'clean-url-publish-test-'));
  temporaryDirectories.push(directory);
  const zipPath = join(directory, 'release.zip');
  await writeFile(zipPath, Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  const request = vi.fn().mockResolvedValueOnce(Response.json(tokenResponse))
    .mockResolvedValueOnce(Response.json(itemStatus))
    .mockResolvedValueOnce(Response.json({ uploadState: 'SUCCEEDED' }))
    .mockResolvedValueOnce(Response.json({ state: 'PENDING_REVIEW' }));

  // Act
  await submitChrome({ env, zipPath, request, log: vi.fn() });

  // Assert
  expect(request).toHaveBeenCalledTimes(4);
  expect(request.mock.calls[2][0]).toBe('https://chromewebstore.googleapis.com/upload/v2/publishers/publisher-123/items/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:upload');
  expect(request.mock.calls[2][1].method).toBe('POST');
  expect(request.mock.calls[2][1].headers['Content-Type']).toBe('application/zip');
  expect(request.mock.calls[2][1].body).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  expect(request.mock.calls[3][0]).toBe('https://chromewebstore.googleapis.com/v2/publishers/publisher-123/items/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:publish');
  expect(request.mock.calls[3][1].body).toBe('{"publishType":"DEFAULT_PUBLISH"}');
});

test('an expired token stops before upload and never exposes the Google error body', async () => {
  // Arrange
  const request = vi.fn().mockResolvedValue(Response.json({ error: 'invalid_grant', message: 'private-refresh-token' }, { status: 400 }));

  // Act / Assert
  await expect(submitChrome({ env, request })).rejects.toThrow('Authentication: HTTP 400');
  expect(request).toHaveBeenCalledTimes(1);
});

test('wrong publisher configuration cannot upload into another Store item', async () => {
  // Arrange
  const request = vi.fn().mockResolvedValueOnce(Response.json(tokenResponse))
    .mockResolvedValueOnce(Response.json({ ...itemStatus, itemId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }));

  // Act / Assert
  await expect(submitChrome({ env, request })).rejects.toThrow('Store access: response does not match the configured item');
  expect(request).toHaveBeenCalledTimes(2);
});

test('a release cannot replace a version that is already pending review', async () => {
  // Arrange
  const request = vi.fn().mockResolvedValueOnce(Response.json(tokenResponse))
    .mockResolvedValueOnce(Response.json({ ...itemStatus, submittedItemRevisionStatus: { state: 'PENDING_REVIEW' } }));

  // Act / Assert
  await expect(submitChrome({ env, request })).rejects.toThrow('An existing Chrome Store submission is still pending review');
  expect(request).toHaveBeenCalledTimes(2);
});

test('asynchronous processing finishes before the release is submitted', async () => {
  // Arrange
  const directory = await mkdtemp(join(tmpdir(), 'clean-url-publish-test-'));
  temporaryDirectories.push(directory);
  const zipPath = join(directory, 'release.zip');
  await writeFile(zipPath, Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  const wait = vi.fn();
  const request = vi.fn().mockResolvedValueOnce(Response.json(tokenResponse))
    .mockResolvedValueOnce(Response.json(itemStatus))
    .mockResolvedValueOnce(Response.json({ uploadState: 'IN_PROGRESS' }))
    .mockResolvedValueOnce(Response.json({ lastAsyncUploadState: 'SUCCEEDED' }))
    .mockResolvedValueOnce(Response.json({ state: 'PENDING_REVIEW' }));

  // Act
  await submitChrome({ env, zipPath, request, wait, log: vi.fn() });

  // Assert
  expect(wait).toHaveBeenCalledWith(5000);
  expect(request.mock.calls[3][0]).toBe('https://chromewebstore.googleapis.com/v2/publishers/publisher-123/items/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:fetchStatus');
  expect(request.mock.calls[4][0]).toBe('https://chromewebstore.googleapis.com/v2/publishers/publisher-123/items/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:publish');
});

test('failed upload processing never submits a broken package for review', async () => {
  // Arrange
  const directory = await mkdtemp(join(tmpdir(), 'clean-url-publish-test-'));
  temporaryDirectories.push(directory);
  const zipPath = join(directory, 'release.zip');
  await writeFile(zipPath, Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  const request = vi.fn().mockResolvedValueOnce(Response.json(tokenResponse))
    .mockResolvedValueOnce(Response.json(itemStatus))
    .mockResolvedValueOnce(Response.json({ uploadState: 'FAILED' }));

  // Act / Assert
  await expect(submitChrome({ env, zipPath, request })).rejects.toThrow('Package upload did not complete successfully');
  expect(request).toHaveBeenCalledTimes(3);
});

// Value: protects=invalid release configuration cannot contact Google;
// fails_when=missing secrets or invalid Store identifiers reach the transport;
// why_new=existing ownership test starts with valid configuration; seam=none
test('missing credentials and malformed Store identifiers stop before contacting Google', async () => {
  // Arrange
  const invalidConfigurations = [
    [{ ...env, CHROME_CLIENT_ID: '' }, 'Missing CHROME_CLIENT_ID'],
    [{ ...env, CHROME_CLIENT_SECRET: '  ' }, 'Missing CHROME_CLIENT_SECRET'],
    [{ ...env, CHROME_REFRESH_TOKEN: undefined }, 'Missing CHROME_REFRESH_TOKEN'],
    [{ ...env, CHROME_PUBLISHER_ID: '' }, 'Missing CHROME_PUBLISHER_ID'],
    [{ ...env, CHROME_EXTENSION_ID: '' }, 'Missing CHROME_EXTENSION_ID'],
    [{ ...env, CHROME_PUBLISHER_ID: 'publisher/other' }, 'Invalid Chrome Store publisher or extension ID'],
    [{ ...env, CHROME_EXTENSION_ID: 'not-an-extension-id' }, 'Invalid Chrome Store publisher or extension ID'],
  ];

  // Every invalid configuration must fail before sending any secret to Google.
  for (const [configuration, message] of invalidConfigurations) {
    const request = vi.fn();

    // Act / Assert
    await expect(submitChrome({ env: configuration, dryRun: true, request })).rejects.toThrow(message);
    expect(request).not.toHaveBeenCalled();
  }
});

// Value: protects=transport and malformed OAuth failures stop safely without exposing credentials;
// fails_when=raw transport errors escape or malformed responses proceed to Store access;
// why_new=existing expired-token test only covers an HTTP rejection; seam=none
test('network failures and invalid OAuth responses expose only controlled errors', async () => {
  // Arrange
  const failures = [
    [async () => { throw new Error('private-refresh-token'); }, 'Authentication: request failed or timed out'],
    [async () => new Response('private-client-secret'), 'Authentication: invalid JSON response'],
    [async () => Response.json({ token_type: 'Bearer' }), 'Authentication: missing bearer token'],
    [async () => Response.json({ access_token: 'private-access-token', token_type: 'Basic' }), 'Authentication: missing bearer token'],
  ];

  // All malformed authentication responses must prevent later release requests.
  for (const [transport, message] of failures) {
    const request = vi.fn(transport);

    // Act / Assert
    await expect(submitChrome({ env, dryRun: true, request })).rejects.toThrow(message);
    expect(request).toHaveBeenCalledTimes(1);
  }
});

// Value: protects=Actions masks newly issued tokens before Store access and sends OAuth credentials correctly;
// fails_when=mask escaping or the refresh-token grant wire contract changes;
// why_new=existing dry-run test checks only non-Actions logging and grant type; seam=none
test('Actions masks newly issued access tokens and uses the refresh-token OAuth contract', async () => {
  // Arrange
  const request = vi.fn().mockResolvedValueOnce(Response.json({ access_token: 'private%token\r\nnext', token_type: 'Bearer' }))
    .mockResolvedValueOnce(Response.json(itemStatus));
  const log = vi.fn();

  // Act
  await submitChrome({ env: { ...env, GITHUB_ACTIONS: 'true' }, dryRun: true, request, log });

  // Assert
  expect(Object.fromEntries(request.mock.calls[0][1].body.entries())).toEqual({
    client_id: 'test-client', client_secret: 'private-client-secret',
    refresh_token: 'private-refresh-token', grant_type: 'refresh_token',
  });
  expect(log.mock.calls[0]).toEqual(['::add-mask::private%25token%0D%0Anext']);
  expect(log.mock.invocationCallOrder[0]).toBeLessThan(request.mock.invocationCallOrder[1]);
  expect(request.mock.calls[1][1].headers.Authorization).toBe('Bearer private%token\r\nnext');
  expect(request.mock.calls[0][1].redirect).toBe('error');
});

// Value: protects=unfinished asynchronous uploads cannot hang forever or submit for review;
// fails_when=the polling bound disappears or publication proceeds while processing remains incomplete;
// why_new=existing async test covers only immediate processing success; seam=none
test('an upload still processing at the polling limit stops without submitting for review', async () => {
  // Arrange
  const directory = await mkdtemp(join(tmpdir(), 'clean-url-publish-test-'));
  temporaryDirectories.push(directory);
  const zipPath = join(directory, 'release.zip');
  await writeFile(zipPath, Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  const wait = vi.fn();
  const request = vi.fn().mockResolvedValueOnce(Response.json(tokenResponse))
    .mockResolvedValueOnce(Response.json(itemStatus))
    .mockResolvedValueOnce(Response.json({ uploadState: 'IN_PROGRESS' }))
    .mockImplementation(async () => Response.json({ lastAsyncUploadState: 'IN_PROGRESS' }));

  // Act / Assert
  await expect(submitChrome({ env, zipPath, request, wait, log: vi.fn() })).rejects.toThrow('Package upload did not complete successfully');
  expect(wait).toHaveBeenCalledTimes(60);
  expect(wait.mock.calls).toEqual(Array.from({ length: 60 }, () => [5000]));
  expect(request).toHaveBeenCalledTimes(63);
  expect(request.mock.calls.some(([url]) => url.endsWith(':publish'))).toBe(false);
});

// Value: protects=unaccepted Store review responses cannot be reported as successful releases;
// fails_when=any publish response is treated as acceptance;
// why_new=existing submission tests cover only PENDING_REVIEW; seam=none
test('a Store response that does not accept the review submission fails the release', async () => {
  // Arrange
  const directory = await mkdtemp(join(tmpdir(), 'clean-url-publish-test-'));
  temporaryDirectories.push(directory);
  const zipPath = join(directory, 'release.zip');
  await writeFile(zipPath, Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  const request = vi.fn().mockResolvedValueOnce(Response.json(tokenResponse))
    .mockResolvedValueOnce(Response.json(itemStatus))
    .mockResolvedValueOnce(Response.json({ uploadState: 'SUCCEEDED' }))
    .mockResolvedValueOnce(Response.json({ state: 'STAGED' }));
  const log = vi.fn();

  // Act / Assert
  await expect(submitChrome({ env, zipPath, request, log })).rejects.toThrow('Review submission was not accepted');
  expect(request).toHaveBeenCalledTimes(4);
  expect(log).not.toHaveBeenCalled();
});

// Value: protects=missing or malformed build artifacts never reach the upload or publish APIs;
// fails_when=ZIP preflight is bypassed and an absent or non-ZIP artifact is uploaded;
// why_new=existing release tests always provide ZIP bytes; seam=none
test('missing ZIP paths and non-ZIP build artifacts stop before package upload', async () => {
  // Arrange
  const directory = await mkdtemp(join(tmpdir(), 'clean-url-publish-test-'));
  temporaryDirectories.push(directory);
  const zipPath = join(directory, 'release.zip');
  await writeFile(zipPath, 'download failed');
  const invalidArtifacts = [
    [undefined, 'Missing Chrome ZIP path'],
    [join(directory, 'missing.zip'), 'ENOENT'],
    [zipPath, 'Invalid Chrome ZIP file'],
  ];

  // Artifact validation must reject both missing paths and invalid package bytes.
  for (const [artifactPath, message] of invalidArtifacts) {
    const request = vi.fn().mockResolvedValueOnce(Response.json(tokenResponse))
      .mockResolvedValueOnce(Response.json(itemStatus));

    // Act / Assert
    await expect(submitChrome({ env, zipPath: artifactPath, request, log: vi.fn() })).rejects.toThrow(message);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls.some(([url]) => url.endsWith(':upload') || url.endsWith(':publish'))).toBe(false);
  }
});
