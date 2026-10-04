<?php

namespace GlpiPlugin\Codexplus;

use Notification;
use NotificationTarget;

/**
 * Notificações do documento Codex+ (Etapa 7, bloco 7b — Claudio, 04/10/2026).
 *
 * Eventos do alerta de vencimento (ExpiryAlert, 7a): a vencer, vencido e
 * revisão atrasada. Aparecem em Configurar > Notificações como qualquer
 * notificação do GLPI: modelo editável, destinatários ajustáveis e liga ou
 * desliga sem mexer no código. Na Teckcomp as notificações por e-mail ficam
 * desligadas (Claudio): pronto para instalações de terceiros.
 *
 * Destinatários próprios: responsável, revisor e auditor do documento (os
 * mesmos do 7a); os genéricos do GLPI (administrador, perfil, grupo)
 * continuam disponíveis.
 *
 * O GLPI acha esta classe pelo nome: itemtype GlpiPlugin\Codexplus\Document
 * -> GlpiPlugin\Codexplus\NotificationTargetDocument.
 */
class NotificationTargetDocument extends NotificationTarget
{
    public const EVENT_SOON   = 'codexplus_avencer';
    public const EVENT_DUE    = 'codexplus_vencido';
    public const EVENT_REVIEW = 'codexplus_revisao';

    public const TARGET_OWNER    = 1301;
    public const TARGET_REVIEWER = 1302;
    public const TARGET_AUDITOR  = 1303;

    /** Evento da notificação por tipo de alerta do 7a. */
    public const EVENT_OF = [
        ExpiryAlert::KIND_SOON   => self::EVENT_SOON,
        ExpiryAlert::KIND_DUE    => self::EVENT_DUE,
        ExpiryAlert::KIND_REVIEW => self::EVENT_REVIEW,
    ];

    public function getEvents()
    {
        return [
            self::EVENT_SOON   => __('Codex+: documento a vencer', 'codexplus'),
            self::EVENT_DUE    => __('Codex+: documento vencido', 'codexplus'),
            self::EVENT_REVIEW => __('Codex+: revisão atrasada', 'codexplus'),
        ];
    }

    public function addAdditionalTargets($event = '')
    {
        $this->addTarget(self::TARGET_OWNER, __('Responsável do documento', 'codexplus'));
        $this->addTarget(self::TARGET_REVIEWER, __('Revisor do documento', 'codexplus'));
        $this->addTarget(self::TARGET_AUDITOR, __('Auditor do documento', 'codexplus'));
    }

    public function addSpecificTargets($data, $options)
    {
        if ((int) $data['type'] !== Notification::USER_TYPE) {
            return;
        }
        $campo = [
            self::TARGET_OWNER    => 'users_id_owner',
            self::TARGET_REVIEWER => 'users_id_reviewer',
            self::TARGET_AUDITOR  => 'users_id_auditor',
        ][(int) $data['items_id']] ?? null;
        if ($campo !== null && (int) ($this->obj->fields[$campo] ?? 0) > 0) {
            $this->addUserByField($campo);
        }
    }

    public function addDataForTemplate($event, $options = [])
    {
        $doc  = $this->obj;
        $due  = (string) ($options['due'] ?? '');
        $sit  = [
            self::EVENT_SOON   => [__('a vencer', 'codexplus'), __('Vence em', 'codexplus')],
            self::EVENT_DUE    => [__('vencido', 'codexplus'), __('Venceu em', 'codexplus')],
            self::EVENT_REVIEW => [__('com a revisão atrasada', 'codexplus'), __('Prazo da revisão', 'codexplus')],
        ][$event] ?? ['', ''];
        $times = (int) ($options['times'] ?? 1);
        $url   = '/plugins/codexplus/front/document.form.php?id=' . (int) $doc->fields['id'];

        $this->data['##document.code##']      = $doc instanceof Document ? $doc->getCode() : '';
        $this->data['##document.name##']      = (string) ($doc->fields['name'] ?? '');
        $this->data['##document.type##']      = (string) ($doc->fields['doctype'] ?? '');
        $this->data['##document.situation##'] = $sit[0];
        $this->data['##document.datelabel##'] = $sit[1];
        $this->data['##document.date##']      = $due !== '' ? date('d/m/Y', (int) strtotime($due)) : '';
        // Só a partir do 2º aviso (lembrete semanal do vencido e da revisão).
        $this->data['##document.reminder##']  = $times > 1 ? (string) $times : '';
        $this->data['##document.url##']       = $this->formatURL($options['additionnaloption']['usertype'] ?? self::GLPI_USER, $url);

        $this->getTags();
        foreach ($this->tag_descriptions[NotificationTarget::TAG_LANGUAGE] as $tag => $values) {
            if (!isset($this->data[$tag])) {
                $this->data[$tag] = $values['label'];
            }
        }
    }

    public function getTags()
    {
        $tags = [
            'document.code'      => __('Código', 'codexplus'),
            'document.name'      => __('Nome', 'codexplus'),
            'document.type'      => __('Tipo', 'codexplus'),
            'document.situation' => __('Situação', 'codexplus'),
            'document.datelabel' => __('Rótulo da data', 'codexplus'),
            'document.date'      => __('Data (vencimento ou prazo da revisão)', 'codexplus'),
            'document.reminder'  => __('Nº do lembrete (vazio no 1º aviso)', 'codexplus'),
            'document.url'       => __('Link do documento', 'codexplus'),
        ];
        foreach ($tags as $tag => $label) {
            $this->addTagToList(['tag' => $tag, 'label' => $label, 'value' => true]);
        }
        asort($this->tag_descriptions);
    }
}
