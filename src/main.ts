import fs from 'fs';

import * as core from '@actions/core';
import {exec} from '@actions/exec';
import * as github from '@actions/github';

async function run(): Promise<void> {
  try {
    const {owner, repo} = github.context.repo;
    const token = core.getInput('github-token');
    const message = core.getInput('message') || 'Default commit message';
    const failOnEmpty = (core.getInput('fail-on-empty') || 'false') === 'true';
    const branchName = process.env.GITHUB_HEAD_REF || 'master';

    if (!token) {
      core.setFailed('GitHub token not found');
      return;
    }

    const octokit = github.getOctokit(token); // might fail with an auth error?


    // Find updated file contents using the `git` cli.
    // ===============================================

    let gitOutput = '';
    let gitError = '';

    await exec('git', ['ls-files', '-om', '--exclude-standard'], {
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

    core.debug('🐭🐭🐭🐭🐭 gitOutput vvv');
    core.debug(gitOutput);
    core.debug('🐱🐱🐱🐱🐱 ^^^ gitOutput');

    if ((failOnEmpty && !gitOutput) || gitError) {
      // This is a little convoluted, but if both conditions are true, we want
      // to find out about both. If either are true, we want to bail early.
      // NB: I haven't actually tested calling setFailed more than once. 🐭
      if (!gitOutput)
        {core.setFailed('git stdout: ∅');}
      if (gitError)
        {core.setFailed(`git stderr: ${gitError}`);}
      return;
    }

    if (!gitOutput) {
      // This is a happy path early exit (failOnError is false).
      return;
    }

    const files = gitOutput.split('\n');
    const newContents = [];
    for (const path of files) {
      if (!path.trim())
        {continue}
      const fileContent = fs.readFileSync(path);
      newContents.push({
        path,
        mode: '100644' as const,
        type: 'blob' as const,
        content: Buffer.from(fileContent).toString(),
      })
    }


    // Do a dance with the API.
    // ========================
    // Docs at docs.github.com/en/rest/git/trees but tbh I just asked ChatGPT
    // and then made it as terse as I could. :shrug:

    const g = octokit.rest.git;
    const ref = `heads/${branchName}`;  // slight discrepancy w/ updateRef docs here
    const {data: {object: {sha: commit_sha}}} = await g.getRef({owner, repo, ref});
    const {data: {tree: {sha: base_tree}}} = await g.getCommit({owner, repo, commit_sha});
    const {data: {sha: tree}} = await g.createTree({owner, repo, base_tree, tree: newContents,});
    const {data: {sha}} = await g.createCommit({owner, repo, message, tree, parents: [commit_sha]});
    await g.updateRef({owner, repo, ref, sha,});

  } catch (error: unknown) {
    if (error instanceof Error) {
      core.error(error.stack || '');
      core.setFailed(error.message);
    } else {
      console.log(error);
      core.setFailed('catastrophe');
    }
  }
}

run();
