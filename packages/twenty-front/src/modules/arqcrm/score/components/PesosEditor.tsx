import { styled } from '@linaria/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { IconAlertTriangle, IconX } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  FATORES_NEGATIVOS,
  FATORES_POSITIVOS,
  faixasValidas,
  somaDosPositivos,
  type ConfiguracaoScore,
  type Pesos,
} from '@/arqcrm/score/hooks/useConfiguracaoScore';

// SCORE-05: a tela onde o escritório discorda dos pesos.
//
// Isto é o mecanismo de correção de uma hipótese, não uma preferência. A
// pesquisa confirmou QUAIS sinais um escritório usa para qualificar um lead;
// não há fonte para QUANTO cada um vale. Os padrões são chute informado, e o
// resultado esperado é o piloto mudá-los.
//
// Por isso cada linha mostra a FRASE que o fator produz no painel do lead, não
// o nome técnico do campo. O arquiteto reconhece "Quem decide está na conversa"
// porque acabou de ler isso na explicação de um lead; `decisorPresente` não diz
// nada a ele.
//
// A soma dos positivos aparece ao vivo e avisa quando foge de 100 — mas NÃO
// impede. Travar em 100 obrigaria a mexer em dois pesos para mexer em um, e o
// escritório abandonaria o ajuste no meio.

const StyledFundo = styled(motion.div)`
  background: color-mix(in srgb, black 55%, transparent);
  inset: 0;
  position: fixed;
  z-index: 200;
`;

const StyledPainel = styled(motion.aside)`
  background: ${themeCssVariables.background.primary};
  border-left: 1px solid ${themeCssVariables.border.color.medium};
  bottom: 0;
  display: flex;
  flex-direction: column;
  max-width: 92vw;
  position: fixed;
  right: 0;
  top: 0;
  width: 460px;
  z-index: 201;
`;

const StyledTopo = styled.header`
  align-items: flex-start;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[5]};
`;

const StyledTitulo = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: -0.01em;
  margin: 0 0 ${themeCssVariables.spacing[1]} 0;
`;

const StyledSubtitulo = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  line-height: 1.5;
  margin: 0;
`;

const StyledFechar = styled.button`
  background: none;
  border: none;
  color: ${themeCssVariables.font.color.tertiary};
  cursor: pointer;
  display: inline-flex;
  flex-shrink: 0;
  padding: 2px;

  &:hover {
    color: ${themeCssVariables.font.color.primary};
  }
`;

const StyledCorpo = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[5]};
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[5]};
`;

const StyledSecao = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledSecaoTopo = styled.div`
  align-items: baseline;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledSecaoTitulo = styled.h3`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  letter-spacing: 0.04em;
  margin: 0;
  text-transform: uppercase;
`;

const StyledSoma = styled.span<{ ok: boolean }>`
  color: ${({ ok }) =>
    ok ? themeCssVariables.color.green : themeCssVariables.color.orange};
  font-size: ${themeCssVariables.font.size.xs};
  font-variant-numeric: tabular-nums;
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

const StyledLinha = styled.label`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
`;

const StyledRotulo = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.3;
`;

const StyledCampo = styled.input`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  flex-shrink: 0;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  font-variant-numeric: tabular-nums;
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  text-align: right;
  width: 88px;

  &:focus {
    border-color: ${themeCssVariables.border.color.strong};
    outline: none;
  }
`;

const StyledAviso = styled.p`
  align-items: flex-start;
  background: color-mix(in srgb, ${themeCssVariables.color.orange} 15%, transparent);
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  gap: 6px;
  line-height: 1.5;
  margin: 0;
  padding: ${themeCssVariables.spacing[2]};
`;

const StyledNota = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  line-height: 1.55;
  margin: 0;
`;

const StyledRodape = styled.footer`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[4]} ${themeCssVariables.spacing[5]};
`;

const StyledBotao = styled.button<{ primario: boolean }>`
  background: ${({ primario }) =>
    primario ? themeCssVariables.font.color.primary : 'transparent'};
  border: 1px solid
    ${({ primario }) =>
      primario ? 'transparent' : themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${({ primario }) =>
    primario
      ? themeCssVariables.background.primary
      : themeCssVariables.font.color.secondary};
  cursor: pointer;
  flex: ${({ primario }) => (primario ? 1 : 0)};
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`;

export type PesosEditorProps = {
  configuracao: ConfiguracaoScore;
  onFechar: () => void;
  onSalvar: (mudancas: Partial<ConfiguracaoScore>) => Promise<void>;
};

export const PesosEditor = ({
  configuracao,
  onFechar,
  onSalvar,
}: PesosEditorProps) => {
  const [pesos, setPesos] = useState<Pesos>(configuracao.pesos);
  const [faixaA, setFaixaA] = useState(configuracao.faixaA);
  const [faixaB, setFaixaB] = useState(configuracao.faixaB);
  const [faixaC, setFaixaC] = useState(configuracao.faixaC);
  const [area, setArea] = useState(configuracao.areaGrandeM2);
  const [orcamento, setOrcamento] = useState(
    configuracao.orcamentoAcimaDaMediaReais,
  );
  const [salvando, setSalvando] = useState(false);

  // Fechar com Esc: o painel cobre a fila, e sair dele tem que custar menos que
  // mirar no X.
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onFechar();
    };

    window.addEventListener('keydown', aoTeclar);

    return () => window.removeEventListener('keydown', aoTeclar);
  }, [onFechar]);

  const soma = somaDosPositivos(pesos);
  const faixasOk = faixasValidas(faixaA, faixaB, faixaC);

  const trocarPeso = (chave: string, valor: string) =>
    setPesos((atual) => ({ ...atual, [chave]: Math.max(0, Number(valor) || 0) }));

  const salvar = async () => {
    setSalvando(true);

    try {
      await onSalvar({
        areaGrandeM2: area,
        faixaA,
        faixaB,
        faixaC,
        orcamentoAcimaDaMediaReais: orcamento,
        pesos,
      });
      onFechar();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <AnimatePresence>
      <StyledFundo
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
        onClick={onFechar}
        transition={{ duration: 0.15 }}
      />
      <StyledPainel
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        initial={{ x: '100%' }}
        transition={{ damping: 32, stiffness: 320, type: 'spring' }}
      >
        <StyledTopo>
          <div>
            <StyledTitulo>Como o score é calculado</StyledTitulo>
            <StyledSubtitulo>
              Estes pesos são um ponto de partida, não uma medição. Ajuste
              conforme o seu funil mostrar o contrário — os leads são
              repontuados na virada do dia.
            </StyledSubtitulo>
          </div>
          <StyledFechar
            aria-label="Fechar"
            onClick={onFechar}
            title="Fechar (Esc)"
            type="button"
          >
            <IconX size={18} />
          </StyledFechar>
        </StyledTopo>

        <StyledCorpo>
          <StyledSecao>
            <StyledSecaoTopo>
              <StyledSecaoTitulo>Pontos a favor</StyledSecaoTitulo>
              <StyledSoma ok={soma === 100}>soma {soma}</StyledSoma>
            </StyledSecaoTopo>

            {soma !== 100 && (
              <StyledAviso>
                <IconAlertTriangle size={13} />
                Com a soma em {soma}, o score deixa de ir de 0 a 100 — o teto
                passa a ser {soma}. Funciona, mas as faixas de grade abaixo
                precisam acompanhar.
              </StyledAviso>
            )}

            {FATORES_POSITIVOS.map((fator) => (
              <StyledLinha key={fator.chave}>
                <StyledRotulo>{fator.label}</StyledRotulo>
                <StyledCampo
                  inputMode="numeric"
                  min={0}
                  onChange={(evento) =>
                    trocarPeso(fator.chave, evento.target.value)
                  }
                  type="number"
                  value={pesos[fator.chave] ?? 0}
                />
              </StyledLinha>
            ))}
          </StyledSecao>

          <StyledSecao>
            <StyledSecaoTitulo>Pontos contra</StyledSecaoTitulo>
            <StyledNota>
              Números positivos: são subtraídos do score.
            </StyledNota>
            {FATORES_NEGATIVOS.map((fator) => (
              <StyledLinha key={fator.chave}>
                <StyledRotulo>{fator.label}</StyledRotulo>
                <StyledCampo
                  inputMode="numeric"
                  min={0}
                  onChange={(evento) =>
                    trocarPeso(fator.chave, evento.target.value)
                  }
                  type="number"
                  value={pesos[fator.chave] ?? 0}
                />
              </StyledLinha>
            ))}
          </StyledSecao>

          <StyledSecao>
            <StyledSecaoTitulo>Faixas de grade</StyledSecaoTitulo>
            {!faixasOk && (
              <StyledAviso>
                <IconAlertTriangle size={13} />
                As faixas precisam cair de A para C. Como estão, uma das grades
                nunca seria alcançada e sumiria da carteira — o servidor recusa
                e volta ao padrão.
              </StyledAviso>
            )}
            <StyledLinha>
              <StyledRotulo>A — ligar hoje, a partir de</StyledRotulo>
              <StyledCampo
                inputMode="numeric"
                onChange={(evento) => setFaixaA(Number(evento.target.value) || 0)}
                type="number"
                value={faixaA}
              />
            </StyledLinha>
            <StyledLinha>
              <StyledRotulo>B — vale acompanhar, a partir de</StyledRotulo>
              <StyledCampo
                inputMode="numeric"
                onChange={(evento) => setFaixaB(Number(evento.target.value) || 0)}
                type="number"
                value={faixaB}
              />
            </StyledLinha>
            <StyledLinha>
              <StyledRotulo>C — precisa qualificar, a partir de</StyledRotulo>
              <StyledCampo
                inputMode="numeric"
                onChange={(evento) => setFaixaC(Number(evento.target.value) || 0)}
                type="number"
                value={faixaC}
              />
            </StyledLinha>
            <StyledNota>Abaixo de {faixaC}, o lead é D.</StyledNota>
          </StyledSecao>

          <StyledSecao>
            <StyledSecaoTitulo>O que conta como grande</StyledSecaoTitulo>
            <StyledNota>
              Um escritório de reforma e um de alto padrão respondem diferente.
            </StyledNota>
            <StyledLinha>
              <StyledRotulo>Projeto de porte a partir de (m²)</StyledRotulo>
              <StyledCampo
                inputMode="numeric"
                min={1}
                onChange={(evento) => setArea(Number(evento.target.value) || 0)}
                type="number"
                value={area}
              />
            </StyledLinha>
            <StyledLinha>
              <StyledRotulo>Orçamento alto a partir de (R$)</StyledRotulo>
              <StyledCampo
                inputMode="numeric"
                min={0}
                onChange={(evento) =>
                  setOrcamento(Number(evento.target.value) || 0)
                }
                step={10000}
                type="number"
                value={orcamento}
              />
            </StyledLinha>
          </StyledSecao>
        </StyledCorpo>

        <StyledRodape>
          <StyledBotao onClick={onFechar} primario={false} type="button">
            Cancelar
          </StyledBotao>
          <StyledBotao
            disabled={salvando || !faixasOk}
            onClick={salvar}
            primario
            type="button"
          >
            {salvando ? 'Salvando…' : 'Salvar e repontuar'}
          </StyledBotao>
        </StyledRodape>
      </StyledPainel>
    </AnimatePresence>
  );
};
