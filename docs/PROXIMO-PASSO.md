# Codex+ — próximo passo

> Documento de passagem. Substituído a cada fechamento de sessão.
> Gerado em 04/10/2026 (noite), depois do **AP-1 ✅** (`42a84c0`).

## Estado

- Versão: **`0.7.10`**; último commit de código **`42a84c0`** (AP-1); docs
  neste pacote. Plugin 0.7.10 habilitado na homologação.
- Homologação: `177.87.230.179`, SSH porta 2078, `resolutto` → **`su -`**
  (achado 93); GLPI em `http://177.87.230.179:2077`. GLPI 11.0.6, PHP 8.4,
  MariaDB 11.8. Repositório = `/var/www/html/glpi/plugins/codexplus`, como root.
- **Produção (futura): Debian 13, SSH porta 2022.** Depois do F-0.
- Envio do PC (cmd do Windows) — **sempre as duas linhas**, uma por PC
  (achado 98):
  ```
  :: PC "Analista Resolutto"
  scp -P 2078 "%USERPROFILE%\Documents\<pacote>.tar.gz" resolutto@177.87.230.179:/tmp
  :: PC "Pc"
  scp -P 2078 "%USERPROFILE%\Downloads\<pacote>.tar.gz" resolutto@177.87.230.179:/tmp
  ```
- Aplicar: `git status --short` **vazio**, `md5sum`, `tar xzf
  /tmp/<pacote>.tar.gz -C /var/www/html/glpi/plugins`, `chown -R
  www-data:www-data …/codexplus`, `grep -c` do token novo (achado 114).
  Só JS/CSS: Ctrl+F5. PHP/Twig: `cache:clear` + `systemctl restart
  apache2`. **Console sempre por** `su -s /bin/sh www-data -c "php
  /var/www/html/glpi/bin/console …"` — `runuser` não está no PATH
  (achado 149). Versão nova no `setup.php`: `plugin:install --force
  --username=glpi codexplus` + `plugin:activate codexplus` + `plugin:list |
  grep -i codexplus`. **Bloco de commit sempre começa com `cd` para a pasta
  do plugin** (achado 127).
- **Fonte da verdade: `docs/CONTEXTO.md`** (seções 3.17 a 3.20, achados
  até 155) e `docs/ROADMAP.md`, seções **"Reta final antes da produção"**,
  **"Pós-produção"** e "Decisões pendentes → Da Reta final".

## Regras de trabalho (Claudio)

- **Antes da produção, só a Reta final** (04/10, fim da noite): 12 blocos
  + F-0. Todo o resto, inclusive a caça a bugs anotada, é Pós-produção.
  Não puxar item da Pós-produção para dentro de um bloco da Reta final.
- Acelerar: pacotes maiores quando o risco é baixo, mockup só quando a tela
  muda de verdade.
- Um pacote por bloco, validado antes, roteiro de teste e **commit antes do
  pacote seguinte**. Clonar do GitHub no último commit antes de mexer
  (achado 71).
- **Validação no container** (achado 136): GLPI 11.0.6 real + MariaDB,
  harness PHP com o Kernel, tela pelo `php -S` + Chromium (sem Chromium:
  login por script numa sessão Python só, achado 154). **MariaDB e
  `php -S` morrem entre comandos: subir no mesmo comando**; `cache:clear`
  depois de trocar Twig (achado 140).
- **Toda regra prometida no texto da entrega entra no harness** (achado 139).
- **Modelo é dado da instalação, nunca semente do Install** (achado 137).

## Ordem da Reta final

1. ~~**HV-1**~~ ✅ `7a54900` — aba Histórico + "incluir obsoletos" na Biblioteca
2. ~~**AP-1**~~ ✅ `42a84c0` — aprovadores por versão + "Aguardando aprovadores" (0.7.10)
3. **MO-1** — modelos por setor e categoria (0.7.11)
4. **MO-2** — imagens dentro de modelos
5. **Q7c-1** — cronograma: fase leva linha solta; tela cheia esticada
6. **Q7c-2** — cronograma: histórico das marcações (0.7.12)
7. **Q5k** — fluxograma: texto solto com quebra; "mais formas"
8. **7a** — Etapa 7: cron e regra sem repetir (0.7.13)
9. **7b** — Etapa 7: e-mail pela notificação nativa
10. **Q8** — DTC: mapa de calor
11. **Q5i-5** — `.bpmn`
12. **Q5i-6** — draw.io
13. **F-0** — 0.8.0, tag, instalação do zero, docs → **P-1 a P-4** (produção)

## Próximo passo imediato

**MO-1** (0.7.11, **com schema — reinstala**). Clonar o `master` do GitHub
(`42a84c0`). Entrega (ROADMAP, Reta final, linha 3): modelos por **setor e
categoria** — colunas no modelo, tela **Modelos** agrupada, e a criação de
documento oferecendo só os modelos que cabem.

Antes de codar: ler `src/Template.php`, a tabela de modelos no
`Install.php`, `front/templates.php`, `front/template.form.php` e
`Template::listForCreation()` (usado pelo `document.form.php`). Levar a
Claudio, numa resposta só: (1) **mockup da tela Modelos** agrupada por
setor → categoria; (2) as decisões pendentes do MO-1 no ROADMAP (setor e
categoria opcionais? modelo sem setor vale para todos? a criação filtra
pela categoria escolhida ou pelo setor de quem cria?); (3) o schema
proposto (colunas no modelo vs. tabela de ligação, se puder ter várias
categorias). Modelos são dado da instalação (achado 137): a migração não
semeia nada, só cria as colunas. Pacote com `setup.php` em 0.7.11:
`plugin:install --force` + `plugin:activate` + `plugin:list | grep -i
codexplus`, pelo `su -s /bin/sh www-data -c "…"`.

Ao chegar no **7b**, pedir antes: SMTP configurado na homologação. Ao
chegar no **Q5i-5/Q5i-6**, pedir antes: arquivos `.bpmn` e `.drawio` de
exemplo (sem eles, validar com exemplos públicos e avisar o risco).
