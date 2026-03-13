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
export type GraphQLClient = <T>(query: string, variables: Record<string, unknown>) => Promise<T>;
export declare function fetchReviewThreads(graphql: GraphQLClient, owner: string, repo: string, prNumber: number): Promise<ReviewThread[]>;
export declare function resolveThread(graphql: GraphQLClient, threadId: string): Promise<void>;
