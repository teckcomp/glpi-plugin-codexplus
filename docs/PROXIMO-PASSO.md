# Codex+ — próximo passo

> Documento de passagem. Substituído a cada fechamento de sessão.
> Gerado em **23/10/2026 (noite)**, no fechamento da sessão das folhas do
> editor (PL-23 a PL-27), **encerrada sem nada aprovado**. Detalhes na
> CONTEXTO 3.45 (achados 198 a 207).

## Estado

- **Produção:** **`v0.8.5`** (`ac2c447`), intocada nesta sessão.
- **Homologação:** recebeu os pacotes pl23a-2, pl24-1, pl25b-1, pl25c-1,
  pl25d-1 e pl27-1 **sem commit**. Voltar ao estado limpo (como root):

  ```bash
  cd /var/www/html/glpi/plugins/codexplus
  git checkout public/js/codexplus-editor.js public/js/codexplus.js public/css/codexplus.css templates/document-form.html.twig
  su -s /bin/sh www-data -c "php /var/www/html/glpi/bin/console cache:clear"
  git status --short     # vazio
  git log --oneline -1   # 41f74a8 (ou o commit de docs desta sessão)
  rm -f /tmp/codexplus-pl2*.tar.gz /tmp/man0006.html
  ```
  e Ctrl+F5.
- MAN0006 (id 55, "Teste de paginação 1020") é documento de teste; tem 155
  linhas vazias vindas do editor antigo.
- Acessos e envio: iguais aos da sessão anterior (SSH 2078 homologação,
  2022 produção, `scp -P 2078 "%USERPROFILE%\Downloads\<pacote>.tar.gz"
  resolutto@177.87.230.179:/tmp`).

## Regras novas de Claudio (valem para tudo que vier)

1. O editor **não tem "vida própria"**: não cria nem apaga linha que ele não
   pediu.
2. Visualizar e PDF = reflexo exato do editor.
3. Guias na cor do plugin, pontilhadas; área = corte exato do PDF; lacunas
   de cabeçalho/rodapé sombreadas; parágrafo que não cabe desce inteiro.
4. **Método**: comportamento fechado por escrito → mockup no GLPI real →
   um pacote. Nada de trocar de abordagem a cada rodada (achado 206).

## Fila (próxima sessão), em ordem — um pacote por item

1. **PL-25a** — botões de alinhamento no editor (pedido direto; trivial).
2. **PL-25b-motor** — correção do `isHeadingLike` (achado 202).
3. **PL-24** — dados do documento recolhíveis na leitura.
4. **PL-27** — folhas no editor (recomeçar com o comportamento escrito;
   testar com o CSS do GLPI e a configuração de impressão real, achado 207).
5. **PL-26** — visual dos editores no layout do plugin (mockup antes).
6. Depois, a fila anterior: **PL-18c** (quadro inteiro que some), PL-14,
   PL-13, PL-12a, PL-12b, P-3a/P-3b/P-4, Pós-produção.

## Ferramentas de teste no contêiner do assistente

Chromium (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`), TinyMCE 7.9 via npm,
PHP 8.3 + Twig 3.21 (render do template com dados de exemplo). Cuidado:
o harness não tem o CSS do tema do GLPI (achado 207).
