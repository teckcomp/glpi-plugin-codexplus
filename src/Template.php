<?php
namespace GlpiPlugin\Codexplus;

use CommonDBTM;

/**
 * Modelo (template) por tipo de documento — Etapa 3a.
 *
 * Guarda o esqueleto HTML das seções de cada tipo (POP, PSG, Manual,
 * Proposta). Na Etapa 3b, o botão "Novo documento" usa isto para criar um
 * artigo já com o conteúdo e os metadados preenchidos.
 *
 * Só um modelo "padrão" por tipo (is_default) — usado como sugestão inicial.
 */
class Template extends CommonDBTM
{
    public static $rightname = 'plugin_codexplus_wiki';

    public static function getTable($classname = null): string
    {
        return Install::TEMPLATES_TABLE;
    }

    public static function getTypeName($nb = 0)
    {
        return _n('Modelo', 'Modelos', $nb, 'codexplus');
    }

    public static function getIcon()
    {
        return 'ti ti-layout-list';
    }

    /**
     * Modelo padrão de um tipo (para o "Novo documento" da 3b). Cai para
     * qualquer modelo do tipo se não houver um marcado como padrão.
     */
    /**
     * Modelos para a criação no modelo novo (R3b4, Claudio 26/09/2026): todos
     * os tipos de uma vez; a tela filtra pelo tipo escolhido. Padrão primeiro.
     *
     * @return array<int, array{id:int, name:string, doctype:string, is_default:bool, content:string}>
     */
    public static function listForCreation(): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $out = [];
        foreach ($DB->request([
            'FROM'  => self::getTable(),
            'ORDER' => ['doctype', 'is_default DESC', 'name'],
        ]) as $r) {
            $out[] = [
                'id'         => (int) $r['id'],
                'name'       => (string) $r['name'],
                'doctype'    => (string) $r['doctype'],
                'is_default' => (bool) $r['is_default'],
                'content'    => (string) ($r['content'] ?? ''),
            ];
        }
        return $out;
    }

    public static function getDefaultForDoctype(string $doctype): ?self
    {
        $tpl = new self();
        if ($tpl->getFromDBByCrit(['doctype' => $doctype, 'is_default' => 1])) {
            return $tpl;
        }
        if ($tpl->getFromDBByCrit(['doctype' => $doctype])) {
            return $tpl;
        }
        return null;
    }

    public function prepareInputForAdd($input)
    {
        return $this->sanitize($input);
    }

    public function prepareInputForUpdate($input)
    {
        return $this->sanitize($input);
    }

    private function sanitize(array $input): array
    {
        if (isset($input['doctype']) && !in_array($input['doctype'], DocumentMeta::DOCTYPE_KEYS, true)) {
            $input['doctype'] = '';
        }
        // Checkbox: ausente no POST = desmarcado.
        $input['is_default'] = !empty($input['is_default']) ? 1 : 0;
        // M1: modelo não guarda imagem. A imagem é arquivo ligado a UM
        // documento (Document_Item): num documento novo ela não abriria.
        if (isset($input['content'])) {
            $input['content'] = self::stripImages((string) $input['content']);
        }
        return $input;
    }

    /** Tira imagens (e o invólucro do anotador, E4) do HTML do modelo. */
    public static function stripImages(string $html): string
    {
        $html = preg_replace('#<span[^>]*class="[^"]*\bcx-annot\b[^"]*"[^>]*>.*?</span>#si', '', $html) ?? $html;
        $html = preg_replace('#<img\b[^>]*>#i', '', $html) ?? $html;
        return $html;
    }

    public function post_addItem()
    {
        $this->enforceSingleDefault();
    }

    public function post_updateItem($history = true)
    {
        $this->enforceSingleDefault();
    }

    /**
     * Garante um único modelo padrão por tipo: ao salvar este como padrão,
     * zera o is_default dos outros do mesmo tipo.
     */
    private function enforceSingleDefault(): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        if (empty($this->fields['is_default']) || empty($this->fields['doctype'])) {
            return;
        }

        $DB->update(
            self::getTable(),
            ['is_default' => 0],
            [
                'doctype' => $this->fields['doctype'],
                'id'      => ['<>', $this->getID()],
            ]
        );
    }

    // ---------------------------------------------------------------------
    // Sementes iniciais (Etapa 3a) — inseridas só na criação da tabela.
    // ---------------------------------------------------------------------

    /**
     * @return array<int, array{0:string, 1:string, 2:string}> [doctype, nome, conteúdo]
     */
    public static function getDefaultSeeds(): array
    {
        return [
            ['POP', __('Modelo padrão de POP', 'codexplus'),      self::seedPOP()],
            ['PSG', __('Modelo padrão de PSG', 'codexplus'),      self::seedPSG()],
            ['MAN', __('Modelo padrão de Manual', 'codexplus'),   self::seedMAN()],
            ['PRP', __('Modelo padrão de Proposta', 'codexplus'), self::seedPRP()],
        ];
    }

    private static function revisionTable(): string
    {
        return '<h2>Histórico de revisão</h2>'
            . '<table style="border-collapse:collapse;width:100%;">'
            . '<tr>'
            . '<th style="border:1px solid #ccc;padding:6px;">Data</th>'
            . '<th style="border:1px solid #ccc;padding:6px;">Revisão</th>'
            . '<th style="border:1px solid #ccc;padding:6px;">Alteração</th>'
            . '</tr>'
            . '<tr>'
            . '<td style="border:1px solid #ccc;padding:6px;">&nbsp;</td>'
            . '<td style="border:1px solid #ccc;padding:6px;">&nbsp;</td>'
            . '<td style="border:1px solid #ccc;padding:6px;">&nbsp;</td>'
            . '</tr>'
            . '</table>';
    }

    private static function seedPOP(): string
    {
        return '<h2>Objetivo</h2><p></p>'
            . '<h2>Pré-requisitos</h2><ul><li></li></ul>'
            . '<h2>Passos</h2><ol><li></li></ol>'
            . '<h2>Observações</h2><p></p>'
            . self::revisionTable();
    }

    private static function seedPSG(): string
    {
        return '<h2>Objetivo</h2><p></p>'
            . '<h2>Abrangência</h2><p></p>'
            . '<h2>Procedimentos vinculados</h2><p>Os POPs vinculados ao setor aparecem aqui.</p>'
            . '<h2>Responsabilidades</h2><p></p>'
            . self::revisionTable();
    }

    private static function seedMAN(): string
    {
        return '<h2>Introdução</h2><p></p>'
            . '<h2>Requisitos</h2><ul><li></li></ul>'
            . '<h2>Uso</h2><p></p>'
            . '<h2>Manutenção</h2><p></p>'
            . '<h2>Referências</h2><p></p>';
    }

    /** 3c-3: nome do modelo completo de Proposta (o Install não duplica pelo nome). */
    public const PRP_FULL_NAME = 'Proposta — completa (levantamento, planilhas, resumo e escopo)';

    /**
     * 3c-3 (Claudio, 04/10/2026, mockup aprovado): modelo completo de
     * Proposta, a partir da PRP0005/PRP0006. Seis seções; em "Materiais e mão
     * de obra", duas planilhas (Materiais e Mão de obra) e logo depois o
     * Resumo do investimento. Sem condições comerciais e sem aceite.
     *
     * As planilhas vão só com o JSON (data-cx-sheet) e a tabela vazia: o
     * editor monta a tabela a partir do JSON ao abrir (codexplus-sheet.js,
     * decorate) e o Resumo se calcula sozinho. O texto em itálico é
     * orientação para quem preenche.
     */
    public static function seedPRPFull(): string
    {
        $planilha = static function (): string {
            $data = [
                'v'          => 1,
                'cols'       => [
                    ['name' => 'Qtd', 'type' => 'num', 'formula' => ''],
                    ['name' => 'Item', 'type' => 'text', 'formula' => ''],
                    ['name' => 'Unitário', 'type' => 'money', 'formula' => ''],
                    ['name' => 'Total', 'type' => 'money', 'formula' => '=A*C'],
                ],
                'rows'       => [['', '', '', ''], ['', '', '', '']],
                'total'      => true,
                'totalLabel' => 'Total',
            ];
            $json = json_encode($data, JSON_UNESCAPED_UNICODE);
            return '<div class="cx-sheet" contenteditable="false" data-cx-sheet="'
                . htmlspecialchars((string) $json, ENT_QUOTES, 'UTF-8')
                . '"><table class="cx-sheet-table"><tbody></tbody></table></div>';
        };
        $dica = static fn (string $t): string => '<p><em>' . $t . '</em></p>';

        return '<h2>1. Levantamento de necessidades</h2>'
            . $dica('Descreva o que o cliente pediu e o cenário encontrado na visita.')
            . '<h2>2. Avaliação</h2>'
            . $dica('Diagnóstico técnico: o que existe, o que falta, o que será trocado.')
            . '<h2>3. Materiais e mão de obra</h2>'
            . '<h3>Materiais</h3>' . $planilha()
            . '<h3>Mão de obra</h3>' . $planilha()
            . '<div class="cx-sum" contenteditable="false"></div>'
            . '<h2>4. Planejamento de execução</h2>'
            . '<ol><li><em>Primeira etapa</em></li><li><em>Segunda etapa</em></li></ol>'
            . '<h2>5. Criticidades</h2>'
            . '<p class="cx-callout cx-callout-attention"><strong>Atenção</strong> — riscos, dependências do cliente, pontos que podem mudar prazo ou valor.</p>'
            . '<h2>6. Escopo do projeto</h2>'
            . $dica('Insira a planta do cliente pelo botão Planta da barra do editor e descreva a legenda abaixo dela.')
            . '<p></p>';
    }

    private static function seedPRP(): string
    {
        // As cinco seções reais da proposta da Resolutto.
        return '<h2>Levantamento de necessidades</h2><p></p>'
            . '<h2>Avaliação</h2><p></p>'
            . '<h2>Materiais e mão de obra</h2><p></p>'
            . '<h2>Planejamento de execução</h2><p></p>'
            . '<h2>Criticidades</h2><p></p>';
    }
}
