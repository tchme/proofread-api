'use strict';
// Publish the version in manifest.json to GitHub: node scripts/release.js [--dry]   (docs/development.md "Release")
// Uses git's saved GitHub login for OWNER (Git Credential Manager); never prompts and never prints the token.
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');

const OWNER = 'tchme', REPO = 'proofread-api';
const ROOT = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry');
const ENV = { ...process.env, GCM_INTERACTIVE: 'never' };
const fail = msg => { console.error('release: ' + msg); process.exit(1); };
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', env: ENV }).trim();

function token() {
  const r = spawnSync('git', ['credential', 'fill'], { input: `protocol=https\nhost=github.com\nusername=${OWNER}\n\n`, encoding: 'utf8', env: ENV });
  const t = ((r.stdout || '').match(/^password=(.+)$/m) || [])[1];
  if (!t) fail(`git has no saved GitHub login for ${OWNER}`);
  return t;
}

async function api(tok, method, url, body, type = 'application/json') {
  const r = await fetch(url.startsWith('http') ? url : 'https://api.github.com' + url, {
    method,
    headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'User-Agent': 'proofread-api-release', 'Content-Type': type },
    body: body === undefined ? undefined : type === 'application/json' ? JSON.stringify(body) : body,
  });
  const json = await r.json().catch(() => ({}));
  return { status: r.status, json };
}

(async () => {
  const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8')).version, tag = 'v' + version;
  if (git('status', '--porcelain')) fail('uncommitted changes');
  if (git('rev-parse', '--abbrev-ref', 'HEAD') !== 'main') fail('release from main only');
  if (git('tag', '-l', tag)) fail(`${tag} exists: bump the version in manifest.json`);
  if (spawnSync(process.execPath, ['--test'], { cwd: ROOT, stdio: 'inherit' }).status !== 0) fail('unit tests failed');

  const prev = git('tag', '-l', 'v*', '--sort=-v:refname').split('\n')[0];
  const notes = git('log', '--format=- %s', prev ? `${prev}..HEAD` : 'HEAD');
  const zip = path.join(os.tmpdir(), `${REPO}-${version}.zip`);
  // one folder with a fixed name inside: the path defines the extension's identity, so every update unpacks into the same folder
  git('archive', '--format=zip', `--prefix=${REPO}/`, '-o', zip, 'HEAD', '--', '.', ':!docs', ':!scripts', ':!test', ':!CLAUDE.md');
  console.log(`${tag}: ${fs.statSync(zip).size} bytes zip, notes:\n${notes}`);
  if (DRY) return console.log('dry run: nothing pushed');

  const tok = token();
  const repo = await api(tok, 'GET', `/repos/${OWNER}/${REPO}`);
  if (repo.status === 404) {
    const made = await api(tok, 'POST', '/user/repos', { name: REPO, private: true, description: 'Fix, rephrase, restyle and translate selected text in Chromium browsers through an OpenAI-compatible API' });
    if (made.status !== 201) fail(`creating the repo: ${made.status} ${made.json.message}`);
    console.log('created private repo ' + made.json.html_url);
  } else if (repo.status !== 200) fail(`reading the repo: ${repo.status} ${repo.json.message}`);

  const remote = `https://${OWNER}@github.com/${OWNER}/${REPO}.git`;
  if (!git('remote').split('\n').includes('origin')) git('remote', 'add', 'origin', remote);
  git('tag', tag);
  try { git('push', 'origin', 'main', tag); } catch (e) { git('tag', '-d', tag); fail('push: ' + e.message); } // a rerun must not trip on the tag

  const rel = await api(tok, 'POST', `/repos/${OWNER}/${REPO}/releases`, { tag_name: tag, name: `Proofread API ${version}`, body: notes + '\n\nУстановка и обновление: README.md.' });
  if (rel.status !== 201) fail(`creating the release: ${rel.status} ${rel.json.message}`);
  const up = await api(tok, 'POST', rel.json.upload_url.replace(/\{.*\}$/, '') + '?name=' + encodeURIComponent(path.basename(zip)), fs.readFileSync(zip), 'application/zip');
  if (up.status !== 201) fail(`uploading the zip: ${up.status} ${up.json.message}`);
  console.log('released ' + rel.json.html_url);
})().catch(e => fail(e.message));
