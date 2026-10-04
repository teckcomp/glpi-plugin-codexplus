# Codex+ — próximo passo

> Documento de passagem. Substituído a cada fechamento de sessão.
> Gerado em 04/10/2026 (noite), depois do **MO-1 ✅** (`1f46cb7`).

## Estado

- Versão: **`0.7.11`**; último commit de código **`1f46cb7`** (MO-1); docs
  neste pacote. Plugin 0.7.11 habilitado na homologação.
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
- **Fonte da verdade: `docs/CONTEXTO.md`** (seções 3.17 a 3.21, achados
  até 157) e `docs/ROADMAP.md`, seções **"Reta final antes da produção"**,
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
3. ~~**MO-1**~~ ✅ `1f46cb7` — modelos por setor e categoria (0.7.11)
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

**MO-2** — imagens dentro de modelos (ROADMAP, Reta final, linha 4;
**sem schema previsto**, confirmar ao ler o código). Clonar o `master` do
GitHub (`1f46cb7` + docs).

Antes de codar: ler `Template::sanitize()`/`stripImages()` (a regra do M1
que este bloco reverte), o `Html::textarea` de `front/templates.php`
(`enable_images => false`) e o de `front/document.form.php` (linha ~785,
`enable_images => true`), e como o documento grava as imagens coladas
(`Document_Item` ligado a UM documento — ver `src/Document.php` e o
`document.form.php`). Levar a Claudio, numa resposta só, as decisões do
MO-2 no ROADMAP: (1) a imagem do modelo é **copiada** para cada documento
novo (arquivo próprio, não o mesmo `Document` do GLPI)? (2) apagar ou
trocar a imagem no modelo **não mexe** nos documentos já criados? (3)
"Duplicar" o modelo copia as imagens também? Mockup só se a tela mudar
(provavelmente não muda). Sem `setup.php` novo se não houver schema:
`cache:clear` + `systemctl restart apache2`.

Lembretes do container (achados 153, 154, 157): `mysqld` por `setsid
nohup` no mesmo comando; login por script numa sessão Python só, com
`Referer` nos POST; jsdom espera o `DOMContentLoaded`.

Ao chegar no **7b**, pedir antes: SMTP configurado na homologação. Ao
chegar no **Q5i-5/Q5i-6**, pedir antes: arquivos `.bpmn` e `.drawio` de
exemplo (sem eles, validar com exemplos públicos e avisar o risco).
