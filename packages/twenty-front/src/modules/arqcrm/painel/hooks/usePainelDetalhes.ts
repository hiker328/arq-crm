import { useMemo } from 'react';

import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import {
  type RecordGqlOperationFilter,
  type RecordGqlOperationGqlRecordFields,
} from 'twenty-shared/types';
import { type AttentionItem } from '@/arqcrm/painel/components/AttentionList';

// Dados das visualizações detalhadas do painel: curva de recebíveis, rosca de
// propostas por status e a lista "precisa de atenção".
//
// Três consultas, não uma por métrica. O agrupamento por mês é feito em JS
// porque o volume de um escritório de arquitetura é pequeno (dezenas de
// propostas, centenas de parcelas por ano) e trazer os registros uma vez serve
// três visualizações. Se um dia isso crescer, o caminho certo é o `groupBy` da
// API — nunca SQL de agregação à mão, que foi a origem da pior CVE desta base.
//
// Este hook só pode ser montado quando a Application de domínio existe no
// workspace: `useFindManyRecords` chama `useObjectMetadataItem`, que LANÇA se o
// objeto não existir, e `skip` não evita isso. Quem garante a condição é o
// componente que decide renderizar o filho — ver PainelPage.

const DIAS_SEM_RESPOSTA_PARA_ALERTAR = 7;
const LIMITE_ATENCAO = 6;
const MICROS_POR_UNIDADE = 1_000_000;

const ROTULO_MES = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

const STATUS_A_RECEBER = ['PREVISTA', 'A_VENCER', 'VENCIDA'];
const STATUS_PROPOSTA_ABERTA = ['ENVIADA', 'VISUALIZADA'];


// Fora do componente pela MESMA razão do usePainelMetrics: `useFindManyRecordsQuery`
// memoiza o documento GraphQL usando este objeto como dependência. Literal
// inline = documento novo a cada render = refetch em loop.
const CAMPOS_PROPOSTA: RecordGqlOperationGqlRecordFields = {
  enviadaEm: true,
  id: true,
  nome: true,
  status: true,
  valorTotal: true,
};

const CAMPOS_PARCELA: RecordGqlOperationGqlRecordFields = {
  descricao: true,
  id: true,
  recebidaEm: true,
  status: true,
  valor: true,
  valorRecebido: true,
  vencimentoEm: true,
};

const FILTRO_A_RECEBER: RecordGqlOperationFilter = {
  status: { in: STATUS_A_RECEBER },
};

type Dinheiro = { amountMicros?: number | string | null } | null;

type PropostaLeve = {
  __typename: string;
  id: string;
  nome: string | null;
  status: string | null;
  enviadaEm: string | null;
  valorTotal: Dinheiro;
};

type ParcelaLeve = {
  __typename: string;
  id: string;
  descricao: string | null;
  status: string | null;
  vencimentoEm: string | null;
  recebidaEm: string | null;
  valor: Dinheiro;
  valorRecebido: Dinheiro;
};

const formatarBRL = (valorEmMicros: number): string =>
  (valorEmMicros / MICROS_POR_UNIDADE).toLocaleString('pt-BR', {
    currency: 'BRL',
    maximumFractionDigits: 0,
    style: 'currency',
  });

const micros = (valor: Dinheiro): number => {
  const bruto = valor?.amountMicros;

  if (bruto === null || bruto === undefined) return 0;

  const numero = typeof bruto === 'string' ? Number(bruto) : bruto;

  return Number.isFinite(numero) ? numero : 0;
};

// Chave de mês tirada do prefixo "AAAA-MM" da string, sem construir Date.
// `new Date('2026-03-01')` é interpretado como UTC e, em America/Sao_Paulo,
// volta como 28/02 — o que jogaria a parcela para o mês anterior na virada.
const chaveDoMes = (data: string | null): string | null =>
  typeof data === 'string' && data.length >= 7 ? data.slice(0, 7) : null;

const diasDesde = (data: string | null): number | null => {
  if (typeof data !== 'string' || data.length < 10) return null;

  const quando = new Date(data).getTime();

  if (!Number.isFinite(quando)) return null;

  return Math.floor((Date.now() - quando) / 86_400_000);
};

export type PainelDetalhes = {
  isLoading: boolean;
  meses: string[];
  recebidoPorMes: number[];
  previstoPorMes: number[];
  propostasPorStatus: { status: string; quantidade: number; valor: number }[];
  atencao: AttentionItem[];
  /** Total previsto nos próximos meses, para o card de projeção. */
  aReceberMicros: number;
};

export const usePainelDetalhes = (
  mesesNaCurva: number,
): PainelDetalhes => {
  // Janela da curva: primeiro dia do mês, `mesesNaCurva - 1` meses atrás.
  const { inicioIso, meses, chaves } = useMemo(() => {
    const hoje = new Date();
    const chavesDosMeses: string[] = [];
    const rotulos: string[] = [];

    for (let recuo = mesesNaCurva - 1; recuo >= 0; recuo -= 1) {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() - recuo, 1);
      const chave = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, '0')}`;

      chavesDosMeses.push(chave);
      // Com 12 meses, dois "jan" no mesmo eixo seriam ambíguos.
      rotulos.push(
        mesesNaCurva > 6
          ? `${ROTULO_MES[mes.getMonth()]}/${String(mes.getFullYear()).slice(2)}`
          : ROTULO_MES[mes.getMonth()],
      );
    }

    return {
      chaves: chavesDosMeses,
      inicioIso: `${chavesDosMeses[0]}-01`,
      meses: rotulos,
    };
  }, [mesesNaCurva]);

  const propostas = useFindManyRecords<PropostaLeve>({
    limit: 200,
    objectNameSingular: 'proposta',
    recordGqlFields: CAMPOS_PROPOSTA,
  });

  const filtroRecebidas = useMemo(
    () => ({ recebidaEm: { gte: inicioIso } }),
    [inicioIso],
  );

  const recebidas = useFindManyRecords<ParcelaLeve>({
    filter: filtroRecebidas,
    limit: 500,
    objectNameSingular: 'parcela',
    recordGqlFields: CAMPOS_PARCELA,
  });

  const aReceber = useFindManyRecords<ParcelaLeve>({
    filter: FILTRO_A_RECEBER,
    limit: 500,
    objectNameSingular: 'parcela',
    recordGqlFields: CAMPOS_PARCELA,
  });

  return useMemo(() => {
    const indicePorChave = new Map(chaves.map((chave, indice) => [chave, indice]));

    const recebidoPorMes = chaves.map(() => 0);
    const previstoPorMes = chaves.map(() => 0);

    for (const parcela of recebidas.records) {
      const indice = indicePorChave.get(chaveDoMes(parcela.recebidaEm) ?? '');

      if (indice !== undefined) {
        // Cai para `valor` quando a baixa não registrou o quanto entrou —
        // acontece, e zerar o mês seria pior que estimar pelo previsto.
        recebidoPorMes[indice] +=
          micros(parcela.valorRecebido) || micros(parcela.valor);
      }
    }

    for (const parcela of aReceber.records) {
      const indice = indicePorChave.get(chaveDoMes(parcela.vencimentoEm) ?? '');

      if (indice !== undefined) {
        previstoPorMes[indice] += micros(parcela.valor);
      }
    }

    // ── Rosca: propostas por status ─────────────────────────────────────────
    const porStatus = new Map<string, { quantidade: number; valor: number }>();

    for (const proposta of propostas.records) {
      const status = proposta.status ?? 'RASCUNHO';
      const atual = porStatus.get(status) ?? { quantidade: 0, valor: 0 };

      porStatus.set(status, {
        quantidade: atual.quantidade + 1,
        valor: atual.valor + micros(proposta.valorTotal),
      });
    }

    // ── Precisa de atenção ──────────────────────────────────────────────────
    // Ordem: parcela vencida primeiro (é dinheiro que já era para ter entrado),
    // depois proposta parada. Dentro de cada grupo, o mais antigo na frente.
    const vencidas: AttentionItem[] = aReceber.records
      .map((parcela) => ({ parcela, dias: diasDesde(parcela.vencimentoEm) }))
      .filter(({ dias }) => dias !== null && dias > 0)
      .sort((a, b) => (b.dias as number) - (a.dias as number))
      .map(({ parcela, dias }) => ({
        badge: `${dias} dia${dias === 1 ? '' : 's'} em atraso`,
        id: parcela.id,
        label: parcela.descricao ?? 'Parcela',
        mark: 'R$',
        objectNameSingular: 'parcela',
        severity: 'alta' as const,
        sublabel: 'Parcela vencida sem baixa registrada',
        value: formatarBRL(micros(parcela.valor)),
      }));

    const paradas: AttentionItem[] = propostas.records
      .filter((proposta) =>
        STATUS_PROPOSTA_ABERTA.includes(proposta.status ?? ''),
      )
      .map((proposta) => ({ proposta, dias: diasDesde(proposta.enviadaEm) }))
      .filter(
        ({ dias }) => dias !== null && dias >= DIAS_SEM_RESPOSTA_PARA_ALERTAR,
      )
      .sort((a, b) => (b.dias as number) - (a.dias as number))
      .map(({ proposta, dias }) => ({
        badge: `${dias} dias sem resposta`,
        id: proposta.id,
        label: proposta.nome ?? 'Proposta',
        mark: (proposta.nome ?? 'P').trim().slice(0, 2),
        objectNameSingular: 'proposta',
        severity: 'media' as const,
        sublabel:
          proposta.status === 'VISUALIZADA'
            ? 'Cliente abriu e não respondeu'
            : 'Enviada e ainda sem retorno',
        value: formatarBRL(micros(proposta.valorTotal)),
      }));

    return {
      aReceberMicros: aReceber.records.reduce(
        (soma, parcela) => soma + micros(parcela.valor),
        0,
      ),
      atencao: [...vencidas, ...paradas].slice(0, LIMITE_ATENCAO),
      isLoading:
        propostas.loading || recebidas.loading || aReceber.loading,
      meses,
      previstoPorMes,
      propostasPorStatus: [...porStatus.entries()].map(([status, dados]) => ({
        quantidade: dados.quantidade,
        status,
        valor: dados.valor,
      })),
      recebidoPorMes,
    };
  }, [
    aReceber.loading,
    aReceber.records,
    chaves,
    meses,
    propostas.loading,
    propostas.records,
    recebidas.loading,
    recebidas.records,
  ]);
};
