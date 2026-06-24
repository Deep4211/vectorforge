/**
 * Conventional Commits — enforced via the Husky `commit-msg` hook.
 * Allowed types align with docs/git-workflow conventions:
 *   feat, fix, refactor, docs, test, chore, perf, ci, build, style, revert
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'refactor',
        'docs',
        'test',
        'chore',
        'perf',
        'ci',
        'build',
        'style',
        'revert',
      ],
    ],
    'scope-case': [2, 'always', 'kebab-case'],
    'subject-case': [2, 'never', ['upper-case', 'pascal-case', 'start-case']],
  },
};
