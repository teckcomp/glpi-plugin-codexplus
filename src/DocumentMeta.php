<?php
namespace GlpiPlugin\Codexplus;

use CommonDBTM;
use CommonGLPI;
use Dropdown;
use Html;
use KnowbaseItem;
use Session;
use User;

/**
 * Metadados de documento controlado (Etapa 2a).
 *
 * Tabela satélite ligada ao artigo nativo por knowbaseitems_id (1:1).
 * Guarda o eixo "documento controlado" que o GLPI não tem: tipo, sequencial,
 * revisão, status, responsável e validade. NÃO duplica conteúdo — o texto,
 * as revisões, a busca e as permissões continuam 100% nativos.
 *
 * O CÓDIGO é DERIVADO, nunca armazenado:
 *     doctype + sequence(4 dígitos) + ':' + revision(2 dígitos)  ->  POP0014:01
 *
 * Aparece como aba "Codex+" na ficha nativa do artigo (via
 * Plugin::registerClass(..., ['addtabon' => 'KnowbaseItem']) no setup.php).
 */
class DocumentMeta extends CommonDBTM
{
    public static $rightname = 'plugin_codexplus_wiki';

    public const DEFAULT_VALIDITY_MONTHS = 12;

    /** Janela do estado "a vencer", em dias. */
    public const EXPIRY_WINDOW_DAYS = 30;

    /** Prefixos válidos (viram o começo do código, gravado no sequencial). */
    public const DOCTYPE_KEYS = ['POP', 'PSG', 'MAN', 'PRP'];
    public const STATUS_KEYS  = ['rascunho', 'publicado', 'obsoleto'];

    /**
     * Nome da tabela fixado (o padrão do GLPI derivaria
     * "glpi_plugin_codexplus_documentmetas"; queremos "..._documents").
     */
    public static function getTable($classname = null): string
    {
        return Install::DOCUMENTS_TABLE;
    }

    public static function getTypeName($nb = 0)
    {
        return __('Codex+', 'codexplus');
    }

    public static function getIcon()
    {
        return 'ti ti-book-2';
    }

    /** Rótulos traduzidos dos tipos, para o dropdown. */
    public static function getDoctypes(): array
    {
        return [
            'POP' => __('POP — Procedimento Operacional Padrão', 'codexplus'),
            'PSG' => __('PSG — Procedimento do Sistema de Gestão', 'codexplus'),
            'MAN' => __('MAN — Manual', 'codexplus'),
            'PRP' => __('PRP — Proposta', 'codexplus'),
        ];
    }

    /**
     * Nomes CURTOS dos tipos — usados no Painel, onde o rótulo longo não
     * cabe. Separado de getDoctypes() de propósito: extrair o nome curto
     * quebrando a string longa num travessão seria frágil (o rótulo é
     * traduzível e a pontuação pode mudar por idioma).
     *
     * @return array<string, string>
     */
    public static function getDoctypeShortNames(): array
    {
        return [
            'POP' => __('POP', 'codexplus'),
            'PSG' => __('PSG', 'codexplus'),
            'MAN' => __('Manual', 'codexplus'),
            'PRP' => __('Proposta', 'codexplus'),
        ];
    }

    /**
     * Descrição do tipo SEM a sigla — para telas onde o código já está
     * visível ao lado (leitura do documento). "POP0001:00 · POP" é
     * redundante; "POP0001:00 · Procedimento Operacional Padrão" informa.
     *
     * Terceira lista em vez de recortar getDoctypes() no travessão pelo
     * mesmo motivo já registrado em getDoctypeShortNames(): o rótulo é
     * traduzível e a pontuação muda por idioma.
     *
     * @return array<string, string>
     */
    public static function getDoctypeDescriptions(): array
    {
        return [
            'POP' => __('Procedimento Operacional Padrão', 'codexplus'),
            'PSG' => __('Procedimento do Sistema de Gestão', 'codexplus'),
            'MAN' => __('Manual', 'codexplus'),
            'PRP' => __('Proposta', 'codexplus'),
        ];
    }

    /** Rótulos traduzidos dos status, para o dropdown. */
    public static function getStatuses(): array
    {
        return [
            'rascunho'  => __('Rascunho', 'codexplus'),
            'publicado' => __('Publicado', 'codexplus'),
            'obsoleto'  => __('Obsoleto', 'codexplus'),
        ];
    }

    /**
     * Carrega (ou instancia vazio) o metadado de um artigo.
     */
    public static function getForKnowbaseItem(int $kbId): self
    {
        $meta = new self();
        if (!$meta->getFromDBByCrit(['knowbaseitems_id' => $kbId])) {
            $meta->getEmpty();
            $meta->fields['knowbaseitems_id'] = $kbId;
            $meta->fields['status']           = 'rascunho';
            $meta->fields['revision']         = 0;
            $meta->fields['validity_months']  = self::DEFAULT_VALIDITY_MONTHS;
        }
        return $meta;
    }

    /**
     * Estado de vencimento + data de vencimento em timestamp.
     *
     * Regras (do documento de contexto):
     *  - validade 0 = não vence (caso das propostas)
     *  - só documento PUBLICADO vence; rascunho e obsoleto não entram
     *  - a base do cálculo é date_published + validity_months
     *
     * MORA AQUI, e não no Dashboard, porque a partir da Etapa 4b a tela de
     * leitura também precisa do estado. Duas cópias da mesma regra é como
     * o painel e o documento começam a discordar sobre o que está vencido.
     *
     * O cálculo é feito em PHP de propósito: DATE_ADD dentro do construtor
     * de consulta do GLPI 11 é escapado com crases e quebra (achado nº 4).
     *
     * @return array{state:string, due:?int} state: '' | 'emdia' | 'avencer' | 'vencido'
     */
    public static function expiryState(?string $published, int $months, string $status): array
    {
        $none = ['state' => '', 'due' => null];

        if ($months <= 0 || $status !== 'publicado' || empty($published)) {
            return $none;
        }

        $base = strtotime($published);
        if ($base === false) {
            return $none;
        }

        $due = strtotime('+' . $months . ' months', $base);
        if ($due === false) {
            return $none;
        }

        $now = time();
        if ($due < $now) {
            return ['state' => 'vencido', 'due' => $due];
        }

        $window = self::EXPIRY_WINDOW_DAYS * 86400;
        return [
            'state' => ($due - $now) <= $window ? 'avencer' : 'emdia',
            'due'   => $due,
        ];
    }

    /**
     * Código derivado. Vazio enquanto não houver tipo + sequencial.
     */
    public function getCode(): string
    {
        if (empty($this->fields['doctype']) || empty($this->fields['sequence'])) {
            return '';
        }
        return sprintf(
            '%s%04d:%02d',
            $this->fields['doctype'],
            (int) $this->fields['sequence'],
            (int) ($this->fields['revision'] ?? 0)
        );
    }

    public function prepareInputForAdd($input)
    {
        /** @var \DBmysql $DB */
        global $DB;

        $input = $this->sanitizeInput($input);

        // Sequencial contínuo por tipo, gerado na primeira gravação.
        if (!empty($input['doctype']) && empty($input['sequence'])) {
            $max = 0;
            foreach ($DB->request([
                'SELECT' => 'sequence',
                'FROM'   => self::getTable(),
                'WHERE'  => ['doctype' => $input['doctype']],
                'ORDER'  => 'sequence DESC',
                'LIMIT'  => 1,
            ]) as $row) {
                $max = (int) $row['sequence'];
            }
            $input['sequence'] = $max + 1;
        }

        return $this->handlePublishDate($input);
    }

    public function prepareInputForUpdate($input)
    {
        $input = $this->sanitizeInput($input);
        return $this->handlePublishDate($input);
    }

    /**
     * Normaliza tipo/status para os valores permitidos.
     */
    private function sanitizeInput(array $input): array
    {
        if (isset($input['doctype']) && !in_array($input['doctype'], self::DOCTYPE_KEYS, true)) {
            $input['doctype'] = '';
        }
        if (isset($input['status']) && !in_array($input['status'], self::STATUS_KEYS, true)) {
            $input['status'] = 'rascunho';
        }
        return $input;
    }

    /**
     * Carimba a data-base de vencimento na primeira vez que vira "publicado".
     */
    private function handlePublishDate(array $input): array
    {
        $becoming_published = (($input['status'] ?? '') === 'publicado');
        $already_stamped    = !empty($this->fields['date_published']);

        if ($becoming_published && !$already_stamped && empty($input['date_published'])) {
            $input['date_published'] = $_SESSION['glpi_currenttime'] ?? date('Y-m-d H:i:s');
        }

        return $input;
    }

    // ---------------------------------------------------------------------
    // Aba na ficha nativa do KnowbaseItem
    // ---------------------------------------------------------------------

    public function getTabNameForItem(CommonGLPI $item, $withtemplate = 0)
    {
        if ($item instanceof KnowbaseItem && !$item->isNewItem()) {
            return self::getTypeName();
        }
        return '';
    }

    public static function displayTabContentForItem(CommonGLPI $item, $tabnum = 1, $withtemplate = 0)
    {
        if ($item instanceof KnowbaseItem) {
            self::showForKnowbaseItem($item);
        }
        return true;
    }

    /**
     * Formulário dos metadados dentro da aba. Usa os helpers nativos
     * (Dropdown / User::dropdown) para combinar com o visual da ficha.
     */
    public static function showForKnowbaseItem(KnowbaseItem $kb): void
    {
        /** @var array $CFG_GLPI */
        global $CFG_GLPI;

        $meta    = self::getForKnowbaseItem($kb->getID());
        $canedit = $kb->canUpdateItem();
        $code    = $meta->getCode();

        echo "<div class='codexplus-meta-tab'>";

        // Faixa do código derivado.
        echo "<div class='codexplus-meta-code'>";
        echo "<span class='codexplus-meta-code-label'>"
            . __('Código do documento', 'codexplus') . "</span>";
        if ($code !== '') {
            echo "<span class='codexplus-meta-code-value'>"
                . htmlescape($code) . "</span>";
        } else {
            echo "<span class='codexplus-meta-code-empty'>"
                . __('será gerado ao salvar com um tipo', 'codexplus') . "</span>";
        }
        echo "</div>";

        echo "<form method='post' action='"
            . htmlescape($CFG_GLPI['root_doc'] . '/plugins/codexplus/front/documentmeta.form.php') . "'>";
        echo Html::hidden('knowbaseitems_id', ['value' => $kb->getID()]);

        echo "<table class='tab_cadre_fixe'>";

        // Tipo
        echo "<tr class='tab_bg_1'><td width='32%'>" . __('Tipo', 'codexplus') . "</td><td>";
        if ($canedit) {
            Dropdown::showFromArray('doctype', self::getDoctypes(), [
                'value'               => $meta->fields['doctype'] ?? '',
                'display_emptychoice' => true,
            ]);
        } else {
            echo htmlescape($meta->fields['doctype'] ?: '—');
        }
        echo "</td></tr>";

        // Status
        echo "<tr class='tab_bg_1'><td>" . __('Status', 'codexplus') . "</td><td>";
        if ($canedit) {
            Dropdown::showFromArray('status', self::getStatuses(), [
                'value' => $meta->fields['status'] ?: 'rascunho',
            ]);
        } else {
            echo htmlescape($meta->fields['status'] ?: '—');
        }
        echo "</td></tr>";

        // Responsável
        echo "<tr class='tab_bg_1'><td>" . __('Responsável', 'codexplus') . "</td><td>";
        if ($canedit) {
            User::dropdown([
                'name'   => 'users_id_owner',
                'value'  => $meta->fields['users_id_owner'] ?? 0,
                'right'  => 'all',
                'entity' => $_SESSION['glpiactive_entity'] ?? 0,
            ]);
        } else {
            $owner = (int) ($meta->fields['users_id_owner'] ?? 0);
            echo htmlescape($owner ? getUserName($owner) : '—');
        }
        echo "</td></tr>";

        // Validade
        echo "<tr class='tab_bg_1'><td>"
            . __('Validade (meses — 0 = não vence, caso das propostas)', 'codexplus')
            . "</td><td>";
        $validity = (int) ($meta->fields['validity_months'] ?? self::DEFAULT_VALIDITY_MONTHS);
        if ($canedit) {
            echo "<input type='number' min='0' name='validity_months' value='" . $validity
                . "' class='form-control'>";
        } else {
            echo $validity;
        }
        echo "</td></tr>";

        // Revisão
        echo "<tr class='tab_bg_1'><td>" . __('Revisão', 'codexplus') . "</td><td>";
        $revision = (int) ($meta->fields['revision'] ?? 0);
        if ($canedit) {
            echo "<input type='number' min='0' name='revision' value='" . $revision
                . "' class='form-control'>";
            echo "<div class='codexplus-meta-hint'>"
                . __('Suba a revisão só ao publicar uma versão de propósito — o histórico nativo já registra cada alteração.', 'codexplus')
                . "</div>";
        } else {
            echo $revision;
        }
        echo "</td></tr>";

        // Cliente (relevante só para Proposta)
        echo "<tr class='tab_bg_1'><td>" . __('Cliente (somente Proposta)', 'codexplus') . "</td><td>";
        if ($canedit) {
            echo "<input type='text' name='client_name' value='"
                . htmlescape($meta->fields['client_name'] ?? '')
                . "' class='form-control'>";
        } else {
            echo htmlescape(($meta->fields['client_name'] ?? '') !== '' ? $meta->fields['client_name'] : '—');
        }
        echo "</td></tr>";

        if ($canedit) {
            echo "<tr class='tab_bg_2'><td colspan='2' class='center'>";
            echo Html::hidden('_glpi_csrf_token', ['value' => Session::getNewCSRFToken()]);
            echo "<button type='submit' name='save' class='btn btn-primary'>"
                . __('Salvar', 'codexplus') . "</button>";
            echo "</td></tr>";
        }

        echo "</table>";
        echo "</form>";
        echo "</div>";
    }
}
