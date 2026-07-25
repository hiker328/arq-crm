import { styled } from '@linaria/react';
import { useMemo, useState } from 'react';
import { IconAdjustments } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { PeriodoSegmentado } from '@/arqcrm/painel/components/PeriodoSegmentado';
import { LeadScoreDetalhe } from '@/arqcrm/score/components/LeadScoreDetalhe';
import { PesosEditor } from '@/arqcrm/score/components/PesosEditor';
import { ScoreQueue } from '@/arqcrm/score/components/ScoreQueue';
import { useConfiguracaoScore } from '@/arqcrm/score/hooks/useConfiguracaoScore';
import {
  GRADE_SIGNIFICADO,
  corDaGrade,
} from '@/arqcrm/score/constants/gradeCores';
import {
  type OrdemDaFila,
  useLeadScores,
} from '@/arqcrm/score/hooks/useLeadScores';

// Corpo da tela de lead score: faixas de grade, fila e explicação.
//
// A divisão em duas colunas é o formato do Dynamics 365, que é a referência
// declarada pelo usuário. Ela existe porque as duas perguntas são diferentes e
// simultâneas: "quem eu ligo agora" (fila) e "por que esse aí" (painel). Numa
// tela só de lista, a segunda vira um clique que tira o arquiteto da primeira.

const GRADES = ['A', 'B', 'C', 'D'] as const;

const ORDENS: { value: OrdemDaFila; label: string }[] = [
  { label: 'Atenção hoje', value: 'atencao' },
  { label: 'Score', value: 'score' },
];

const StyledConteudo = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  min-height: 0;
`;

const StyledFaixas = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
`;

const StyledFaixa = styled.button<{ ativa: boolean; cor: string }>`
  align-items: flex-start;
  background: ${themeCssVariables.background.secondary};
  border: 1px solid
    ${({ ativa, cor }) => (ativa ? cor : themeCssVariables.border.color.light)};
  border-radius: ${themeCssVariables.border.radius.md};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  font-family: inherit;
  gap: 2px;
  padding: ${themeCssVariables.spacing[3]};
  text-align: left;
  transition: border-color 120ms ease;

  &:hover {
    border-color: ${({ cor }) => cor};
  }
`;

const StyledFaixaTopo = styled.span<{ cor: string }>`
  align-items: center;
  color: ${({ cor }) => cor};
  display: inline-flex;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  gap: ${themeCssVariables.spacing[1]};
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const StyledFaixaNumero = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xl};
  font-variant-numeric: tabular-nums;
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: -0.02em;
  line-height: 1.1;
`;

const StyledFaixaNota = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledColunas = styled.div`
  display: grid;
  flex: 1;
  gap: ${themeCssVariables.spacing[4]};
  grid-template-columns: minmax(0, 1fr) 340px;
  min-height: 0;

  @media (max-width: 1100px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const StyledFila = styled.section`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.lg};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  min-height: 0;
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledFilaTopo = styled.header`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledFilaTitulo = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledExplicacao = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  line-height: 1.5;
  margin: 0;
`;

const StyledAjustar = styled.button`
  align-items: center;
  background: transparent;
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.tertiary};
  cursor: pointer;
  display: inline-flex;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.xs};
  gap: 5px;
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};

  &:hover {
    border-color: ${themeCssVariables.border.color.medium};
    color: ${themeCssVariables.font.color.primary};
  }
`;

const StyledControles = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledFiltroAtivo = styled.button`
  background: none;
  border: none;
  color: ${themeCssVariables.font.color.tertiary};
  cursor: pointer;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.xs};
  padding: 0;
  text-decoration: underline;

  &:hover {
    color: ${themeCssVariables.font.color.secondary};
  }
`;

const StyledCarregando = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  justify-content: center;
  min-height: 200px;
`;

const EXPLICACAO: Record<OrdemDaFila, string> = {
  atencao:
    'Ordenado por score e tempo parado: um lead bom esfriando sobe, um lead fraco parado não vira prioridade só por estar parado.',
  score: 'Ordenado só pelo score, do maior para o menor.',
};

export const LeadScoreContent = () => {
  const [ordem, setOrdem] = useState<OrdemDaFila>('atencao');
  const [gradeFiltrada, setGradeFiltrada] = useState<string | null>(null);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [ajustando, setAjustando] = useState(false);

  const { isLoading, leads, porGrade, semPontuacao } = useLeadScores(ordem);
  const { configuracao, salvar } = useConfiguracaoScore();

  const filtrados = useMemo(
    () =>
      gradeFiltrada === null
        ? leads
        : leads.filter((lead) => lead.leadGrade === gradeFiltrada),
    [gradeFiltrada, leads],
  );

  // O primeiro da fila já vem aberto. Abrir a tela num painel vazio faria a
  // resposta mais provável ("ligar para quem?") custar um clique — e a fila já
  // sabe quem é.
  const selecionado =
    filtrados.find((lead) => lead.id === selecionadoId) ?? filtrados[0] ?? null;

  return (
    <StyledConteudo>
      <StyledFaixas>
        {GRADES.map((grade) => {
          const { cor } = corDaGrade(grade);
          const ativa = gradeFiltrada === grade;

          return (
            <StyledFaixa
              ativa={ativa}
              cor={cor}
              key={grade}
              onClick={() => setGradeFiltrada(ativa ? null : grade)}
              type="button"
            >
              <StyledFaixaTopo cor={cor}>
                {grade} — {GRADE_SIGNIFICADO[grade]}
              </StyledFaixaTopo>
              <StyledFaixaNumero>{porGrade[grade]}</StyledFaixaNumero>
              <StyledFaixaNota>
                {porGrade[grade] === 1 ? 'lead aberto' : 'leads abertos'}
              </StyledFaixaNota>
            </StyledFaixa>
          );
        })}
      </StyledFaixas>

      <StyledColunas>
        <StyledFila>
          <StyledFilaTopo>
            <StyledFilaTitulo>
              {gradeFiltrada === null
                ? 'Fila'
                : `Fila — grade ${gradeFiltrada}`}
            </StyledFilaTitulo>
            <StyledControles>
              <PeriodoSegmentado
                ariaLabel="Ordem da fila"
                onChange={setOrdem}
                options={ORDENS}
                value={ordem}
              />
              {/* Só aparece com configuração carregada: um botão que abre um
                  painel vazio é pior que botão nenhum. */}
              {configuracao !== null && (
                <StyledAjustar
                  onClick={() => setAjustando(true)}
                  title="Ajustar os pesos do score"
                  type="button"
                >
                  <IconAdjustments size={13} />
                  Pesos
                </StyledAjustar>
              )}
            </StyledControles>
          </StyledFilaTopo>

          <StyledExplicacao>
            {EXPLICACAO[ordem]}
            {semPontuacao > 0 && ordem === 'score' && (
              <>
                {' '}
                {semPontuacao} lead{semPontuacao === 1 ? '' : 's'} ainda sem
                pontuação {semPontuacao === 1 ? 'aparece' : 'aparecem'} no fim.
              </>
            )}
          </StyledExplicacao>

          {gradeFiltrada !== null && (
            <StyledFiltroAtivo
              onClick={() => setGradeFiltrada(null)}
              type="button"
            >
              Mostrar todas as grades
            </StyledFiltroAtivo>
          )}

          {isLoading ? (
            <StyledCarregando>Carregando os leads…</StyledCarregando>
          ) : (
            <ScoreQueue
              leads={filtrados}
              onSelecionar={setSelecionadoId}
              selecionadoId={selecionado?.id ?? null}
              vazio={
                gradeFiltrada === null
                  ? 'Nenhum lead aberto no funil.'
                  : `Nenhum lead na grade ${gradeFiltrada}.`
              }
            />
          )}
        </StyledFila>

        <LeadScoreDetalhe lead={isLoading ? null : selecionado} />
      </StyledColunas>

      {ajustando && configuracao !== null && (
        <PesosEditor
          configuracao={configuracao}
          onFechar={() => setAjustando(false)}
          onSalvar={salvar}
        />
      )}
    </StyledConteudo>
  );
};
