# Resolve Comments

A GitHub Action that automatically resolves outdated or stale PR review comment threads when new commits are pushed.

## Why?

When you push new commits to a PR, review comments on changed code become outdated. GitHub marks them visually but doesn't resolve them — they still clutter the conversation. This action cleans them up automatically.

## Usage

```yaml
name: Resolve Outdated Comments
on:
  pull_request:
    types: [synchronize]

permissions:
  pull-requests: write

jobs:
  resolve:
    runs-on: ubuntu-latest
    steps:
      - uses: jpoehnelt/resolve-comments@v1
```

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `token` | GitHub token with PR write permissions | `${{ github.token }}` |
| `strategy` | Which threads to resolve (see below) | `any` |

### Strategy Options

| Strategy | Resolves when... |
|----------|------------------|
| `outdated` | GitHub marks the thread as outdated (referenced lines changed) |
| `older_sha` | The comment was made on a commit that isn't the current head SHA |
| `any` | **Either** condition is true (default, most aggressive) |

### Example: Only resolve truly outdated comments

```yaml
- uses: jpoehnelt/resolve-comments@v1
  with:
    strategy: outdated
```

## Outputs

| Output | Description |
|--------|-------------|
| `resolved_count` | Number of threads resolved |

## Permissions

The default `GITHUB_TOKEN` works. The action needs `pull-requests: write` permission.

## License

Apache-2.0
