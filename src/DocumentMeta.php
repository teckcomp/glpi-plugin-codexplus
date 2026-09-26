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
    public const DOCTYPE_KEYS = ['POP', 'PSG', 'MAN', 'PRP', 'LAU', 'DTC', 'DIV', 'DIA'];

    /**
     * Tipos que só existem no MODELO NOVO (Document). O fluxo antigo de
     * "Novo documento" (artigo da Base de Conhecimento) não os oferece.
     * DIA: diagrama institucional, Etapa 9 (0.6.7). LAU, DTC e DIV: bloco T1
     * (Claudio, 24/09/2026), nascem só no modelo novo.
     */
    public const NEW_MODEL_ONLY = ['LAU', 'DTC', 'DIV', 'DIA'];

    /**
     * Cliente (bloco T1, Claudio, 24/09/2026). Proposta: texto livre (o
     * cliente pode ainda não estar cadastrado). Laudo e Documentação
     * Técnica: VÍNCULO com um usuário ou uma entidade do GLPI, conforme a
     * configuração da instalação (Branding::clientSource). O vínculo é só um
     * dado do documento: não dá leitura a ninguém.
     */
    public const CLIENT_TEXT_TYPES = ['PRP'];
    public const CLIENT_LINK_TYPES = ['LAU', 'DTC'];

    public static function linksClient(string $doctype): bool
    {
        return in_array($doctype, self::CLIENT_LINK_TYPES, true);
    }

    /** O tipo tem cliente (em texto ou vinculado)? */
    public static function hasClient(string $doctype): bool
    {
        return self::linksClient($doctype) || in_array($doctype, self::CLIENT_TEXT_TYPES, true);
    }

    /**
     * Validade padrão por tipo, em meses (Claudio, 20/09/2026). 0 = não
     * vence. Proposta e Documento Diverso: definida por quem publica (ainda
     * não implementado: até lá, 0). Laudo não vence: registra um momento;
     * um laudo novo é outro documento. Documentação Técnica: 12, como o POP
     * (bloco T1, Claudio, 24/09/2026). Tipo fora da lista:
     * DEFAULT_VALIDITY_MONTHS.
     */
    public const VALIDITY_BY_TYPE = [
        'POP' => 12, 'PSG' => 12, 'MAN' => 6, 'PRP' => 0,
        'LAU' => 0, 'DTC' => 12, 'DIV' => 0, 'DIA' => 3,
    ];

    public static function defaultValidity(string $doctype): int
    {
        return self::VALIDITY_BY_TYPE[$doctype] ?? self::DEFAULT_VALIDITY_MONTHS;
    }

    /**
     * Fluxo de publicação por tipo (bloco P2, Claudio, 26/09/2026):
     *   - full: responsável aprova, auditor audita (POP, PSG, Manual e os
     *     demais por enquanto);
     *   - one: só o responsável aprova, com revisor e revisão periódica
     *     (Documentação Técnica);
     *   - direct: o responsável publica direto, sem auditor, revisor nem
     *     revisão periódica (Proposta e Laudo).
     */
    public const FLOW_FULL   = 'full';
    public const FLOW_ONE    = 'one';
    public const FLOW_DIRECT = 'direct';
    public const FLOW_BY_TYPE = ['DTC' => self::FLOW_ONE, 'PRP' => self::FLOW_DIRECT, 'LAU' => self::FLOW_DIRECT];

    public static function flowOf(string $doctype): string
    {
        return self::FLOW_BY_TYPE[$doctype] ?? self::FLOW_FULL;
    }

    /** Tipos (separados por espaço) que usam o fluxo informado ou algum da lista. */
    public static function typesWithFlow(array $flows): string
    {
        return implode(' ', array_filter(
            array_keys(self::getDoctypes()),
            static fn ($t) => in_array(self::flowOf((string) $t), $flows, true)
        ));
    }

    /** Tipos oferecidos pelo fluxo antigo (artigo da Base de Conhecimento). */
    public static function getLegacyDoctypes(): array
    {
        return array_diff_key(self::getDoctypes(), array_flip(self::NEW_MODEL_ONLY));
    }
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
            'LAU' => __('LAU — Laudo Técnico', 'codexplus'),
            'DTC' => __('DTC — Documentação Técnica', 'codexplus'),
            'DIV' => __('DIV — Documento Diverso', 'codexplus'),
            'DIA' => __('DIA — Diagrama', 'codexplus'),
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
            'LAU' => __('Laudo', 'codexplus'),
            'DTC' => __('Doc. técnica', 'codexplus'),
            'DIV' => __('Diverso', 'codexplus'),
            'DIA' => __('Diagrama', 'codexplus'),
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
            'LAU' => __('Laudo Técnico', 'codexplus'),
            'DTC' => __('Documentação Técnica', 'codexplus'),
            'DIV' => __('Documento Diverso', 'codexplus'),
            'DIA' => __('Diagrama institucional', 'codexplus'),
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
    public static function expiryState(?string $published, int $months, string $status, ?string $reviewEnd = null): array
    {
        $none = ['state' => '', 'due' => null];

        if ($status !== 'publicado') {
            return $none;
        }

        // R3d: documento do modelo novo com janela de revisão vence no FIM da
        // janela (fim do dia), que pode ter sido ajustado à mão. Sem janela,
        // a regra antiga: publicação + validade em meses.
        if (!empty($reviewEnd)) {
            $due = strtotime(substr($reviewEnd, 0, 10) . ' 23:59:59');
        } else {
            if ($months <= 0 || empty($published)) {
                return $none;
            }
            $base = strtotime($published);
            if ($base === false) {
                return $none;
            }
            $due = strtotime('+' . $months . ' months', $base);
        }
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

    /**
     * Código SEM o sufixo de revisão (ex.: `POP0014`, sem `:01`) — Etapa 4f.
     * getCode() já embute a revisão; usá-lo na Área 3 do cabeçalho estruturado
     * duplicaria a informação ao lado do valor de revisão mostrado em
     * separado (`POP0014:01 · rev. 01`). Mesma condição de vazio de getCode().
     */
    public function getBareCode(): string
    {
        if (empty($this->fields['doctype']) || empty($this->fields['sequence'])) {
            return '';
        }
        return sprintf('%s%04d', $this->fields['doctype'], (int) $this->fields['sequence']);
    }

    public function prepareInputForAdd($input)
    {
        $input = self::sanitizeFields($input);

        // Sequencial contínuo por tipo, gerado na primeira gravação.
        if (!empty($input['doctype']) && empty($input['sequence'])) {
            $input['sequence'] = self::nextSequence((string) $input['doctype']);
        }

        return self::stampPublishDate($input, $this->fields['date_published'] ?? null);
    }

    public function prepareInputForUpdate($input)
    {
        $input = self::sanitizeFields($input);
        return self::stampPublishDate($input, $this->fields['date_published'] ?? null);
    }

    // ---------------------------------------------------------------------
    // Regras do documento controlado — FONTE ÚNICA (Etapa R3a)
    //
    // Estáticas e públicas porque a classe Document (R3a) grava na MESMA
    // tabela e precisa das mesmas regras. Até a R5 as duas classes convivem;
    // regra copiada nas duas é como o sequencial começa a repetir número.
    // ---------------------------------------------------------------------

    /**
     * Próximo sequencial do tipo. Conta TODAS as linhas da tabela (artigos
     * antigos e documentos próprios): o sequencial é um só por tipo.
     */
    public static function nextSequence(string $doctype): int
    {
        /** @var \DBmysql $DB */
        global $DB;

        $max = 0;
        foreach ($DB->request([
            'SELECT' => 'sequence',
            'FROM'   => Install::DOCUMENTS_TABLE,
            'WHERE'  => ['doctype' => $doctype],
            'ORDER'  => 'sequence DESC',
            'LIMIT'  => 1,
        ]) as $row) {
            $max = (int) $row['sequence'];
        }
        return $max + 1;
    }

    /**
     * Normaliza tipo/status para os valores permitidos.
     *
     * @param ?array $statusKeys status aceitos (padrão: os do modelo antigo;
     *                           Document passa os seus, com "validacao")
     */
    public static function sanitizeFields(array $input, ?array $statusKeys = null): array
    {
        $statusKeys ??= self::STATUS_KEYS;
        if (isset($input['doctype']) && !in_array($input['doctype'], self::DOCTYPE_KEYS, true)) {
            $input['doctype'] = '';
        }
        if (isset($input['status']) && !in_array($input['status'], $statusKeys, true)) {
            $input['status'] = 'rascunho';
        }
        return $input;
    }

    /**
     * Carimba a data-base de vencimento na primeira vez que vira "publicado".
     *
     * @param ?string $currentPublished date_published já gravado (null/'' = nunca publicado)
     */
    public static function stampPublishDate(array $input, ?string $currentPublished): array
    {
        $becoming_published = (($input['status'] ?? '') === 'publicado');
        $already_stamped    = !empty($currentPublished);

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
