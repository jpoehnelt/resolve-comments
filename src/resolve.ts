import * as core from "@actions/core";
import {
  type GraphQLClient,
  type ReviewThread,
  type Strategy,
  fetchReviewThreads,
  resolveThread,
} from "./graphql.js";

export function shouldResolve(
  thread: ReviewThread,
  headSha: string,
  strategy: Strategy
): boolean {
  if (thread.isResolved) return false;

  const isOutdated = thread.isOutdated;
  const isOlderSha =
    thread.originalCommitOid !== null &&
    thread.originalCommitOid !== headSha;

  switch (strategy) {
    case "outdated":
      return isOutdated;
    case "older_sha":
      return isOlderSha;
    case "any":
      return isOutdated || isOlderSha;
  }
}

export async function resolveOutdatedThreads(
  graphql: GraphQLClient,
  owner: string,
  repo: string,
  prNumber: number,
  headSha: string,
  strategy: Strategy
): Promise<number> {
  const threads = await fetchReviewThreads(graphql, owner, repo, prNumber);

  core.info(
    `Found ${threads.length} review thread(s) on PR #${prNumber}`
  );

  const toResolve = threads.filter((t) =>
    shouldResolve(t, headSha, strategy)
  );

  core.info(
    `Resolving ${toResolve.length} thread(s) using strategy "${strategy}"`
  );

  for (const thread of toResolve) {
    const reasons: string[] = [];
    if (thread.isOutdated) reasons.push("outdated");
    if (
      thread.originalCommitOid !== null &&
      thread.originalCommitOid !== headSha
    ) {
      reasons.push(`sha ${thread.originalCommitOid.slice(0, 7)} ≠ head`);
    }

    core.info(`  Resolving thread ${thread.id} (${reasons.join(", ")})`);
    await resolveThread(graphql, thread.id);
  }

  return toResolve.length;
}
