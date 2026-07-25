import { useMemo } from 'react';
import { type RecordGqlOperationGqlRecordFields } from 'twenty-shared/types';

import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';

// Dados da tela de lead score.
//
// Lê o que a logic function `pontuar-leads` já gravou. NADA é calculado aqui:
// o score é coluna persistida por decisão de arquitetura, porque "quais leads
// merecem atenção" é uma ORDENAÇÃO, e não se ordena por valor que só existe
// depois de renderizar. Recalcular no front daria um número que a tabela, o
// filtro e o kanban não enxergam — três telas discordando do mesmo lead.
//
// Constante de módulo pelo motivo de sempre: o objeto de campos é dependência
// do memo que monta o documento GraphQL, e literal inline remonta a query a
// cada render.

const CAMPOS_LEAD: RecordGqlOperationGqlRecordFields = {
  amount: true,
  company: { id: true, name: true },
  createdAt: true,
  id: true,
  leadGrade: true,
  leadScore: true,
  leadScoreFatores: true,
  motivoPerda: true,
  name: true,
  pointOfContact: { id: true, name: true },
  proximaAcao: true,
  proximaAcaoEm: true,
  stage: true,
  ultimoContatoEm: true,
};

const MILISSEGUNDOS_POR_DIA = 86_400_000;

// Teto do multiplicador de urgência. Depois de um mês parado, mais um dia não
// muda a decisão: o lead já está no topo da fila ou não vai entrar nela.
const DIAS_ATE_URGENCIA_MAXIMA = 30;

// Valores padrão do Twenty para o SELECT `stage`. Renomear o rótulo nas
// configurações não muda o valor, então comparar por valor é estável — o
// escritório pode chamar de "Fechado", "Ganho" ou "Cliente" que continua
// funcionando.
const ETAPAS_FORA_DA_FILA = new Set(['CUSTOMER']);

export type FatorDoScore = { pontos: number; texto: string };

export type FatoresGravados = {
  calculadoEm: string | null;
  diasSemContato: number | null;
  positivos: FatorDoScore[];
  negativos: FatorDoScore[];
};

export type LeadComScore = {
  id: string;
  name: string | null;
  stage: string | null;
  leadScore: number | null;
  leadGrade: string | null;
  fatores: FatoresGravados | null;
  /** Recalculado na leitura, não o que estava gravado — ver comentário abaixo. */
  diasSemContato: number | null;
  temContatoRegistrado: boolean;
  prioridade: number;
  proximaAcao: string | null;
  proximaAcaoEm: string | null;
  valorMicros: number;
  quem: string | null;
};

type LeadBruto = {
  id: string;
  name: string | null;
  stage: string | null;
  leadScore: number | null;
  leadGrade: string | null;
  leadScoreFatores: unknown;
  motivoPerda: string | null;
  createdAt: string | null;
  ultimoContatoEm: string | null;
  proximaAcao: string | null;
  proximaAcaoEm: string | null;
  amount: { amountMicros?: number | string | null } | null;
  company: { id: string; name: string | null } | null;
  pointOfContact: {
    id: string;
    name: { firstName?: string | null; lastName?: string | null } | null;
  } | null;
};

const ehFator = (valor: unknown): valor is FatorDoScore =>
  typeof valor === 'object' &&
  valor !== null &&
  typeof (valor as FatorDoScore).texto === 'string' &&
  typeof (valor as FatorDoScore).pontos === 'number';

const listaDeFatores = (valor: unknown): FatorDoScore[] =>
  Array.isArray(valor) ? valor.filter(ehFator) : [];

// RAW_JSON não valida nada no servidor. O que chega aqui pode ser objeto, pode
// ser string por serialização, e pode ser lixo de uma versão anterior do
// formato. Aceitar só o que tem a forma certa é o que impede a tela de quebrar
// por causa de um registro velho.
const lerFatores = (valor: unknown): FatoresGravados | null => {
  const bruto =
    typeof valor === 'string'
      ? ((): unknown => {
          try {
            return JSON.parse(valor);
          } catch {
            return null;
          }
        })()
      : valor;

  if (typeof bruto !== 'object' || bruto === null) return null;

  const registro = bruto as Record<string, unknown>;

  return {
    calculadoEm:
      typeof registro.calculadoEm === 'string' ? registro.calculadoEm : null,
    diasSemContato:
      typeof registro.diasSemContato === 'number'
        ? registro.diasSemContato
        : null,
    negativos: listaDeFatores(registro.negativos),
    positivos: listaDeFatores(registro.positivos),
  };
};

const diasDesde = (data: string | null, agora: number): number | null => {
  if (typeof data !== 'string' || data.length < 10) return null;

  const quando = new Date(data).getTime();

  if (!Number.isFinite(quando)) return null;

  return Math.max(0, Math.floor((agora - quando) / MILISSEGUNDOS_POR_DIA));
};

export type OrdemDaFila = 'atencao' | 'score';

export type LeadScores = {
  isLoading: boolean;
  leads: LeadComScore[];
  /** Quantos leads em cada grade, para as faixas do topo. */
  porGrade: Record<string, number>;
  semPontuacao: number;
};

export const useLeadScores = (ordem: OrdemDaFila): LeadScores => {
  const { records, loading } = useFindManyRecords<LeadBruto>({
    limit: 200,
    objectNameSingular: 'opportunity',
    recordGqlFields: CAMPOS_LEAD,
  });

  return useMemo(() => {
    const agora = Date.now();

    const leads: LeadComScore[] = records
      // Lead ganho ou perdido sai da fila. Não é filtro cosmético: uma fila que
      // mistura quem já fechou com quem está esperando ligação deixa de ser
      // fila e vira listagem, e listagem já existe na tabela de leads.
      .filter(
        (lead) =>
          !ETAPAS_FORA_DA_FILA.has(lead.stage ?? '') &&
          (lead.motivoPerda === null || lead.motivoPerda === ''),
      )
      .map((lead) => {
        // Os dias vêm do relógio de agora, não do que a logic function gravou.
        // O valor gravado envelhece junto com o registro — um lead que ninguém
        // toca há um mês teria congelado em "há 3 dias" até o cron passar. O
        // score em si pode envelhecer até a madrugada seguinte; a contagem de
        // dias, que é o que faz o arquiteto pegar o telefone, não pode.
        const referencia = lead.ultimoContatoEm ?? lead.createdAt;
        const dias = diasDesde(referencia, agora);
        const score = lead.leadScore ?? 0;

        const contato = lead.pointOfContact?.name;
        const nomeContato = [contato?.firstName, contato?.lastName]
          .filter(Boolean)
          .join(' ')
          .trim();

        return {
          diasSemContato: dias,
          fatores: lerFatores(lead.leadScoreFatores),
          id: lead.id,
          leadGrade: lead.leadGrade,
          leadScore: lead.leadScore,
          name: lead.name,
          // Um lead bom esfriando sobe na fila; um lead ruim esfriando não vira
          // prioridade só por estar parado. Por isso o tempo MULTIPLICA o score
          // em vez de somar — somar faria um lead 20 parado há 30 dias passar na
          // frente de um lead 90 de ontem, que é exatamente a ligação errada.
          prioridade: score * (1 + Math.min(dias ?? 0, DIAS_ATE_URGENCIA_MAXIMA) / DIAS_ATE_URGENCIA_MAXIMA),
          proximaAcao: lead.proximaAcao,
          proximaAcaoEm: lead.proximaAcaoEm,
          quem: nomeContato !== '' ? nomeContato : (lead.company?.name ?? null),
          stage: lead.stage,
          temContatoRegistrado: typeof lead.ultimoContatoEm === 'string',
          valorMicros: Number(lead.amount?.amountMicros ?? 0),
        };
      });

    leads.sort((a, b) =>
      ordem === 'score'
        ? (b.leadScore ?? -1) - (a.leadScore ?? -1)
        : b.prioridade - a.prioridade,
    );

    const porGrade: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    let semPontuacao = 0;

    for (const lead of leads) {
      if (lead.leadGrade !== null && lead.leadGrade in porGrade) {
        porGrade[lead.leadGrade] += 1;
      } else {
        semPontuacao += 1;
      }
    }

    return { isLoading: loading, leads, porGrade, semPontuacao };
  }, [loading, ordem, records]);
};
