# Codex+ — próximo passo

> Documento de passagem. Substituído a cada fechamento de sessão.
> Gerado em 04/10/2026 (noite), ao fim da sessão da **R6-b**, **R7**,
> **Etapa 5** e dos ajustes de tela.

## Estado

- Versão: **`0.7.9`**; último commit de código **`ea02b8a`**; depois, o
  commit destes documentos. Plugin 0.7.9 habilitado na homologação.
- Commits da sessão: `96cbe2b` (3c-4), `f757c31` (R6-b1, 0.7.7), `207cda4`
  (R6-b2), `ed00235` (R7-1, 0.7.8), `e8acd88` (R7-2a), `02e4f7c` (R7-2b),
  `ac6be3d` (5a, 0.7.9), `d3e22fa` (abas + tela cheia), `9d48dae` (5b),
  `7315adf` (5c/5e), `ea02b8a` (5d).
- Homologação: `177.87.230.179`, SSH porta 2078, `resolutto` → **`su -`**
  (achado 93); GLPI em `http://177.87.230.179:2077`. GLPI 11.0.6, PHP 8.4,
  MariaDB 11.8. Repositório = `/var/www/html/glpi/plugins/codexplus`, como root.
- **Produção (futura): Debian 13, SSH porta 2022.** Só na etapa final.
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
- **Fonte da verdade: `docs/CONTEXTO.md`**, seção **3.17** e achados
  **140 a 148**; `docs/ROADMAP.md`, "Sessão de 04/10/2026 (noite)".

## Regras de trabalho (Claudio)

- **"Pronto" = roadmap inteiro; produção é a etapa final** (02/10).
  Claudio quer **acelerar** para produção (04/10): pacotes maiores quando
  o risco é baixo, mockup só quando a tela muda de verdade.
- Um pacote por bloco, validado antes, roteiro de teste e **commit antes do
  pacote seguinte**. Clonar do GitHub no último commit antes de mexer
  (achado 71).
- **Validação no container** (achado 136): GLPI 11.0.6 real + MariaDB,
  harness PHP com o Kernel, tela pelo `php -S` + Chromium. **MariaDB e
  `php -S` morrem entre comandos: subir no mesmo comando**; `cache:clear`
  depois de trocar Twig (achado 140).
- **Toda regra prometida no texto da entrega entra no harness** (achado 139).
- **Modelo é dado da instalação, nunca semente do Install** (achado 137).

## Próximo passo imediato

**Caça a bugs.** Começar perguntando a Claudio o que ele já viu de errado
no uso da homologação, e juntar com a lista anotada no ROADMAP (Backlog →
"Caça a bugs — já anotados"): marca d'água "RASCUNHO" nas folhas, Word sem
histórico e complementares, limites do PDF completo, leitura comum em
folhas. Priorizar com ele; pacotes por tema.

## Depois

Produção (bloco de conferência do servidor Debian 13 primeiro, só leitura;
modelos e documentos bons da homologação por `mysqldump --where`) → Etapa 7
(alerta de vencimento) → aba de Histórico e galeria de Modelos.
