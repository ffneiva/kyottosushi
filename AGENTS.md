# AGENTS.md

Instruções para qualquer agente de IA — de qualquer modelo — que for trabalhar
neste repositório. Também servem para humanos; são as mesmas regras.

> Este arquivo é a fonte. `CLAUDE.md` apenas aponta para cá.

---

## 1. O fluxo é Issue → branch → PR → merge

**Nenhuma mudança entra na `main` direto.** Vale para correção de uma linha,
troca de preço e atualização de dependência.

```
1. Abra uma Issue (templates em .github/ISSUE_TEMPLATE).
2. Branch a partir da main:  fix/12-preco-cortado · content/13-preco-combo-sakura
3. Commits em Conventional Commits (seção 2).
4. PR mencionando a Issue:   "Closes #12"
5. CI verde. Squash merge.
```

Um PR, um assunto. Se a descrição precisa de "e também", são dois PRs.

## 2. Commits

`tipo(escopo): descrição no imperativo, minúscula, sem ponto final`

**Tipos:** `feat`, `fix`, `content`, `refactor`, `perf`, `style`, `test`,
`docs`, `build`, `ci`, `chore`, `revert`.

**Escopos:** `heroi`, `secoes`, `cardapio`, `pedido`, `seo`, `marca`, `3d`,
`a11y`, `infra`, `ci`, `deps`, `docs`, `testes`.

```
content(cardapio): preço do Combo Sakura conforme o app
fix(pedido): subtotal arredondava o centavo errado
perf(3d): arroz com 900 grãos em vez de 1100 no desktop
```

O corpo do commit explica o **porquê**. O diff já diz o quê.

## 3. Onde as coisas moram

```
src/lib/business.ts   ← TODO o conteúdo: casa, horário, cardápio, preços, FAQ
src/lib/kanji.ts      ← todo texto japonês, com leitura e sentido
src/lib/hours.ts      ← "aberto agora", no fuso de Brasília
src/lib/pedido.ts     ← a sacola: conta em centavos, mínimo, mensagem de WhatsApp
src/lib/marca.ts      ← o letreiro "KYOTTO" em vetor (o selo é imagem)
src/lib/routes.ts     ← rotas e o <head> de cada uma
src/lib/seo.ts        ← JSON-LD e llms.txt, derivados de business.ts
src/scene/nigiri.ts   ← a peça 3D, three.js puro
src/components/       ← peças reutilizáveis
src/sections/         ← seções da home, na ordem em que aparecem
src/pages/            ← as rotas que não são a home
scripts/              ← fontes, imagens, glifos, marca e smoke test do dev
tests/unit/           ← Vitest — lógica pura
tests/e2e/            ← Playwright — contra o build de produção
```

**Regra dura:** texto que o visitante lê não fica em componente. Fica em
`business.ts` (ou `kanji.ts`, se for japonês).

## 4. Regras de conteúdo

- **Nada inventado.** Nenhum depoimento fabricado, nenhum "+10 mil pedidos",
  nenhuma nota que não exista. A casa ainda não tem avaliações públicas, e o
  site não tem seção de avaliações — ela entra quando houver avaliação real.
- **Preço que mudou no app muda aqui no mesmo dia.** Rode
  `npm run cardapio:conferir`: ele compara o site com o app e aponta a diferença.
- **Nenhum prazo de entrega prometido.** Quem informa o tempo é o app.
- **O que não foi confirmado com a casa está marcado `PENDENTE`** em
  `business.ts` e não aparece como fato.
- **Kanji só de `kanji.ts`.** Cada termo tem leitura e sentido conferidos. O
  teste `kanji.test.ts` falha se um caractere japonês aparecer em outro arquivo
  ou faltar na fonte recortada. **Nunca invente uma grafia japonesa para
  "Kyotto"** — não é romanização de nada.
- **Não confundir com o "Kyoto" (um "t") de Goiânia**, @kyotogyn. É outra
  empresa. O Kyotto Sushi é de Senador Canedo, @kyotto_26.
- **A marca é a do selo da casa** (gato da sorte, vermelho e preto). Não
  acrescente clichê "oriental" além do que o próprio logo já tem.

## 5. Movimento e acessibilidade

1. **Estado escondido nunca sobrevive a uma falha.** Animação de entrada só
   esconde com a classe de "armado" presente (`heroi-armado`). Sem JS, tudo
   visível.
2. **`prefers-reduced-motion` desliga o que não é essencial:** abertura (noren),
   cursor, cena 3D, parallax, scroll suave.
3. **Anime `transform` e `opacity`.** Altura: `grid-template-rows: 0fr → 1fr`.

Todo kanji visível tem `lang="ja"` (use `<Ja>`). Um `<h1>` por página, todo
botão com nome acessível, foco visível, região viva anunciando troca de rota.

## 6. Desempenho

O CI falha se o caminho crítico passar de **170 kB comprimidos**.

- Ícone: desenhe o SVG. Nada de biblioteca de ícones.
- Data/hora: `Intl`. Nada de date-fns/dayjs/moment.
- Animação: CSS primeiro; GSAP só para o que depende do scroll; `motion` só
  para animação de **saída**.

Carregado sob demanda, e precisa continuar sendo: `three`, `gsap`, `lenis`,
`web-vitals`, `@sentry/react`, a página do cardápio.

## 7. Antes de abrir o PR

```bash
npm run lint && npx tsc -b && npm run test && npm run knip
npm run check:dev && npm run build && npm run e2e
```

## 8. Publicação

Arquivos estáticos numa CDN (S3 website + Cloudflare). **Custo operacional próximo de
zero é restrição do projeto.** Nada de servidor, banco ou mensalidade.

**Nunca comite chave, ARN, ID de conta ou nome de bucket** — o repositório é
público. O `deploy.yml` lê tudo de `vars.*`.

## 9. Estilo de código

- **Português** em nomes e comentários.
- Comentário explica o **porquê**.
- Sem `any`, sem `console.log`.
- Aspas simples, sem ponto e vírgula, vírgula final, 100 colunas. O Biome cuida.
