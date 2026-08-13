<?php

namespace GlpiPlugin\Codexplus;

use Config as GlpiConfig;

/**
 * Codex+ — configuração de marca do documento (Etapa 4a).
 *
 * POR QUE SEM TABELA PRÓPRIA: Config::setConfigurationValues() do núcleo já
 * faz upsert em glpi_configs por contexto (src/Config.php:1490 do 11.0.6).
 * Criar uma tabela satélite só para meia dúzia de chaves seria schema a mais
 * para manter, migrar e desinstalar, sem ganho nenhum.
 *
 * POR QUE O LOGO NÃO VAI NO REPOSITÓRIO: o logo é dado da INSTÂNCIA, não do
 * plugin. Se morasse em plugins/codexplus/public/, todo `unzip -o` de um
 * deploy novo o apagaria, e o arquivo acabaria versionado no git por
 * acidente. Ele vai para GLPI_PLUGIN_DOC_DIR (= GLPI_VAR_DIR/_plugins,
 * ver Glpi\Application\SystemConfigurator:109), que é área gravável de
 * dados e sobrevive a qualquer atualização do plugin.
 *
 * CONSEQUÊNCIA: como o roteador do GLPI 11 só serve estáticos de
 * plugins/<nome>/public/, um arquivo em _plugins/ NÃO tem URL direta.
 * Por isso existe front/logo.send.php, que lê o arquivo e o devolve.
 */
class Branding
{
    /** Contexto usado em glpi_configs. */
    public const CONTEXT = 'plugin:codexplus';

    /** Subpasta dentro de GLPI_PLUGIN_DOC_DIR. */
    public const LOGO_DIR = 'codexplus';

    /** Tamanho máximo aceito no upload do logo (bytes). */
    public const LOGO_MAX_BYTES = 2097152; // 2 MB

    /**
     * Extensões aceitas => tipo MIME devolvido ao servir.
     *
     * SVG está fora DE PROPÓSITO: SVG é XML executável e servi-lo inline
     * abriria XSS. PNG com transparência resolve o caso de uso.
     */
    public const LOGO_TYPES = [
        'png'  => 'image/png',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
    ];

    /**
     * Valores padrão. Toda chave gravável precisa estar aqui — save() usa
     * este array como lista branca, então campo que não estiver listado é
     * simplesmente ignorado no POST.
     */
    public const DEFAULTS = [
        // Identificação
        'company_name'           => '',
        'logo_filename'          => '',

        // Cabeçalho (posição e tamanho do logo; sem texto livre, para não
        // permitir cabeçalho que empurre o conteúdo para fora da margem)
        'header_show_logo'       => '1',
        'header_logo_position'   => 'right',   // right | left
        'header_logo_height'     => '14',      // mm
        'header_repeat'          => '1',       // logo em todas as páginas

        // Título
        'title_uppercase'        => '1',

        // Rodapé (texto livre com marcadores)
        'footer_show'            => '1',
        'footer_text'            => '{codigo} · rev. {revisao}',
        'footer_show_pagination' => '1',
    ];

    /**
     * Marcadores aceitos no texto do rodapé.
     * Chave => descrição exibida na tela de configuração.
     */
    public static function getMarkers(): array
    {
        return [
            '{codigo}'  => __('Código do documento (ex.: POP0014)', 'codexplus'),
            '{revisao}' => __('Revisão com 2 dígitos (ex.: 01)', 'codexplus'),
            '{titulo}'  => __('Título do documento', 'codexplus'),
            '{empresa}' => __('Nome da empresa configurado acima', 'codexplus'),
            '{data}'    => __('Data da última atualização', 'codexplus'),
            '{pagina}'  => __('Número da página', 'codexplus'),
            '{total}'   => __('Total de páginas', 'codexplus'),
        ];
    }

    public static function getLogoPositions(): array
    {
        return [
            'right' => __('Canto superior direito', 'codexplus'),
            'left'  => __('Canto superior esquerdo', 'codexplus'),
        ];
    }

    /**
     * Devolve a configuração completa, já com os padrões aplicados para as
     * chaves ainda não gravadas.
     */
    public static function getAll(): array
    {
        $stored = GlpiConfig::getConfigurationValues(self::CONTEXT);
        $out    = [];

        foreach (self::DEFAULTS as $key => $default) {
            $out[$key] = array_key_exists($key, $stored) && $stored[$key] !== null
                ? (string) $stored[$key]
                : $default;
        }

        return $out;
    }

    public static function get(string $key): string
    {
        $all = self::getAll();
        return $all[$key] ?? '';
    }

    /**
     * Grava a configuração. Só as chaves de DEFAULTS são aceitas.
     * Caixas de seleção não enviam nada quando desmarcadas, então cada
     * chave booleana é normalizada explicitamente para '0' ou '1'.
     */
    public static function save(array $input): void
    {
        $booleans = [
            'header_show_logo',
            'header_repeat',
            'title_uppercase',
            'footer_show',
            'footer_show_pagination',
        ];

        $values = [];

        foreach (self::DEFAULTS as $key => $default) {
            if ($key === 'logo_filename') {
                continue; // gerenciado só por storeLogo()/deleteLogo()
            }

            if (in_array($key, $booleans, true)) {
                $values[$key] = !empty($input[$key]) ? '1' : '0';
                continue;
            }

            if (!array_key_exists($key, $input)) {
                continue;
            }

            $values[$key] = (string) $input[$key];
        }

        // Altura do logo: entre 6 e 30 mm. Fora disso o cabeçalho come a
        // primeira linha do conteúdo ou vira um selo minúsculo.
        if (isset($values['header_logo_height'])) {
            $h = (int) $values['header_logo_height'];
            $values['header_logo_height'] = (string) max(6, min(30, $h ?: 14));
        }

        if (
            isset($values['header_logo_position'])
            && !array_key_exists($values['header_logo_position'], self::getLogoPositions())
        ) {
            $values['header_logo_position'] = 'right';
        }

        // Nome da empresa e rodapé são texto livre: guarda cru, escapa na
        // exibição (o Twig escapa por padrão; o JS do PDF escapa também).
        if (isset($values['company_name'])) {
            $values['company_name'] = trim($values['company_name']);
        }
        if (isset($values['footer_text'])) {
            $values['footer_text'] = trim($values['footer_text']);
        }

        GlpiConfig::setConfigurationValues(self::CONTEXT, $values);
    }

    // ---------------------------------------------------------------------
    // Logo
    // ---------------------------------------------------------------------

    /** Pasta onde o logo é guardado, criada sob demanda. */
    public static function getLogoDir(): string
    {
        return GLPI_PLUGIN_DOC_DIR . '/' . self::LOGO_DIR;
    }

    /** Caminho absoluto do logo, ou null se não houver nenhum gravado. */
    public static function getLogoPath(): ?string
    {
        $name = self::get('logo_filename');
        if ($name === '') {
            return null;
        }

        // basename() defensivo: mesmo vindo da nossa própria config, nunca
        // deixar o nome escapar da pasta.
        $path = self::getLogoDir() . '/' . basename($name);

        return is_file($path) ? $path : null;
    }

    public static function hasLogo(): bool
    {
        return self::getLogoPath() !== null;
    }

    /**
     * URL para exibir o logo. O parâmetro `v` é só quebra-cache: o nome do
     * arquivo é sempre o mesmo, então sem isso o navegador mostraria o logo
     * antigo depois de uma troca.
     */
    public static function getLogoUrl(): string
    {
        global $CFG_GLPI;

        $path = self::getLogoPath();
        if ($path === null) {
            return '';
        }

        return $CFG_GLPI['root_doc']
            . '/plugins/codexplus/front/logo.send.php?v='
            . (int) @filemtime($path);
    }

    /** Tipo MIME do logo gravado (para o cabeçalho HTTP e o data URI). */
    public static function getLogoMime(): string
    {
        $name = self::get('logo_filename');
        $ext  = strtolower(pathinfo($name, PATHINFO_EXTENSION));

        return self::LOGO_TYPES[$ext] ?? 'application/octet-stream';
    }

    /**
     * Recebe o $_FILES['logo'] e grava. Devolve [bool ok, string mensagem].
     *
     * A validação NÃO confia na extensão nem no MIME declarado pelo
     * navegador: getimagesize() lê o cabeçalho binário do arquivo. Um .php
     * renomeado para .png não passa.
     */
    public static function storeLogo(array $file): array
    {
        if (!isset($file['error']) || $file['error'] === UPLOAD_ERR_NO_FILE) {
            return [false, __('Nenhum arquivo enviado.', 'codexplus')];
        }

        if ($file['error'] !== UPLOAD_ERR_OK) {
            return [false, __('Falha no envio do arquivo.', 'codexplus')];
        }

        if (($file['size'] ?? 0) > self::LOGO_MAX_BYTES) {
            return [false, __('O arquivo passa de 2 MB.', 'codexplus')];
        }

        $info = @getimagesize($file['tmp_name']);
        if ($info === false) {
            return [false, __('O arquivo não é uma imagem válida.', 'codexplus')];
        }

        $ext = match ($info[2]) {
            IMAGETYPE_PNG  => 'png',
            IMAGETYPE_JPEG => 'jpg',
            default        => null,
        };

        if ($ext === null) {
            return [false, __('Formato não aceito. Use PNG (de preferência com fundo transparente) ou JPG.', 'codexplus')];
        }

        $dir = self::getLogoDir();
        if (!is_dir($dir) && !@mkdir($dir, 0o775, true) && !is_dir($dir)) {
            return [false, sprintf(__('Não foi possível criar a pasta %s.', 'codexplus'), $dir)];
        }

        // Remove um logo anterior de extensão diferente, senão ficariam
        // logo.png e logo.jpg convivendo e o antigo virava lixo órfão.
        self::purgeLogoFiles();

        $filename = 'logo.' . $ext;
        $dest     = $dir . '/' . $filename;

        if (!@move_uploaded_file($file['tmp_name'], $dest)) {
            return [false, __('Não foi possível gravar o arquivo no servidor.', 'codexplus')];
        }

        @chmod($dest, 0o664);

        GlpiConfig::setConfigurationValues(self::CONTEXT, ['logo_filename' => $filename]);

        return [
            true,
            sprintf(
                __('Logo enviado (%1$s × %2$s px).', 'codexplus'),
                (int) $info[0],
                (int) $info[1]
            ),
        ];
    }

    public static function deleteLogo(): void
    {
        self::purgeLogoFiles();
        GlpiConfig::setConfigurationValues(self::CONTEXT, ['logo_filename' => '']);
    }

    private static function purgeLogoFiles(): void
    {
        $dir = self::getLogoDir();
        foreach (array_keys(self::LOGO_TYPES) as $ext) {
            $f = $dir . '/logo.' . $ext;
            if (is_file($f)) {
                @unlink($f);
            }
        }
    }
}
