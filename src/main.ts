import fs from 'fs';

import * as core from '@actions/core';
import {exec} from '@actions/exec';
import * as github from '@actions/github';

async function run(): Promise<void> {
  try {
    const {owner, repo} = github.context.repo;
    const token = core.getInput('github-token');
    const message = core.getInput('message');
    const ref = process.env.GITHUB_HEAD_REF;

    if (!token) {
      core.setFailed('GitHub token not found');
      return;
    }

    const octokit = github.getOctokit(token); // might fail with an auth error?

    let gitOutput = '';
    let gitError = '';

    await exec('git', ['ls-files', '-m'], {
      silent: true,
      listeners: {
        stdout: (data: Buffer) => {
          gitOutput += data.toString();
        },
        stderr: (data: Buffer) => {
          gitError += data.toString();
        },
      },
    });

    if (!gitOutput || gitError) {
      if (!gitOutput)
        {core.setFailed('git stdout: ∅');}
      if (gitError)
        {core.setFailed(`git stderr: ${gitError}`);}
      return;
    }

    const files = gitOutput.split('\n');

    for (const path of files) {
      try {
        const {data: ghFileContent} = await octokit.repos.getContent({
          owner,
          repo,
          path,
          ref,
        });

        if (!ghFileContent || Array.isArray(ghFileContent)) {
          return;
        }

        const fileContent = fs.readFileSync(path);

        // Commit eslint fixes
        octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path,
          message,
          sha: ghFileContent.sha,
          content: Buffer.from(fileContent).toString('base64'),
          branch: ref,
        });
      } catch (error) {
        core.error(error);
        core.setFailed(error);
      }
    }
  } catch (error) {
    core.debug(error.stack);
    core.setFailed(error.message);
  }
}

run();
