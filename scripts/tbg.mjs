#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

import { publishObsidianNoteTitle } from '../lib/tbg.js';

const projectRoot = process.cwd();
const postsDir = path.join(projectRoot, 'content', 'posts');
const vaultPath = process.env.OBSIDIAN_VAULT_PATH || '/home/ptec07/obsidian/MyVault';
const noteTitle = process.argv.slice(2).join(' ').trim();

if (!noteTitle) {
  console.error('사용법: !tbg 옵시디언 글제목');
  process.exit(1);
}

try {
  const published = await publishObsidianNoteTitle({
    noteTitle,
    vaultPath,
    postsDir,
  });

  console.log(`markdown-to-clean-html 방식으로 변환: ${published.notePath}`);
  console.log(`블로그 글 생성: ${published.destinationPath}`);
  console.log(`slug: ${published.slug}`);

  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn('npx', ['vercel', 'deploy', '--prod', '--yes', '--logs'], {
      cwd: projectRoot,
      stdio: 'inherit',
      env: process.env,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(new Error(`Vercel deploy failed with exit code ${code}`));
    });
    child.on('error', rejectPromise);
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
