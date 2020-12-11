# getsentry/action-github-commit <a href="https://github.com/getsentry/action-github-commit/actions"><img alt="typescript-action status" src="https://github.com/getsentry/action-github-commit/workflows/build/badge.svg"></a>

Commits any changed files using the GitHub API.

## Usage

See the [Sentry repo](https://github.com/getsentry/sentry/tree/master/.github/workflows) for real world examples.

Note: You may want to use a non-default GitHub token (e.g. not the GH Action token) as it will not trigger follow-up workflow runs!

### Inputs

| input | required | description |
| ----- | -------- | ----------- |
| `github-token` | no | The GitHub Actions token e.g. `secrets.GITHUB_TOKEN` (See note above) |
| `message` | no | The commit message to use |

## Installation

Add the following to your workflow config

```yaml
    - name: Commit changes
      uses: getsentry/action-github-commit@v1
```
