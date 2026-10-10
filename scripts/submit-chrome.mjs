import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

/**
 * Calls Google APIs without exposing response bodies or credentials in failures.
 * Used by {@link submitChrome} for authentication and Store requests.
 * @throws When Google rejects the request or returns invalid JSON.
 * @example
 * await requestGoogle(fetch, 'https://oauth2.googleapis.com/token', options, 'Authentication');
 */
async function requestGoogle(request, url, options, stage) {
  let response;
  try {
    response = await request(url, { ...options, signal: AbortSignal.timeout(30_000), redirect: 'error' });
  } catch {
    throw new Error(`${stage}: request failed or timed out`);
  }
  // Error bodies can contain submitted credentials; report only the HTTP status.
  if (!response.ok) throw new Error(`${stage}: HTTP ${response.status}`);
  try {
    return await response.json();
  } catch {
    throw new Error(`${stage}: invalid JSON response`);
  }
}

/**
 * Verifies Chrome Store access or uploads and submits a new release using API v2.
 * Called by the Release workflow; dry runs only authenticate and read item status.
 * @param options - Credentials from Actions secrets and injectable test transports.
 * @returns The verified item status or accepted submission response.
 * @throws When credentials, Store ownership, upload processing, or submission fail.
 * @example
 * await submitChrome({ env: process.env, dryRun: true });
 */
export async function submitChrome({ env, dryRun = false, zipPath, request = fetch, wait = delay, log = console.log }) {
  const required = ['CHROME_CLIENT_ID', 'CHROME_CLIENT_SECRET', 'CHROME_REFRESH_TOKEN', 'CHROME_PUBLISHER_ID', 'CHROME_EXTENSION_ID'];
  // Reject missing configuration before any request or package upload.
  for (const name of required) {
    if (!env[name]?.trim()) throw new Error(`Missing ${name}`);
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(env.CHROME_PUBLISHER_ID) || !/^[a-p]{32}$/.test(env.CHROME_EXTENSION_ID)) {
    throw new Error('Invalid Chrome Store publisher or extension ID');
  }
  const item = `publishers/${env.CHROME_PUBLISHER_ID}/items/${env.CHROME_EXTENSION_ID}`;
  const endpoint = `https://chromewebstore.googleapis.com/v2/${item}`;
  const token = await requestGoogle(request, 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ client_id: env.CHROME_CLIENT_ID, client_secret: env.CHROME_CLIENT_SECRET, refresh_token: env.CHROME_REFRESH_TOKEN, grant_type: 'refresh_token' }),
  }, 'Authentication');
  if (typeof token.access_token !== 'string' || !token.access_token || token.token_type !== 'Bearer') {
    throw new Error('Authentication: missing bearer token');
  }
  // Mask newly issued access tokens before later Actions commands can log them.
  if (env.GITHUB_ACTIONS === 'true') log(`::add-mask::${token.access_token.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')}`);
  const headers = { Authorization: `Bearer ${token.access_token}` };
  const status = await requestGoogle(request, `${endpoint}:fetchStatus`, { headers }, 'Store access');
  if (status.name !== item || status.itemId !== env.CHROME_EXTENSION_ID) {
    throw new Error('Store access: response does not match the configured item');
  }
  // Read-only verification also succeeds while an existing version is under review.
  if (dryRun) {
    log(`Chrome Store API v2 authentication verified; submitted state: ${status.submittedItemRevisionStatus?.state ?? 'none'}`);
    return status;
  }
  // Preserve the submitted revision until Google finishes reviewing it.
  if (status.submittedItemRevisionStatus?.state === 'PENDING_REVIEW') {
    throw new Error('An existing Chrome Store submission is still pending review');
  }
  if (!zipPath) throw new Error('Missing Chrome ZIP path');
  const zip = await readFile(zipPath);
  if (zip[0] !== 0x50 || zip[1] !== 0x4b) throw new Error('Invalid Chrome ZIP file');
  const upload = await requestGoogle(request, `https://chromewebstore.googleapis.com/upload/v2/${item}:upload`, {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/zip' }, body: zip,
  }, 'Package upload');
  let uploadState = upload.uploadState;
  // Poll only an in-progress upload, with a bounded wait; never publish after failure.
  for (let attempt = 0; uploadState === 'IN_PROGRESS' && attempt < 60; attempt += 1) {
    await wait(5000);
    const progress = await requestGoogle(request, `${endpoint}:fetchStatus`, { headers }, 'Upload status');
    uploadState = progress.lastAsyncUploadState;
  }
  if (uploadState !== 'SUCCEEDED') throw new Error('Package upload did not complete successfully');
  const submission = await requestGoogle(request, `${endpoint}:publish`, {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ publishType: 'DEFAULT_PUBLISH' }),
  }, 'Review submission');
  if (!['PENDING_REVIEW', 'PUBLISHED', 'PUBLISHED_TO_TESTERS'].includes(submission.state)) {
    throw new Error('Review submission was not accepted');
  }
  log(`Chrome Store submission accepted: ${submission.state}. Approval and public availability are separate.`);
  return submission;
}

// Run only when invoked by the workflow CLI, so importing tests never publishes.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2);
    const zipIndex = args.indexOf('--zip');
    await submitChrome({ env: process.env, dryRun: process.env.DRY_RUN === 'true', zipPath: zipIndex < 0 ? undefined : args[zipIndex + 1] });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
