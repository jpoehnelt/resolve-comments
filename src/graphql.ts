export type Strategy = "outdated" | "older_sha" | "any";

export interface ReviewThread {
  id: string;
  isOutdated: boolean;
  isResolved: boolean;
  originalCommitOid: string | null;
}

export interface ReviewThreadsResponse {
  repository: {
    pullRequest: {
      reviewThreads: {
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
        nodes: Array<{
          id: string;
          isOutdated: boolean;
          isResolved: boolean;
          comments: {
            nodes: Array<{
              originalCommit: {
                oid: string;
              } | null;
            }>;
          };
        }>;
      };
    };
  };
}

const REVIEW_THREADS_QUERY = `
  query($owner: String!, $repo: String!, $prNumber: Int!, $cursor: String) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $prNumber) {
        reviewThreads(first: 100, after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            isOutdated
            isResolved
            comments(first: 1) {
              nodes {
                originalCommit {
                  oid
                }
              }
            }
          }
        }
      }
    }
  }
`;

const RESOLVE_THREAD_MUTATION = `
  mutation($threadId: ID!) {
    resolveReviewThread(input: { threadId: $threadId }) {
      thread {
        id
        isResolved
      }
    }
  }
`;

export type GraphQLClient = <T>(query: string, variables: Record<string, unknown>) => Promise<T>;

export async function fetchReviewThreads(
  graphql: GraphQLClient,
  owner: string,
  repo: string,
  prNumber: number
): Promise<ReviewThread[]> {
  const threads: ReviewThread[] = [];
  let cursor: string | null = null;

  do {
    const response: ReviewThreadsResponse = await graphql<ReviewThreadsResponse>(REVIEW_THREADS_QUERY, {
      owner,
      repo,
      prNumber,
      cursor,
    });

    const connection: ReviewThreadsResponse["repository"]["pullRequest"]["reviewThreads"] = response.repository.pullRequest.reviewThreads;

    for (const node of connection.nodes) {
      const firstComment = node.comments.nodes[0];
      threads.push({
        id: node.id,
        isOutdated: node.isOutdated,
        isResolved: node.isResolved,
        originalCommitOid: firstComment?.originalCommit?.oid ?? null,
      });
    }

    cursor = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
  } while (cursor);

  return threads;
}

export async function resolveThread(
  graphql: GraphQLClient,
  threadId: string
): Promise<void> {
  await graphql(RESOLVE_THREAD_MUTATION, { threadId });
}
