# Deploy

- **Site:** https://kyottosushi.abramdigital.com.br
- **Hospedagem:** S3 static website (`sa-east-1`, bucket com o nome do domínio)
  com a Cloudflare na frente (proxy, SSL *Flexible*, cabeçalhos de segurança
  e a reescrita `/rota` → `/rota/index.html`). Sem CloudFront.
- **Publicar:** push na `main`. O workflow `.github/workflows/deploy.yml` roda
  lint, testes e build, assume a role da AWS por OIDC, sobe para o S3 (assets
  imutáveis → estáticos → HTML sem cache) e confere cada rota no ar.

## Configuração do repositório

| Tipo | Nome | Conteúdo |
|---|---|---|
| Secret | `AWS_ROLE_ARN` | role de deploy (só confia no environment `production` deste repositório) |
| Variable | `AWS_REGION` | `sa-east-1` |
| Variable | `S3_BUCKET_NAME` | o domínio |
| Variable | `S3_WEBSITE_ENDPOINT` | `<bucket>.s3-website-sa-east-1.amazonaws.com` |
| Variable | `SITE_DOMINIO` | o domínio |
| Variable | `ROTAS` | opcional — rotas conferidas no smoke test |

O ARN é **secret** porque o log do Actions de um repositório público é
público, e o GitHub só mascara secrets.

## Sem o GitHub

Da máquina do desenvolvedor, com o toolkit de infraestrutura (fora deste
repositório): `bash ../_infra-sites/deploy-local.sh kyottosushi`.

## Problemas comuns

| Sintoma | Causa |
|---|---|
| `/rota` devolve 404 | faltou a regra de reescrita da Cloudflare para o host |
| 403 no endereço inexistente | a policy do bucket sem `s3:ListBucket` (o S3 responde 403 em vez de 404) |
| Fonte ou imagem baixando em vez de abrir | Content-Type errado — o workflow define por extensão |
| Erro 525/526 | SSL da Cloudflare em *Full* — o endpoint de website do S3 só fala HTTP (*Flexible*) |
