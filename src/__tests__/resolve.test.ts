import { describe, it, expect, vi } from "vitest";
import { shouldResolve } from "../resolve.js";
import { fetchReviewThreads, type ReviewThread, type ReviewThreadsResponse } from "../graphql.js";

// Mock @actions/core to avoid side effects in tests
vi.mock("@actions/core", () => ({
  info: vi.fn(),
  setFailed: vi.fn(),
  getInput: vi.fn(),
  setOutput: vi.fn(),
}));

const HEAD_SHA = "abc1234567890def";
const OLD_SHA = "old5678901234567";

function thread(overrides: Partial<ReviewThread> = {}): ReviewThread {
  return {
    id: `thread-${Math.random().toString(36).slice(2, 8)}`,
    isOutdated: false,
    isResolved: false,
    originalCommitOid: HEAD_SHA,
    ...overrides,
  };
}

describe("shouldResolve", () => {
  describe('strategy: "outdated"', () => {
    it("resolves outdated threads", () => {
      expect(shouldResolve(thread({ isOutdated: true }), HEAD_SHA, "outdated")).toBe(true);
    });

    it("skips non-outdated threads even from older SHA", () => {
      expect(
        shouldResolve(thread({ originalCommitOid: OLD_SHA }), HEAD_SHA, "outdated")
      ).toBe(false);
    });

    it("skips already resolved threads", () => {
      expect(
        shouldResolve(thread({ isOutdated: true, isResolved: true }), HEAD_SHA, "outdated")
      ).toBe(false);
    });
  });

  describe('strategy: "older_sha"', () => {
    it("resolves threads from older SHA", () => {
      expect(
        shouldResolve(thread({ originalCommitOid: OLD_SHA }), HEAD_SHA, "older_sha")
      ).toBe(true);
    });

    it("skips threads from head SHA even if outdated", () => {
      expect(
        shouldResolve(thread({ isOutdated: true, originalCommitOid: HEAD_SHA }), HEAD_SHA, "older_sha")
      ).toBe(false);
    });

    it("skips already resolved threads", () => {
      expect(
        shouldResolve(
          thread({ originalCommitOid: OLD_SHA, isResolved: true }),
          HEAD_SHA,
          "older_sha"
        )
      ).toBe(false);
    });

    it("skips threads with null originalCommitOid", () => {
      expect(
        shouldResolve(thread({ originalCommitOid: null }), HEAD_SHA, "older_sha")
      ).toBe(false);
    });
  });

  describe('strategy: "any"', () => {
    it("resolves outdated threads", () => {
      expect(shouldResolve(thread({ isOutdated: true }), HEAD_SHA, "any")).toBe(true);
    });

    it("resolves threads from older SHA", () => {
      expect(
        shouldResolve(thread({ originalCommitOid: OLD_SHA }), HEAD_SHA, "any")
      ).toBe(true);
    });

    it("resolves threads that are both outdated and older SHA", () => {
      expect(
        shouldResolve(
          thread({ isOutdated: true, originalCommitOid: OLD_SHA }),
          HEAD_SHA,
          "any"
        )
      ).toBe(true);
    });

    it("skips current, non-outdated threads", () => {
      expect(shouldResolve(thread(), HEAD_SHA, "any")).toBe(false);
    });

    it("skips already resolved threads", () => {
      expect(
        shouldResolve(
          thread({ isOutdated: true, isResolved: true }),
          HEAD_SHA,
          "any"
        )
      ).toBe(false);
    });
  });
});

describe("fetchReviewThreads", () => {
  it("paginates through all threads", async () => {
    const mockGraphql = vi.fn();

    // Page 1
    mockGraphql.mockResolvedValueOnce({
      repository: {
        pullRequest: {
          reviewThreads: {
            pageInfo: { hasNextPage: true, endCursor: "cursor1" },
            nodes: [
              {
                id: "t1",
                isOutdated: true,
                isResolved: false,
                comments: { nodes: [{ originalCommit: { oid: OLD_SHA } }] },
              },
            ],
          },
        },
      },
    } satisfies ReviewThreadsResponse);

    // Page 2
    mockGraphql.mockResolvedValueOnce({
      repository: {
        pullRequest: {
          reviewThreads: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [
              {
                id: "t2",
                isOutdated: false,
                isResolved: false,
                comments: { nodes: [{ originalCommit: { oid: HEAD_SHA } }] },
              },
            ],
          },
        },
      },
    } satisfies ReviewThreadsResponse);

    const threads = await fetchReviewThreads(mockGraphql, "owner", "repo", 1);

    expect(threads).toHaveLength(2);
    expect(threads[0]).toEqual({
      id: "t1",
      isOutdated: true,
      isResolved: false,
      originalCommitOid: OLD_SHA,
    });
    expect(threads[1]).toEqual({
      id: "t2",
      isOutdated: false,
      isResolved: false,
      originalCommitOid: HEAD_SHA,
    });
    expect(mockGraphql).toHaveBeenCalledTimes(2);
  });

  it("handles empty thread list", async () => {
    const mockGraphql = vi.fn().mockResolvedValueOnce({
      repository: {
        pullRequest: {
          reviewThreads: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [],
          },
        },
      },
    } satisfies ReviewThreadsResponse);

    const threads = await fetchReviewThreads(mockGraphql, "owner", "repo", 1);
    expect(threads).toHaveLength(0);
  });

  it("handles comments with null originalCommit", async () => {
    const mockGraphql = vi.fn().mockResolvedValueOnce({
      repository: {
        pullRequest: {
          reviewThreads: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [
              {
                id: "t1",
                isOutdated: false,
                isResolved: false,
                comments: { nodes: [{ originalCommit: null }] },
              },
            ],
          },
        },
      },
    } satisfies ReviewThreadsResponse);

    const threads = await fetchReviewThreads(mockGraphql, "owner", "repo", 1);
    expect(threads[0].originalCommitOid).toBeNull();
  });
});
