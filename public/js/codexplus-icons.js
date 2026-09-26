/* =========================================================================
   Codex+ — ícones do quadro (bloco Q1, Claudio 26/09/2026)
   -------------------------------------------------------------------------
   Conjunto PRÓPRIO do Codex+ (sem biblioteca de terceiros), no padrão
   combinado: viewBox 0 0 48 48, área útil 44, traço 2 arredondado,
   preenchimento claro + traço/detalhes na cor da categoria, sem texto.
   Câmeras apontam para a DIREITA (o cone de visão sai do meio da borda
   direita). {F} = preenchimento, {S} = traço da categoria, {G} = LED.
   Ícone novo: acrescente uma linha em LIST; nada no motor muda.
   ========================================================================= */
(function () {
    'use strict';

    var CATS = {
        rede:      { label: 'Rede',                    F: '#E6F1FB', S: '#185FA5' },
        nucleo:    { label: 'Núcleo e servidores',     F: '#EEEDFE', S: '#534AB7' },
        seguranca: { label: 'Segurança e CFTV',        F: '#FAECE7', S: '#993C1D' },
        estacao:   { label: 'Estações e periféricos',  F: '#E1F5EE', S: '#0F6E56' },
        infra:     { label: 'Infraestrutura e energia', F: '#F1EFE8', S: '#5F5E5A' },
        protecao:  { label: 'Proteção',                F: '#FCEBEB', S: '#A32D2D' }
    };

    var A = ' fill="{F}" stroke="{S}" stroke-width="2" stroke-linejoin="round"';   // corpo
    var L = ' fill="none" stroke="{S}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'; // linha
    var D = ' fill="{S}"';                                                          // detalhe

    /* [id, nome, categoria, palavras de busca, cone?, desenho] */
    var LIST = [
        ['switch', 'Switch', 'rede', 'switch comutador lan poe', false,
            '<rect x="4" y="17" width="40" height="14" rx="2"' + A + '/>' +
            '<rect x="8" y="22" width="4" height="4"' + D + '/><rect x="14" y="22" width="4" height="4"' + D + '/>' +
            '<rect x="20" y="22" width="4" height="4"' + D + '/><rect x="26" y="22" width="4" height="4"' + D + '/>' +
            '<rect x="32" y="22" width="4" height="4"' + D + '/><circle cx="40" cy="24" r="1.8" fill="{G}"/>'],
        ['patch-panel', 'Patch panel', 'rede', 'patch panel painel conectores rack', false,
            '<rect x="4" y="18" width="40" height="12" rx="2"' + A + '/>' +
            '<g fill="none" stroke="{S}" stroke-width="1.4"><rect x="8" y="22" width="4" height="4"/><rect x="14" y="22" width="4" height="4"/>' +
            '<rect x="20" y="22" width="4" height="4"/><rect x="26" y="22" width="4" height="4"/><rect x="32" y="22" width="4" height="4"/>' +
            '<rect x="38" y="22" width="3" height="4"/></g>'],
        ['roteador', 'Roteador', 'rede', 'roteador router gateway', false,
            '<path d="M14 24V10M34 24V10"' + L + '/><rect x="6" y="24" width="36" height="14" rx="3"' + A + '/>' +
            '<circle cx="14" cy="31" r="1.8"' + D + '/><circle cx="20" cy="31" r="1.8"' + D + '/><circle cx="26" cy="31" r="1.8" fill="{G}"/>'],
        ['access-point', 'Access point (Wi-Fi)', 'rede', 'access point ap wifi wi-fi sem fio', false,
            '<ellipse cx="24" cy="33" rx="16" ry="6"' + A + '/>' +
            '<path d="M14 21a14 14 0 0 1 20 0M18.5 25.5a7 7 0 0 1 11 0"' + L + '/><circle cx="24" cy="29" r="1.8"' + D + '/>'],
        ['ponto-rede', 'Ponto de rede (RJ45)', 'rede', 'ponto rede tomada rj45 lógica', false,
            '<rect x="10" y="10" width="28" height="28" rx="3"' + A + '/>' +
            '<path d="M18 19h12v10h-3v3h-6v-3h-3z"' + L + '/>'],
        ['onu', 'Modem / ONT', 'rede', 'modem ont onu fibra provedor', false,
            '<rect x="6" y="18" width="36" height="16" rx="3"' + A + '/>' +
            '<circle cx="13" cy="26" r="1.8"' + D + '/><circle cx="19" cy="26" r="1.8"' + D + '/><circle cx="25" cy="26" r="1.8" fill="{G}"/>' +
            '<path d="M32 26h6"' + L + '/>'],
        ['rack', 'Rack', 'rede', 'rack armário gabinete', false,
            '<rect x="12" y="4" width="24" height="40" rx="2"' + A + '/>' +
            '<path d="M12 13h24M12 22h24M12 31h24"' + L + '/>' +
            '<circle cx="31" cy="8.5" r="1.5" fill="{G}"/><circle cx="31" cy="17.5" r="1.5" fill="{G}"/><circle cx="31" cy="26.5" r="1.5" fill="{G}"/>'],
        ['switch-core', 'Switch core', 'nucleo', 'switch core núcleo distribuição', false,
            '<rect x="4" y="12" width="40" height="11" rx="2"' + A + '/><rect x="4" y="25" width="40" height="11" rx="2"' + A + '/>' +
            '<g' + D + '><rect x="8" y="16" width="4" height="3"/><rect x="14" y="16" width="4" height="3"/><rect x="20" y="16" width="4" height="3"/>' +
            '<rect x="8" y="29" width="4" height="3"/><rect x="14" y="29" width="4" height="3"/><rect x="20" y="29" width="4" height="3"/></g>'],
        ['servidor', 'Servidor', 'nucleo', 'servidor server', false,
            '<rect x="14" y="4" width="20" height="40" rx="2"' + A + '/>' +
            '<path d="M14 17h20M14 30h20M18 10.5h8M18 23.5h8M18 36.5h8"' + L + '/>' +
            '<circle cx="30" cy="10.5" r="1.6" fill="{G}"/><circle cx="30" cy="23.5" r="1.6" fill="{G}"/><circle cx="30" cy="36.5" r="1.6" fill="{G}"/>'],
        ['storage', 'Storage / NAS', 'nucleo', 'storage nas backup discos', false,
            '<rect x="8" y="10" width="32" height="28" rx="2"' + A + '/>' +
            '<path d="M15 15v18M22 15v18M29 15v18"' + L + '/><circle cx="35" cy="33" r="1.6" fill="{G}"/>'],
        ['camera-bullet', 'Câmera bullet', 'seguranca', 'câmera camera bullet cftv', true,
            '<path d="M14 28v8H7"' + L + '/><rect x="6" y="16" width="26" height="12" rx="3"' + A + '/>' +
            '<path d="M32 19l9-3v14l-9-3z"' + A + '/><circle cx="12" cy="22" r="2"' + D + '/>'],
        ['camera-dome', 'Câmera dome', 'seguranca', 'câmera camera dome cftv teto', true,
            '<rect x="8" y="13" width="32" height="6" rx="2"' + A + '/><path d="M12 19a12 12 0 0 0 24 0z"' + A + '/>' +
            '<circle cx="28" cy="25" r="3"' + D + '/>'],
        ['camera-ptz', 'Câmera PTZ', 'seguranca', 'câmera camera ptz speed dome giratória', true,
            '<rect x="19" y="4" width="10" height="5" rx="1"' + A + '/><path d="M24 9v5"' + L + '/>' +
            '<circle cx="24" cy="27" r="12"' + A + '/><circle cx="31" cy="27" r="4"' + D + '/>'],
        ['nvr', 'NVR / DVR', 'seguranca', 'nvr dvr gravador cftv', false,
            '<rect x="4" y="16" width="40" height="16" rx="2"' + A + '/><rect x="9" y="20" width="13" height="8" rx="1"' + D + '/>' +
            '<circle cx="33" cy="24" r="2" fill="{G}"/><circle cx="38" cy="24" r="1.5"' + D + '/>'],
        ['sensor', 'Sensor', 'seguranca', 'sensor presença alarme ivp', false,
            '<circle cx="24" cy="24" r="14"' + A + '/><path d="M18 20a8 8 0 0 1 12 0M20.5 24a4 4 0 0 1 7 0"' + L + '/><circle cx="24" cy="28" r="2"' + D + '/>'],
        ['controle-acesso', 'Controle de acesso', 'seguranca', 'controle acesso leitor biometria catraca', false,
            '<rect x="14" y="5" width="20" height="38" rx="3"' + A + '/><rect x="18" y="9" width="12" height="8" rx="1"' + D + '/>' +
            '<g' + D + '><circle cx="19" cy="23" r="1.5"/><circle cx="24" cy="23" r="1.5"/><circle cx="29" cy="23" r="1.5"/>' +
            '<circle cx="19" cy="29" r="1.5"/><circle cx="24" cy="29" r="1.5"/><circle cx="29" cy="29" r="1.5"/>' +
            '<circle cx="19" cy="35" r="1.5"/><circle cx="24" cy="35" r="1.5"/><circle cx="29" cy="35" r="1.5"/></g>'],
        ['fechadura', 'Fechadura', 'seguranca', 'fechadura eletroímã trava porta', false,
            '<path d="M17 22v-6a7 7 0 0 1 14 0v6"' + L + '/><rect x="12" y="22" width="24" height="19" rx="3"' + A + '/>' +
            '<circle cx="24" cy="30" r="2.5"' + D + '/><path d="M24 32v4"' + L + '/>'],
        ['sirene', 'Sirene', 'seguranca', 'sirene alarme', false,
            '<rect x="10" y="34" width="28" height="6" rx="2"' + A + '/><path d="M14 34v-8a10 10 0 0 1 20 0v8"' + A + '/>' +
            '<path d="M24 7v4M9 13l3 3M39 13l-3 3"' + L + '/>'],
        ['pc', 'Computador', 'estacao', 'computador pc desktop estação', false,
            '<rect x="3" y="10" width="30" height="21" rx="2"' + A + '/><path d="M18 31v5M12 38h12"' + L + '/>' +
            '<rect x="36" y="10" width="9" height="28" rx="1.5"' + A + '/><circle cx="40.5" cy="15" r="1.4" fill="{G}"/>'],
        ['notebook', 'Notebook', 'estacao', 'notebook laptop', false,
            '<rect x="10" y="10" width="28" height="20" rx="2"' + A + '/><path d="M4 34h40l-3 4H7z"' + A + '/>'],
        ['monitor', 'Monitor', 'estacao', 'monitor tela', false,
            '<rect x="4" y="8" width="40" height="26" rx="2"' + A + '/><path d="M24 34v5M16 41h16"' + L + '/>'],
        ['impressora', 'Impressora', 'estacao', 'impressora multifuncional printer', false,
            '<rect x="14" y="5" width="20" height="11"' + A + '/><rect x="5" y="16" width="38" height="17" rx="2"' + A + '/>' +
            '<rect x="14" y="27" width="20" height="13" fill="#fff" stroke="{S}" stroke-width="2"/><circle cx="37" cy="21" r="1.6" fill="{G}"/>'],
        ['pdv', 'PDV / caixa', 'estacao', 'pdv caixa ponto de venda frente de loja', false,
            '<rect x="11" y="5" width="26" height="16" rx="2"' + A + '/><path d="M24 21v6"' + L + '/>' +
            '<rect x="5" y="27" width="38" height="14" rx="2"' + A + '/><path d="M19 34h10"' + L + '/>'],
        ['leitor', 'Leitor de código', 'estacao', 'leitor código barras scanner', false,
            '<path d="M6 14h26l8 7v4H26l-4 15h-8l3-15H6z"' + A + '/><path d="M40 18l4-2M40 23h5M40 27l4 2"' + L + '/>'],
        ['telefone-ip', 'Telefone IP', 'estacao', 'telefone ip voip ramal', false,
            '<path d="M10 14c0-5 28-5 28 0v3h-7v-3c0-2-14-2-14 0v3h-7z"' + A + '/><rect x="8" y="22" width="32" height="19" rx="3"' + A + '/>' +
            '<g' + D + '><circle cx="17" cy="28" r="1.5"/><circle cx="24" cy="28" r="1.5"/><circle cx="31" cy="28" r="1.5"/>' +
            '<circle cx="17" cy="34" r="1.5"/><circle cx="24" cy="34" r="1.5"/><circle cx="31" cy="34" r="1.5"/></g>'],
        ['tv', 'TV / painel', 'estacao', 'tv televisão painel videowall', false,
            '<rect x="4" y="9" width="40" height="25" rx="2"' + A + '/><path d="M14 34l-3 5M34 34l3 5"' + L + '/>'],
        ['totem', 'Totem', 'estacao', 'totem autoatendimento quiosque', false,
            '<rect x="15" y="4" width="18" height="36" rx="3"' + A + '/><rect x="18" y="8" width="12" height="14" rx="1"' + D + '/>' +
            '<path d="M11 44h26"' + L + '/>'],
        ['internet', 'Internet', 'infra', 'internet nuvem link provedor wan', false,
            '<path d="M14 36h21a8 8 0 0 0 1-16 11 11 0 0 0-21-2A8 8 0 0 0 14 36z"' + A + '/>'],
        ['nobreak', 'Nobreak', 'infra', 'nobreak ups energia', false,
            '<rect x="12" y="6" width="24" height="36" rx="3"' + A + '/><path d="M26 12l-6 11h5l-3 9 7-12h-5z"' + D + '/>' +
            '<circle cx="18" cy="37" r="1.5" fill="{G}"/>'],
        ['tomada', 'Tomada elétrica', 'infra', 'tomada elétrica energia', false,
            '<rect x="10" y="10" width="28" height="28" rx="4"' + A + '/><circle cx="24" cy="24" r="9"' + L + '/>' +
            '<circle cx="20.5" cy="24" r="1.8"' + D + '/><circle cx="27.5" cy="24" r="1.8"' + D + '/>'],
        ['quadro-eletrico', 'Quadro elétrico', 'infra', 'quadro elétrico disjuntor distribuição', false,
            '<rect x="8" y="5" width="32" height="38" rx="2"' + A + '/>' +
            '<g' + D + '><rect x="13" y="12" width="5" height="9" rx="1"/><rect x="21.5" y="12" width="5" height="9" rx="1"/><rect x="30" y="12" width="5" height="9" rx="1"/></g>' +
            '<path d="M26 26l-5 8h4l-2 6 6-9h-4z"' + D + '/>'],
        ['antena', 'Rádio / enlace', 'infra', 'antena rádio enlace ptp', false,
            '<path d="M24 16v26M17 42h14"' + L + '/><circle cx="24" cy="13" r="3"' + A + '/>' +
            '<path d="M16 7a11 11 0 0 0 0 12M32 7a11 11 0 0 1 0 12M12 4a16 16 0 0 0 0 18M36 4a16 16 0 0 1 0 18"' + L + '/>'],
        ['generico', 'Equipamento genérico', 'infra', 'genérico outro equipamento item', false,
            '<rect x="7" y="12" width="34" height="24" rx="3"' + A + '/><path d="M13 20h14M13 26h9"' + L + '/>' +
            '<circle cx="34" cy="24" r="3"' + D + '/>'],
        ['firewall', 'Firewall', 'protecao', 'firewall utm segurança borda', false,
            '<rect x="4" y="10" width="40" height="28" rx="2"' + A + '/>' +
            '<path d="M4 19.5h40M4 28.5h40M17 10v9.5M31 10v9.5M10 19.5v9M24 19.5v9M38 19.5v9M17 28.5V38M31 28.5V38" fill="none" stroke="{S}" stroke-width="1.6" stroke-linecap="round"/>']
    ];

    var BY_ID = {};
    LIST.forEach(function (r) {
        BY_ID[r[0]] = { id: r[0], name: r[1], cat: r[2], search: r[3], cone: r[4], body: r[5] };
    });

    /** Desenho do ícone (miolo de um <svg viewBox="0 0 48 48">) na cor da categoria. */
    function body(id, catOverride) {
        var ic = BY_ID[id] || BY_ID.generico;
        var c = CATS[catOverride || ic.cat] || CATS.infra;
        return ic.body.replace(/\{F\}/g, c.F).replace(/\{S\}/g, c.S).replace(/\{G\}/g, '#1D9E75');
    }

    window.CodexplusIcons = { CATS: CATS, LIST: LIST, get: function (id) { return BY_ID[id] || null; }, body: body };
})();
