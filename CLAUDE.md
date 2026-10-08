# CLAUDE.md

As instruções deste projeto vivem em **[`AGENTS.md`](AGENTS.md)** — valem para
qualquer agente, de qualquer modelo, e para humanos. Uma cópia aqui só criaria
duas versões da mesma regra.

Resumo do que ele exige:

1. **Issue → branch → PR** com `Closes #N`. Nada entra na `main` direto.
2. **Conventional Commits**, validados pelo commitlint.
3. **Todo conteúdo em `src/lib/business.ts`**; todo japonês em `src/lib/kanji.ts`.
4. **Nada inventado.** Nota, avaliação e preço com fonte; o não confirmado fica `CONFIRMAR`.
5. **Movimento nunca esconde conteúdo de forma irreversível**; movimento reduzido desliga o resto.
6. **170 kB comprimidos** no caminho crítico, verificado no CI.
7. **Nada de infraestrutura no repositório** — ele é público.
