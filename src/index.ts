import * as core from "@actions/core";
import * as github from "@actions/github";
import type { Strategy } from "./graphql.js";
import { resolveOutdatedThreads } from "./resolve.js";

async function run(): Promise<void> {
  try {
    const token = core.getInput("token", { required: true });
    const strategy = core.getInput("strategy") as Strategy;

    if (!["outdated", "older_sha", "any"].includes(strategy)) {
      core.setFailed(
        `Invalid strategy "${strategy}". Must be one of: outdated, older_sha, any`
      );
      return;
    }

    const context = github.context;

    if (!context.payload.pull_request) {
      core.setFailed("This action can only run on pull_request events");
      return;
    }

    const owner = context.repo.owner;
    const repo = context.repo.repo;
    const prNumber = context.payload.pull_request.number;
    const headSha = context.payload.pull_request.head.sha;

    core.info(`PR #${prNumber} — head SHA: ${headSha}`);
    core.info(`Strategy: ${strategy}`);

    const octokit = github.getOctokit(token);
    const resolved = await resolveOutdatedThreads(
      octokit.graphql.bind(octokit),
      owner,
      repo,
      prNumber,
      headSha,
      strategy
    );

    core.setOutput("resolved_count", resolved);
    core.info(`Done — resolved ${resolved} thread(s)`);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("An unexpected error occurred");
    }
  }
}

run();
