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
     * JSON de #codexplus-print-config (contrato com public/js/codexplus.js):
     * a marca vem daqui, o documento vem de quem chama. Criado na R3b3-2 para
     * a página do documento do modelo novo. front/article.php (modelo antigo)
     * ainda monta o seu igual, à mão: sai na R5 com a base nativa.
     *
     * Chaves de $document: title, code, revision, client, date_mod, doctype,
     * owner, date_published, header_html, footer_text; opcionais sector e
     * draft (aviso na linha de identificação quando não é a versão vigente).
     * As flags JSON_HEX_* não são opcionais (achado 14).
     */
    public static function printConfig(array $document): string
    {
        $json = json_encode(
            [
                'brand'    => [
                    'company'      => self::get('company_name'),
                    'logo_url'     => self::getLogoUrl(),
                    'show_logo'    => self::get('header_show_logo') === '1',
                    'repeat_logo'  => self::get('header_repeat') === '1',
                    'logo_pos'     => self::get('header_logo_position'),
                    'logo_mm'      => (int) self::get('header_logo_height'),
                    'title_upper'  => self::get('title_uppercase') === '1',
                    'footer_show'  => self::get('footer_show') === '1',
                    'footer_text'  => self::get('footer_text'),
                    'footer_pages' => self::get('footer_show_pagination') === '1',
                ],
                'document' => $document,
            ],
            JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
        );
        return $json !== false ? $json : '{}';
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

        // Altura do logo: entre 6 e 40 mm. Fora disso o cabeçalho come a
        // primeira linha do conteúdo ou vira um selo minúsculo.
        if (isset($values['header_logo_height'])) {
            $h = (int) $values['header_logo_height'];
            // Teto subiu de 30 para 40mm nesta correção: uma logo de 138px de
            // altura nativa (~36,5mm a 96dpi) passava do teto antigo. Segue
            // sendo um valor fixo por página (não a altura nativa da imagem
            // em si) — a arquitetura de altura de cabeçalho constante
            // (achado 17, CONTEXTO.md) continua exigindo um teto, só mais alto.
            $values['header_logo_height'] = (string) max(6, min(40, $h ?: 14));
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

    // ---------------------------------------------------------------------
    // Cabeçalho estruturado por documento (Etapa 4f)
    // ---------------------------------------------------------------------

    /**
     * Área 3 do cabeçalho — dados automáticos, fixos, sem opção de
     * configuração (decisão explícita do usuário, Etapa 4f: nada de
     * campo/tela para isso). Reaproveitada tanto na prévia somente-leitura
     * da tela de edição (front/article.form.php, GET) quanto na marcação
     * final gravada por composeHeaderHtml() — fonte única, evita compor o
     * mesmo texto em dois lugares com uma pequena diferença um dia.
     *
     * $bareCode vem de DocumentMeta::getBareCode() (sem sufixo de revisão —
     * a revisão já aparece ao lado, separada). Documento ainda sem tipo
     * classificado (sequencial não gerado) mostra só a data.
     */
    public static function composeArea3(string $bareCode, string $revision2, string $dateStr): string
    {
        return $bareCode !== ''
            ? sprintf('%s · rev. %s · %s', $bareCode, $revision2, $dateStr)
            : $dateStr;
    }

    /**
     * Marcação do cabeçalho estruturado (Etapa 4f): título + logo lado a
     * lado (linha 1) e Área 3 (linha 2). Substitui getDefaultHeaderHtml()
     * da Etapa 4e — o cabeçalho deixou de ser semeado-e-editável-livremente
     * por TinyMCE; passa a ser sempre RECOMPOSTO por inteiro no salvamento
     * (front/article.form.php) e na criação (front/newdocument.form.php),
     * nunca editado à mão. Continua sendo gravado na mesma coluna
     * `header_html` e lido pelo mesmo pipeline até o PDF (Etapa 4e,
     * `cfg.document.header_html` em codexplus.js) — nenhuma mudança ali.
     *
     * As classes `cx-header-*` têm CSS próprio tanto no PDF
     * (buildPageCss() em codexplus.js, variante `.cx-page-header--doc`)
     * quanto na prévia da tela de edição (public/css/codexplus.css) — os
     * nomes de classe são o único contrato entre esta função e os dois.
     */
    public static function composeHeaderHtml(
        string $title,
        string $bareCode,
        string $revision2,
        string $dateStr
    ): string {
        $logoImg = '';
        if (self::hasLogo()) {
            $height = (int) self::get('header_logo_height');
            $height = $height > 0 ? $height : 14;
            $logoImg = '<img class="cx-header-logo" src="' . htmlescape(self::getLogoUrl())
                . '" alt="" style="height:' . $height . 'mm;">';
        }

        return '<div class="cx-header-row cx-header-row-1">'
            . '<span class="cx-header-title">' . htmlescape($title) . '</span>'
            . $logoImg
            . '</div>'
            . '<div class="cx-header-row cx-header-row-2">'
            . htmlescape(self::composeArea3($bareCode, $revision2, $dateStr))
            . '</div>';
    }
}
