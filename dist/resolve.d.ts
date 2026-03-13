import { type GraphQLClient, type ReviewThread, type Strategy } from "./graphql.js";
export declare function shouldResolve(thread: ReviewThread, headSha: string, strategy: Strategy): boolean;
export declare function resolveOutdatedThreads(graphql: GraphQLClient, owner: string, repo: string, prNumber: number, headSha: string, strategy: Strategy): Promise<number>;
