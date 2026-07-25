# Estratégia de fork

Este é um **fork fino** de [twentyhq/twenty](https://github.com/twentyhq/twenty).

## Por que fino, e não "adaptado"

O upstream roda a ~188 commits por semana, com release minor semanal. Em 2026
duas vulnerabilidades graves foram corrigidas **apenas por bump de versão**:

- [GHSA-jgx4-6mr9-9573](https://github.com/twentyhq/twenty/security/advisories/GHSA-jgx4-6mr9-9573)
  — CVSS 9.9, SQL injection no construtor de expressão do `groupBy`, encadeada
  para RCE via `COPY TO PROGRAM`
- [GHSA-v39r-w5vg-j9pp](https://github.com/twentyhq/twenty/security/advisories/GHSA-v39r-w5vg-j9pp)
  — CVSS 7.6, IDOR cross-workspace

Se este fork divergir até o ponto de não conseguir atualizar por tag, o produto
roda com CVE pública conhecida. O argumento para manter fino é de **segurança**,
não de conveniência.

## Estado

| | |
|---|---|
| Base pinada | `twenty/v2.24.3` |
| Branch de trabalho | `arqcrm/main` |
| Remote upstream | `https://github.com/twentyhq/twenty.git` |

## Onde o código do produto vive

A maior parte **não vive aqui**. O domínio (objetos, campos, views, dashboards,
logic functions) é uma Twenty Application num pacote separado, no repositório
privado `hiker328/crm-arquitetos`, diretório `arqcrm/`. Objetos declarados ali
viram tabelas Postgres reais e a fronteira é desenhada para não conflitar em
upgrade.

Este fork carrega apenas:

- `.github/workflows/build-arqcrm-image.yaml` — build da imagem no GHCR
- `packages/twenty-front/src/modules/arqcrm/**` — telas onde design É o produto
- `packages/twenty-server/src/modules/arqcrm/**` — regras que precisam rejeitar
  ou ser atômicas
- configuração de deploy, branding e i18n

## Orçamento de divergência

A métrica correta **não** é "arquivos alterados" — arquivo novo nunca conflita
em merge. É **arquivos do upstream EDITADOS**:

```bash
git diff --name-only --diff-filter=M upstream/main...HEAD \
  | grep -v -E '^(packages/twenty-docker/|\.env|packages/twenty-front/src/locales/)'
```

**Teto: 10 arquivos editados.** Esse número ficar baixo é o que decide se o fork
sobrevive doze meses.

## Arquivos que NÃO podem ser tocados

- `twenty-server/src/engine/**` e `src/database/**` — motor de metadados e
  migração, maior churn do repo
- `twenty-server/src/modules/**` dos objetos padrão
- qualquer arquivo marcado `/* @license Enterprise */` (~308 arquivos: billing,
  SSO, permissões row-level, audit logs). A licença comercial estabelece que
  modificações nesses arquivos se tornam propriedade da Twenty.

## Sincronizar com o upstream

Em cadência **fixa**, não "quando der" — dificuldade de merge cresce com volume
acumulado.

```bash
git fetch upstream --tags
git log --oneline arqcrm/main..upstream/main | head -30
git merge twenty/v2.25.0        # ou a tag alvo
```

Se um patch em arquivo do upstream for inevitável, registre como série nomeada
(`git format-patch`) com dono e justificativa — nunca misturado num commit de
feature.
