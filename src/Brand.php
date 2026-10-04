<?php

namespace GlpiPlugin\Codexplus;

use Session;

/**
 * Marcas (bloco M-1, Claudio 04/10/2026).
 *
 * Um grupo de empresas de um mesmo dono, numa entidade só do GLPI, produz
 * documentos em nome de várias marcas. Cada marca tem:
 *  - name      nome da empresa (marcador {empresa});
 *  - logo      arquivo próprio, em GLPI_PLUGIN_DOC_DIR/codexplus/brands/;
 *  - logo_mm   altura da logo no cabeçalho (logos de proporções diferentes
 *              precisam de alturas diferentes);
 *  - color     cor principal: título, filete e títulos do PDF e do Word.
 *              Sugerida no navegador a partir da logo (codexplus-brand.js),
 *              editável; aqui só se confere o formato.
 * Uma marca é a padrão: o documento novo nasce com ela (M-2) e, até o M-2,
 * é a que sai em todo PDF.
 *
 * Ficam GLOBAIS em Branding (são o formato do documento, não a marca):
 * posição e repetição da logo, caixa alta, rodapé.
 *
 * Não é CommonDBTM: sem tela nem histórico próprios (como IconLibrary).
 * Quem gerencia: quem configura o Codex+ (config UPDATE), a mesma regra da
 * tela de configuração.
 */
class Brand
{
    public const DIR = 'brands';
    public const DEFAULT_COLOR = '#0c447c';
    public const MIN_MM = 6;
    public const MAX_MM = 40;

    public static function table(): string
    {
        return Install::BRANDS_TABLE;
    }

    /** @return array<int, array> marcas, a padrão primeiro */
    public static function all(): array
    {
        global $DB;
        if (!$DB->tableExists(self::table())) {
            return [];
        }
        $out = [];
        foreach ($DB->request(['FROM' => self::table(), 'ORDER' => ['is_default DESC', 'name ASC', 'id ASC']]) as $r) {
            $out[] = self::row($r);
        }
        return $out;
    }

    public static function get(int $id): ?array
    {
        global $DB;
        if ($id <= 0 || !$DB->tableExists(self::table())) {
            return null;
        }
        $r = $DB->request(['FROM' => self::table(), 'WHERE' => ['id' => $id]])->current();
        return $r ? self::row($r) : null;
    }

    /** A marca padrão (ou a primeira, se nenhuma estiver marcada). */
    public static function getDefault(): ?array
    {
        $all = self::all();
        return $all[0] ?? null;
    }

    private static function row(array $r): array
    {
        $b = [
            'id'            => (int) $r['id'],
            'name'          => (string) $r['name'],
            'logo_filename' => (string) $r['logo_filename'],
            'logo_mm'       => self::normalizeMm((int) $r['logo_mm']),
            'color'         => self::normalizeColor((string) $r['color']),
            'is_default'    => (int) $r['is_default'] === 1,
        ];
        $b['has_logo'] = self::logoPath($b) !== null;
        $b['logo_url'] = self::logoUrl($b);
        return $b;
    }

    // ---------------------------------------------------------------------
    // Regras de valor (fonte única)
    // ---------------------------------------------------------------------

    public static function normalizeColor(string $c): string
    {
        $c = strtolower(trim($c));
        return preg_match('/^#[0-9a-f]{6}$/', $c) ? $c : self::DEFAULT_COLOR;
    }

    public static function normalizeMm(int $mm): int
    {
        return max(self::MIN_MM, min(self::MAX_MM, $mm ?: 14));
    }

    // ---------------------------------------------------------------------
    // Logo
    // ---------------------------------------------------------------------

    public static function dir(): string
    {
        return Branding::getLogoDir() . '/' . self::DIR;
    }

    public static function logoPath(array $b): ?string
    {
        $name = (string) ($b['logo_filename'] ?? '');
        if ($name === '') {
            return null;
        }
        $path = self::dir() . '/' . basename($name);
        return is_file($path) ? $path : null;
    }

    public static function logoMime(array $b): string
    {
        $ext = strtolower(pathinfo((string) ($b['logo_filename'] ?? ''), PATHINFO_EXTENSION));
        return Branding::LOGO_TYPES[$ext] ?? 'application/octet-stream';
    }

    /** URL da logo (front/logo.send.php?brand=); `v` só fura o cache na troca. */
    public static function logoUrl(array $b): string
    {
        global $CFG_GLPI;
        $path = self::logoPath($b);
        if ($path === null) {
            return '';
        }
        return $CFG_GLPI['root_doc'] . '/plugins/codexplus/front/logo.send.php?brand='
            . (int) $b['id'] . '&v=' . (int) @filemtime($path);
    }

    /**
     * Confere o arquivo enviado. Não confia em extensão nem no MIME do
     * navegador: getimagesize() lê o binário. Só PNG e JPG (SVG é XML
     * executável — ver Branding::LOGO_TYPES).
     *
     * @return array{0:bool,1:string,2:string} [ok, mensagem, extensão]
     */
    public static function checkUpload(array $file): array
    {
        if (!isset($file['error']) || $file['error'] === UPLOAD_ERR_NO_FILE) {
            return [false, __('Nenhum arquivo enviado.', 'codexplus'), ''];
        }
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return [false, __('Falha no envio do arquivo.', 'codexplus'), ''];
        }
        if (($file['size'] ?? 0) > Branding::LOGO_MAX_BYTES) {
            return [false, __('O arquivo passa de 2 MB.', 'codexplus'), ''];
        }
        $info = @getimagesize($file['tmp_name']);
        if ($info === false) {
            return [false, __('O arquivo não é uma imagem válida.', 'codexplus'), ''];
        }
        $ext = match ($info[2]) {
            IMAGETYPE_PNG  => 'png',
            IMAGETYPE_JPEG => 'jpg',
            default        => '',
        };
        if ($ext === '') {
            return [false, __('Formato não aceito. Use PNG (de preferência com fundo transparente) ou JPG.', 'codexplus'), ''];
        }
        return [true, sprintf(__('Logo enviada (%1$s × %2$s px).', 'codexplus'), (int) $info[0], (int) $info[1]), $ext];
    }

    /** Grava a logo da marca $id (substitui a anterior). @return array{0:bool,1:string} */
    public static function storeLogo(int $id, array $file, bool $uploaded = true): array
    {
        [$ok, $msg, $ext] = self::checkUpload($file);
        if (!$ok) {
            return [false, $msg];
        }
        $dir = self::dir();
        if (!is_dir($dir) && !@mkdir($dir, 0o775, true) && !is_dir($dir)) {
            return [false, sprintf(__('Não foi possível criar a pasta %s.', 'codexplus'), $dir)];
        }
        self::purgeLogoFiles($id);
        $name = 'brand-' . $id . '.' . $ext;
        $dest = $dir . '/' . $name;
        $moved = $uploaded ? @move_uploaded_file($file['tmp_name'], $dest) : @copy($file['tmp_name'], $dest);
        if (!$moved) {
            return [false, __('Não foi possível gravar o arquivo no servidor.', 'codexplus')];
        }
        @chmod($dest, 0o664);
        self::update($id, ['logo_filename' => $name]);
        return [true, $msg];
    }

    public static function deleteLogo(int $id): void
    {
        self::purgeLogoFiles($id);
        self::update($id, ['logo_filename' => '']);
    }

    private static function purgeLogoFiles(int $id): void
    {
        foreach (array_keys(Branding::LOGO_TYPES) as $ext) {
            $f = self::dir() . '/brand-' . $id . '.' . $ext;
            if (is_file($f)) {
                @unlink($f);
            }
        }
    }

    // ---------------------------------------------------------------------
    // Gravação
    // ---------------------------------------------------------------------

    private static function now(): string
    {
        return $_SESSION['glpi_currenttime'] ?? date('Y-m-d H:i:s');
    }

    private static function update(int $id, array $fields): void
    {
        global $DB;
        $fields['date_mod'] = self::now();
        $DB->update(self::table(), $fields, ['id' => $id]);
    }

    /**
     * Cria (sem id) ou altera (com id) uma marca. Nome obrigatório.
     *
     * @return array{0:bool,1:string,2:int} [ok, mensagem, id]
     */
    public static function save(array $input): array
    {
        global $DB;
        $name = trim((string) ($input['name'] ?? ''));
        if ($name === '') {
            return [false, __('Informe o nome da empresa.', 'codexplus'), 0];
        }
        $fields = [
            'name'    => mb_substr($name, 0, 255),
            'logo_mm' => self::normalizeMm((int) ($input['logo_mm'] ?? 14)),
            'color'   => self::normalizeColor((string) ($input['color'] ?? '')),
        ];
        $id = (int) ($input['id'] ?? 0);
        if ($id > 0) {
            if (self::get($id) === null) {
                return [false, __('Marca não encontrada.', 'codexplus'), 0];
            }
            self::update($id, $fields);
        } else {
            $fields['is_default']    = self::all() === [] ? 1 : 0;
            $fields['date_creation'] = self::now();
            $fields['date_mod']      = self::now();
            $DB->insert(self::table(), $fields);
            $id = (int) $DB->insertId();
        }
        if (!empty($input['is_default'])) {
            self::setDefault($id);
        }
        return [true, __('Marca salva.', 'codexplus'), $id];
    }

    public static function setDefault(int $id): void
    {
        global $DB;
        if (self::get($id) === null) {
            return;
        }
        $DB->update(self::table(), ['is_default' => 0], ['NOT' => ['id' => $id]]);
        self::update($id, ['is_default' => 1]);
    }

    /**
     * Exclui. Recusa a padrão (escolha outra antes), a última marca e (M-2)
     * marca usada por documento ou por versão publicada.
     *
     * @return array{0:bool,1:string}
     */
    public static function delete(int $id): array
    {
        global $DB;
        $b = self::get($id);
        if ($b === null) {
            return [false, __('Marca não encontrada.', 'codexplus')];
        }
        if ($b['is_default']) {
            return [false, __('A marca padrão não pode ser excluída. Marque outra como padrão antes.', 'codexplus')];
        }
        if (count(self::all()) <= 1) {
            return [false, __('É preciso ter ao menos uma marca.', 'codexplus')];
        }
        $uso = self::usage($id);
        if ($uso > 0) {
            return [false, sprintf(__('A marca está em %d documento(s) e não pode ser excluída.', 'codexplus'), $uso)];
        }
        self::purgeLogoFiles($id);
        $DB->delete(self::table(), ['id' => $id]);
        return [true, __('Marca excluída.', 'codexplus')];
    }

    /** M-2: documentos (inclusive na lixeira) e versões publicadas com a marca. */
    public static function usage(int $id): int
    {
        global $DB;
        $n = 0;
        foreach ([Install::DOCUMENTS_TABLE, Install::VERSIONS_TABLE] as $t) {
            if ($DB->tableExists($t) && $DB->fieldExists($t, 'plugin_codexplus_brands_id')) {
                $r = $DB->request(['COUNT' => 'cpt', 'FROM' => $t, 'WHERE' => ['plugin_codexplus_brands_id' => $id]])->current();
                $n += (int) ($r['cpt'] ?? 0);
            }
        }
        return $n;
    }

    /**
     * M-2: id de marca válido para gravar no documento. Vazio, 0 ou marca
     * inexistente: a padrão (0 se não houver marca nenhuma).
     */
    public static function resolveId(int $id): int
    {
        if ($id > 0 && self::get($id) !== null) {
            return $id;
        }
        $d = self::getDefault();
        return $d !== null ? (int) $d['id'] : 0;
    }

    /**
     * Primeira marca a partir da configuração antiga (Install, tabela vazia):
     * nome da empresa, altura e uma CÓPIA da logo. A cor é o azul que o PDF
     * sempre usou, para nada mudar até alguém editar a marca.
     */
    public static function seedFromConfig(): void
    {
        global $DB;
        $name = trim(Branding::get('company_name'));
        $DB->insert(self::table(), [
            'name'          => $name !== '' ? mb_substr($name, 0, 255) : 'Marca principal',
            'logo_mm'       => self::normalizeMm((int) Branding::get('header_logo_height')),
            'color'         => self::DEFAULT_COLOR,
            'is_default'    => 1,
            'date_creation' => self::now(),
            'date_mod'      => self::now(),
        ]);
        $id  = (int) $DB->insertId();
        $old = Branding::getLogoPath();
        if ($id > 0 && $old !== null) {
            $tmp = ['error' => UPLOAD_ERR_OK, 'size' => (int) @filesize($old), 'tmp_name' => $old];
            self::storeLogo($id, $tmp, false);
        }
    }

    /**
     * O que a impressão (PDF e Word) usa da marca: a do documento (M-2); id 0
     * ou marca que sumiu, a padrão. Sem marca nenhuma, a configuração antiga.
     *
     * @return array{company:string,logo_url:string,logo_mm:int,color:string}
     */
    public static function forPrint(int $id = 0): array
    {
        $b = ($id > 0 ? self::get($id) : null) ?? self::getDefault();
        if ($b === null) {
            return [
                'company'  => Branding::get('company_name'),
                'logo_url' => Branding::getLogoUrl(),
                'logo_mm'  => (int) Branding::get('header_logo_height'),
                'color'    => self::DEFAULT_COLOR,
            ];
        }
        return [
            'company'  => $b['name'],
            'logo_url' => $b['logo_url'],
            'logo_mm'  => $b['logo_mm'],
            'color'    => $b['color'],
        ];
    }

    /** Quem gerencia marcas: quem configura o Codex+. */
    public static function canManage(): bool
    {
        return Session::haveRight('config', UPDATE);
    }
}
