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
        return $input;
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
