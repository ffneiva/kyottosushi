/**
 * Conventional Commits. Os escopos espelham as áreas do site; `infra` cobre
 * AWS e Actions, `content` é o tipo para troca de preço, horário e texto.
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
        'content',
        'refactor',
        'perf',
        'style',
        'test',
        'docs',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'heroi',
        'secoes',
        'cardapio',
        'pedido',
        'seo',
        'marca',
        '3d',
        'a11y',
        'infra',
        'ci',
        'deps',
        'docs',
        'testes',
      ],
    ],
    'subject-case': [0],
    'header-max-length': [2, 'always', 100],
  },
}
