<?php

namespace GlpiPlugin\Codexplus;

/**
 * Mapa de calor Wi-Fi — catálogo (bloco Q8-2, Claudio 05/10/2026).
 *
 * Dois cadastros da instalação, usados pelo quadro Mapa de calor (Q8-4):
 *
 *  - MODELOS DE AP: fabricante, modelo e, por faixa (2,4 / 5 / 6 GHz), se
 *    o rádio existe, a potência máxima (dBm) e o ganho da antena (dBi),
 *    tirados do datasheet. Só antena omnidirecional de teto por enquanto.
 *  - PERFIS DE APARELHO: o lado do cliente (celular, notebook…): potência
 *    de transmissão por faixa e um GANHO EFETIVO único (antena do aparelho
 *    + perda da mão e do corpo, por isso negativo). Um perfil é o padrão:
 *    o mapa abre com ele.
 *
 * Modelo é dado da instalação, nunca semente do Install (achado 137): as
 * duas tabelas nascem vazias. Os perfis de referência entram só pelo botão
 * "Carregar perfis de referência" (loadReferenceProfiles), que o
 * administrador aciona.
 *
 * O quadro guarda uma CÓPIA dos valores no próprio AP (como os ícones da
 * instalação, Q4a): editar ou excluir daqui não muda documento já feito.
 *
 * Quem gerencia: config UPDATE, a mesma regra das Marcas. Não é CommonDBTM
 * (sem tela nem histórico próprios), como Brand e IconLibrary.
 */
class WifiCatalog
{
    /** Faixas, na ordem de exibição: chave => rótulo. */
    public const BANDS = ['24' => '2,4 GHz', '5' => '5 GHz', '6' => '6 GHz'];

    /**
     * Padrão Wi-Fi do AP (Claudio, 05/10/2026). Não muda o alcance (quem
     * muda é a faixa, a potência e a antena): vai para o cadastro, a lista e
     * o documento. Só 6E, 7 e 8 operam em 6 GHz. Padrão novo = uma linha.
     */
    public const STANDARDS = [
        'wifi4'  => ['Wi-Fi 4',  '802.11n',  false],
        'wifi5'  => ['Wi-Fi 5',  '802.11ac', false],
        'wifi6'  => ['Wi-Fi 6',  '802.11ax', false],
        'wifi6e' => ['Wi-Fi 6E', '802.11ax', true],
        'wifi7'  => ['Wi-Fi 7',  '802.11be', true],
        'wifi8'  => ['Wi-Fi 8',  '802.11bn', true],
    ];
    public const STANDARD_DEFAULT = 'wifi6';

    /** @return array<string, string> chave => "Wi-Fi 7 (802.11be)" */
    public static function standardOptions(): array
    {
        $o = [];
        foreach (self::STANDARDS as $k => [$lbl, $ieee]) {
            $o[$k] = $lbl . ' (' . $ieee . ')';
        }
        return $o;
    }

    /** Potência: 0 a 36 dBm (36 dBm é o teto de EIRP comum em 2,4 GHz). */
    public const TX_MIN = 0.0;
    public const TX_MAX = 36.0;
    /** Ganho da antena do AP. */
    public const GAIN_MIN = -10.0;
    public const GAIN_MAX = 20.0;
    /** Ganho efetivo do aparelho (antena + corpo): sempre perto ou abaixo de 0. */
    public const DEV_GAIN_MIN = -20.0;
    public const DEV_GAIN_MAX = 10.0;

    /**
     * Perfis de referência (Claudio, 05/10/2026): calibrados contra os mapas
     * do Cambium da Teckcomp (LOJ0687). O ganho efetivo negativo é a antena
     * pequena + mão/corpo; a margem de projeto entra no motor (Q8-3).
     * [nome, [tx 2,4, tx 5, tx 6] (null = não tem a faixa), ganho, padrão]
     */
    public const REFERENCE_PROFILES = [
        ['Celular',            [15, 14, 14],     -8, true],
        ['Notebook',           [18, 17, 17],     -3, false],
        ['Smart TV',           [15, 14, null],   -5, false],
        ['Câmera / IoT Wi-Fi', [13, null, null], -5, false],
    ];

    public static function modelsTable(): string
    {
        return Install::WIFI_MODELS_TABLE;
    }

    public static function profilesTable(): string
    {
        return Install::WIFI_PROFILES_TABLE;
    }

    // ---------------------------------------------------------------------
    // Regras de valor (fonte única)
    // ---------------------------------------------------------------------

    /** Número com vírgula ou ponto, limitado e arredondado a 0,5. null = vazio/inválido. */
    public static function num($v, float $min, float $max): ?float
    {
        $s = trim(str_replace(',', '.', (string) $v));
        if ($s === '' || !is_numeric($s)) {
            return null;
        }
        $n = round(((float) $s) * 2) / 2;
        return max($min, min($max, $n));
    }

    /** 24.0 → "24"; 5.5 → "5,5"; -8.0 → "−8" (sinal de menos tipográfico). */
    public static function fmt(?float $n): string
    {
        if ($n === null) {
            return '';
        }
        $s = rtrim(rtrim(number_format(abs($n), 1, ',', ''), '0'), ',');
        return ($n < 0 ? '−' : '') . $s;
    }

    // ---------------------------------------------------------------------
    // Modelos de AP
    // ---------------------------------------------------------------------

    /** @return array<int, array> */
    public static function models(): array
    {
        global $DB;
        if (!$DB->tableExists(self::modelsTable())) {
            return [];
        }
        $out = [];
        foreach ($DB->request(['FROM' => self::modelsTable(), 'ORDER' => ['vendor ASC', 'name ASC', 'id ASC']]) as $r) {
            $out[] = self::modelRow($r);
        }
        return $out;
    }

    public static function model(int $id): ?array
    {
        global $DB;
        if ($id <= 0 || !$DB->tableExists(self::modelsTable())) {
            return null;
        }
        $r = $DB->request(['FROM' => self::modelsTable(), 'WHERE' => ['id' => $id]])->current();
        return $r ? self::modelRow($r) : null;
    }

    private static function modelRow(array $r): array
    {
        $m = [
            'id'     => (int) $r['id'],
            'vendor' => (string) $r['vendor'],
            'name'   => (string) $r['name'],
            'bands'  => [],
        ];
        $std = (string) ($r['standard'] ?? '');
        $m['standard']     = isset(self::STANDARDS[$std]) ? $std : self::STANDARD_DEFAULT;
        $m['standard_lbl'] = self::STANDARDS[$m['standard']][0];
        $m['label'] = trim($m['vendor'] . ' ' . $m['name']);
        foreach (array_keys(self::BANDS) as $b) {
            $on = (int) $r['has_' . $b] === 1;
            $m['bands'][$b] = [
                'on'   => $on,
                'tx'   => $on ? (float) $r['tx_' . $b] : null,
                'gain' => $on ? (float) $r['gain_' . $b] : null,
            ];
            $m['bands'][$b]['txf']   = self::fmt($m['bands'][$b]['tx']);
            $m['bands'][$b]['gainf'] = self::fmt($m['bands'][$b]['gain']);
        }
        return $m;
    }

    /**
     * Grava modelo novo ou existente. Regras: modelo obrigatório; ao menos
     * uma faixa; faixa marcada exige potência e ganho; fabricante + modelo
     * não se repetem.
     *
     * @return array{0:bool,1:string,2:int}
     */
    public static function saveModel(array $in): array
    {
        global $DB;
        $vendor = mb_substr(trim((string) ($in['vendor'] ?? '')), 0, 80);
        $name   = mb_substr(trim((string) ($in['name'] ?? '')), 0, 120);
        if ($name === '') {
            return [false, __('Informe o modelo do AP.', 'codexplus'), 0];
        }
        $std = (string) ($in['standard'] ?? '');
        if (!isset(self::STANDARDS[$std])) {
            $std = self::STANDARD_DEFAULT;
        }
        $f = ['vendor' => $vendor, 'name' => $name, 'standard' => $std];
        $any = false;
        foreach (self::BANDS as $b => $lbl) {
            $on = !empty($in['has_' . $b]);
            $tx = self::num($in['tx_' . $b] ?? '', self::TX_MIN, self::TX_MAX);
            $g  = self::num($in['gain_' . $b] ?? '', self::GAIN_MIN, self::GAIN_MAX);
            if ($on && ($tx === null || $g === null)) {
                return [false, sprintf(__('Informe a potência e o ganho da antena em %s (ou desmarque a faixa).', 'codexplus'), $lbl), 0];
            }
            $f['has_' . $b]  = $on ? 1 : 0;
            $f['tx_' . $b]   = $on ? $tx : 0;
            $f['gain_' . $b] = $on ? $g : 0;
            $any = $any || $on;
        }
        if (!$any) {
            return [false, __('Marque ao menos uma faixa (2,4, 5 ou 6 GHz).', 'codexplus'), 0];
        }
        if ($f['has_6'] && !self::STANDARDS[$std][2]) {
            return [false, sprintf(__('%s não opera em 6 GHz: escolha Wi-Fi 6E, 7 ou 8, ou desmarque 6 GHz.', 'codexplus'), self::STANDARDS[$std][0]), 0];
        }
        $id = (int) ($in['id'] ?? 0);
        foreach (self::models() as $o) {
            if ($o['id'] !== $id && mb_strtolower($o['vendor']) === mb_strtolower($vendor) && mb_strtolower($o['name']) === mb_strtolower($name)) {
                return [false, __('Já existe um modelo com esse fabricante e esse nome.', 'codexplus'), 0];
            }
        }
        $f['date_mod'] = self::now();
        if ($id > 0) {
            if (self::model($id) === null) {
                return [false, __('Modelo não encontrado.', 'codexplus'), 0];
            }
            $DB->update(self::modelsTable(), $f, ['id' => $id]);
        } else {
            $f['date_creation'] = self::now();
            $DB->insert(self::modelsTable(), $f);
            $id = (int) $DB->insertId();
        }
        return [true, __('Modelo salvo.', 'codexplus'), $id];
    }

    /**
     * Exclui. Sempre pode: o quadro guarda uma cópia dos valores no AP.
     *
     * @return array{0:bool,1:string}
     */
    public static function deleteModel(int $id): array
    {
        global $DB;
        if (self::model($id) === null) {
            return [false, __('Modelo não encontrado.', 'codexplus')];
        }
        $DB->delete(self::modelsTable(), ['id' => $id]);
        return [true, __('Modelo excluído. Mapas já feitos continuam com os valores que tinham.', 'codexplus')];
    }

    // ---------------------------------------------------------------------
    // Perfis de aparelho
    // ---------------------------------------------------------------------

    /** @return array<int, array> o padrão primeiro */
    public static function profiles(): array
    {
        global $DB;
        if (!$DB->tableExists(self::profilesTable())) {
            return [];
        }
        $out = [];
        foreach ($DB->request(['FROM' => self::profilesTable(), 'ORDER' => ['is_default DESC', 'name ASC', 'id ASC']]) as $r) {
            $out[] = self::profileRow($r);
        }
        return $out;
    }

    public static function profile(int $id): ?array
    {
        global $DB;
        if ($id <= 0 || !$DB->tableExists(self::profilesTable())) {
            return null;
        }
        $r = $DB->request(['FROM' => self::profilesTable(), 'WHERE' => ['id' => $id]])->current();
        return $r ? self::profileRow($r) : null;
    }

    private static function profileRow(array $r): array
    {
        $p = [
            'id'         => (int) $r['id'],
            'name'       => (string) $r['name'],
            'gain'       => (float) $r['gain'],
            'is_default' => (int) $r['is_default'] === 1,
            'bands'      => [],
        ];
        $p['gainf'] = self::fmt($p['gain']);
        foreach (array_keys(self::BANDS) as $b) {
            $on = (int) $r['has_' . $b] === 1;
            $p['bands'][$b] = ['on' => $on, 'tx' => $on ? (float) $r['tx_' . $b] : null];
            $p['bands'][$b]['txf'] = self::fmt($p['bands'][$b]['tx']);
        }
        return $p;
    }

    /** @return array{0:bool,1:string,2:int} */
    public static function saveProfile(array $in): array
    {
        global $DB;
        $name = mb_substr(trim((string) ($in['name'] ?? '')), 0, 80);
        if ($name === '') {
            return [false, __('Informe o nome do perfil.', 'codexplus'), 0];
        }
        $gain = self::num($in['gain'] ?? '', self::DEV_GAIN_MIN, self::DEV_GAIN_MAX);
        if ($gain === null) {
            return [false, __('Informe o ganho efetivo do aparelho (ex.: −8).', 'codexplus'), 0];
        }
        $f = ['name' => $name, 'gain' => $gain];
        $any = false;
        foreach (self::BANDS as $b => $lbl) {
            $on = !empty($in['has_' . $b]);
            $tx = self::num($in['tx_' . $b] ?? '', self::TX_MIN, self::TX_MAX);
            if ($on && $tx === null) {
                return [false, sprintf(__('Informe a potência do aparelho em %s (ou desmarque a faixa).', 'codexplus'), $lbl), 0];
            }
            $f['has_' . $b] = $on ? 1 : 0;
            $f['tx_' . $b]  = $on ? $tx : 0;
            $any = $any || $on;
        }
        if (!$any) {
            return [false, __('Marque ao menos uma faixa (2,4, 5 ou 6 GHz).', 'codexplus'), 0];
        }
        $id = (int) ($in['id'] ?? 0);
        foreach (self::profiles() as $o) {
            if ($o['id'] !== $id && mb_strtolower($o['name']) === mb_strtolower($name)) {
                return [false, __('Já existe um perfil com esse nome.', 'codexplus'), 0];
            }
        }
        $f['date_mod'] = self::now();
        if ($id > 0) {
            if (self::profile($id) === null) {
                return [false, __('Perfil não encontrado.', 'codexplus'), 0];
            }
            $DB->update(self::profilesTable(), $f, ['id' => $id]);
        } else {
            $f['is_default']    = self::profiles() === [] ? 1 : 0;
            $f['date_creation'] = self::now();
            $DB->insert(self::profilesTable(), $f);
            $id = (int) $DB->insertId();
        }
        if (!empty($in['is_default'])) {
            self::setDefaultProfile($id);
        }
        return [true, __('Perfil salvo.', 'codexplus'), $id];
    }

    public static function setDefaultProfile(int $id): void
    {
        global $DB;
        if (self::profile($id) === null) {
            return;
        }
        $DB->update(self::profilesTable(), ['is_default' => 0], ['NOT' => ['id' => $id]]);
        $DB->update(self::profilesTable(), ['is_default' => 1, 'date_mod' => self::now()], ['id' => $id]);
    }

    /**
     * Exclui. Saindo o padrão, o primeiro por nome assume (o mapa sempre
     * tem com que abrir enquanto houver perfil).
     *
     * @return array{0:bool,1:string}
     */
    public static function deleteProfile(int $id): array
    {
        global $DB;
        $p = self::profile($id);
        if ($p === null) {
            return [false, __('Perfil não encontrado.', 'codexplus')];
        }
        $DB->delete(self::profilesTable(), ['id' => $id]);
        if ($p['is_default']) {
            $rest = self::profiles();
            if ($rest !== []) {
                self::setDefaultProfile($rest[0]['id']);
            }
        }
        return [true, __('Perfil excluído.', 'codexplus')];
    }

    /**
     * Botão "Carregar perfis de referência": cria os que faltam (pelo nome,
     * sem diferenciar maiúsculas), não mexe nos que já existem. Repetir não
     * duplica nada. O Celular vira padrão só se ainda não houver padrão.
     *
     * @return array{0:bool,1:string}
     */
    public static function loadReferenceProfiles(): array
    {
        $have = [];
        foreach (self::profiles() as $p) {
            $have[mb_strtolower($p['name'])] = true;
        }
        $n = 0;
        foreach (self::REFERENCE_PROFILES as [$name, $tx, $gain, $def]) {
            if (isset($have[mb_strtolower($name)])) {
                continue;
            }
            $in = ['name' => $name, 'gain' => $gain];
            foreach (array_keys(self::BANDS) as $i => $b) {
                if ($tx[$i] !== null) {
                    $in['has_' . $b] = 1;
                    $in['tx_' . $b]  = $tx[$i];
                }
            }
            [$ok, , $id] = self::saveProfile($in);
            if ($ok) {
                $n++;
                if ($def && !self::hasDefaultOtherThan($id)) {
                    self::setDefaultProfile($id);
                }
            }
        }
        return [true, $n > 0
            ? sprintf(__('%d perfil(is) de referência carregado(s).', 'codexplus'), $n)
            : __('Os perfis de referência já estavam todos cadastrados.', 'codexplus')];
    }

    private static function hasDefaultOtherThan(int $id): bool
    {
        foreach (self::profiles() as $p) {
            if ($p['is_default'] && $p['id'] !== $id) {
                return true;
            }
        }
        return false;
    }

    /**
     * Q8-4a: o que o quadro Mapa de calor precisa, enxuto (ajax/wifi.catalog.php).
     * Faixas com chave texto ('24', '5', '6'), só as que existem.
     */
    public static function forBoard(): array
    {
        $bandsOf = static function (array $bands, bool $withGain): array {
            $o = [];
            foreach ($bands as $b => $v) {
                if (!$v['on']) {
                    continue;
                }
                $o[(string) $b] = $withGain ? ['tx' => $v['tx'], 'gain' => $v['gain']] : ['tx' => $v['tx']];
            }
            return $o;
        };
        return [
            'models' => array_map(static fn ($m) => [
                'id'    => $m['id'],
                'label' => $m['label'],
                'std'   => $m['standard'],
                'std_l' => $m['standard_lbl'],
                'bands' => $bandsOf($m['bands'], true),
            ], self::models()),
            'profiles' => array_map(static fn ($p) => [
                'id'      => $p['id'],
                'name'    => $p['name'],
                'gain'    => $p['gain'],
                'default' => $p['is_default'],
                'bands'   => $bandsOf($p['bands'], false),
            ], self::profiles()),
        ];
    }

    private static function now(): string
    {
        return $_SESSION['glpi_currenttime'] ?? date('Y-m-d H:i:s');
    }
}
