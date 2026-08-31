# Codex+ — gestão documental para GLPI 11

Plugin que transforma a base de conhecimento do GLPI 11 em um sistema de
**documentos controlados**: wiki, base de conhecimento e produção de POPs,
manuais e propostas, com exportação em PDF com a marca da empresa.

> **Estado:** `v0.5.3-alpha` — em desenvolvimento, homologação interna.
> Não recomendado para produção ainda.

## O que já faz

- **Painel** com indicadores acionáveis: publicados, a vencer, vencidos,
  rascunhos, pendências (sem código, sem categoria, revisão vencida)
- **Documentos:** estante por categoria, filtro por tipo e status, busca por
  título e por código
- **Leitura própria** do documento, com código, tipo, situação, responsável e
  anexos
- **Modelos por tipo**, e fluxo "Novo documento" que parte de um modelo
- **Metadados de documento controlado:** tipo, código derivado, revisão,
  status, responsável, validade
- **Exportação em PDF** pelo navegador, com imagens, paginação automática,
  logo repetido por página e rodapé com código, revisão e paginação
- **Configuração de marca:** logo, cabeçalho e rodapé em texto livre com
  marcadores

## Tipos de documento

| Sigla | Nome | Vence? |
|---|---|---|
| `POP` | Procedimento Operacional Padrão | sim |
| `PSG` | Procedimento do Sistema de Gestão | sim |
| `MAN` | Manual | sim |
| `PRP` | Proposta | não |

Código no formato `POP0001:00` — sigla, sequencial de 4 dígitos e revisão de
2 dígitos. Derivado, nunca armazenado.

## Princípios

- **Nenhuma tabela nativa do GLPI é alterada.** Os documentos são
  `glpi_knowbaseitems`; os metadados vivem em tabelas satélite
- **A visibilidade é a nativa** — perfil, grupo, entidade e FAQ são
  respeitados sem reimplementação
- **Telas próprias em Twig**, não CSS sobre HTML alheio
- **PDF client-side**, pelo navegador, não TCPDF

## Instalação

```bash
cd /var/www/html/glpi/plugins
# copiar a pasta codexplus/ para cá
chown -R www-data:www-data codexplus

cd /var/www/html/glpi
sudo -u www-data php bin/console plugin:install --username=glpi codexplus
sudo -u www-data php bin/console plugin:activate codexplus
sudo -u www-data php bin/console cache:clear
```

Requer GLPI 11.0.x e PHP 8.2+.

## Documentação

Quem for dar andamento ao plugin deve ler, nesta ordem:

| Documento | Para quê |
|---|---|
| [`docs/CONTEXTO.md`](docs/CONTEXTO.md) | **Comece aqui.** Escopo, arquitetura, achados técnicos do GLPI 11 e o contrato de código que não pode ser quebrado |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | O que está pronto, o que vem a seguir e com que critério de aceite |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | Como publicar no servidor de homologação e diagnosticar erro |
| [`docs/REFERENCIAS.md`](docs/REFERENCIAS.md) | O que foi consultado, aproveitado e descartado — e por quê |

## Licença

GPL-2.0-or-later · Teckcomp I.T. Services
