# Codex+ — próximo passo

> Documento de passagem. Substituído a cada fechamento de sessão.
> Gerado em 04/10/2026 (fim da noite), depois da **reorganização para
> produção** decidida por Claudio.

## Estado

- Versão: **`0.7.9`**; último commit de código **`ea02b8a`**; docs em
  `ef1db1b` e depois este pacote. Plugin 0.7.9 habilitado na homologação.
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
  apache2`. Versão nova no `setup.php`: `plugin:install --force
  --username=glpi codexplus` + `plugin:activate codexplus` + `plugin:list |
  grep -i codexplus`. **Bloco de commit sempre começa com `cd` para a pasta
  do plugin** (achado 127).
- **Fonte da verdade: `docs/CONTEXTO.md`** (seções 3.17 e 3.18, achados
  até 148) e `docs/ROADMAP.md`, seções **"Reta final antes da produção"**,
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
  harness PHP com o Kernel, tela pelo `php -S` + Chromium. **MariaDB e
  `php -S` morrem entre comandos: subir no mesmo comando**; `cache:clear`
  depois de trocar Twig (achado 140).
- **Toda regra prometida no texto da entrega entra no harness** (achado 139).
- **Modelo é dado da instalação, nunca semente do Install** (achado 137).

## Ordem da Reta final

1. **HV-1** — aba Histórico + "incluir obsoletos" na Biblioteca (sem schema)
2. **AP-1** — aprovadores por versão + "Aguardando aprovadores" (0.7.10)
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

**HV-1.** Clonar o `master` do GitHub. Mostrar a Claudio um mockup com as
duas opções de lugar do Histórico (4ª aba dos dados do documento ou seção
no fim da página) e o que entra nele (`glpi_logs` do documento; perguntar
se revisões, prorrogações e acessos pelo link também). Com a escolha dele,
montar o pacote junto do filtro "incluir obsoletos" da Biblioteca. Sem
schema, sem reinstalar.

Ao chegar no **7b**, pedir antes: SMTP configurado na homologação. Ao
chegar no **Q5i-5/Q5i-6**, pedir antes: arquivos `.bpmn` e `.drawio` de
exemplo (sem eles, validar com exemplos públicos e avisar o risco).
