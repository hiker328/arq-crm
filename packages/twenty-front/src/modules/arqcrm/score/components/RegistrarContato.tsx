import { styled } from '@linaria/react';
import { useState } from 'react';
import { IconCheck, IconPhone } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { useUpdateOneRecord } from '@/object-record/hooks/useUpdateOneRecord';

// O que transforma a fila em ferramenta.
//
// Sem isto o lead score é um relatório: diz quem ligar e não sabe se você
// ligou. O arquiteto teria que abrir o lead, achar o campo de data, digitar
// hoje, voltar. Três telas para registrar uma ligação de dois minutos — e
// ninguém faz isso duas vezes, então o campo de "último contato" apodrece, e
// com ele o decay, e com o decay a fila inteira.
//
// Registrar aqui fecha o laço: liga, marca, o lead desce na fila na hora e o
// score é recalculado pelo servidor. É o único ponto do produto onde o número
// e a ação vivem no mesmo lugar.
//
// A próxima ação é opcional de propósito. Obrigar a preencher transformaria um
// clique em formulário, e o custo de registrar precisa ser menor que o custo de
// não registrar.

const StyledBloco = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledCampo = styled.input`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.primary};
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]};
  width: 100%;

  &::placeholder {
    color: ${themeCssVariables.font.color.extraLight};
  }

  &:focus {
    border-color: ${themeCssVariables.border.color.strong};
    outline: none;
  }
`;

const StyledBotao = styled.button`
  align-items: center;
  background: ${themeCssVariables.background.tertiary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  display: inline-flex;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  gap: 6px;
  justify-content: center;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &:hover:not(:disabled) {
    background: ${themeCssVariables.background.quaternary};
  }
`;

const StyledConfirmado = styled.span`
  align-items: center;
  color: ${themeCssVariables.color.green};
  display: inline-flex;
  font-size: ${themeCssVariables.font.size.xs};
  gap: 4px;
  justify-content: center;
`;

// AAAA-MM-DD no fuso de São Paulo. `toISOString()` daria UTC, e às 21h de
// Brasília isso já é o dia seguinte — o contato ficaria registrado amanhã.
const hojeEmSaoPaulo = (): string => {
  const agora = new Date();
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000);

  return local.toISOString().slice(0, 10);
};

export type RegistrarContatoProps = {
  leadId: string;
  proximaAcaoAtual: string | null;
};

export const RegistrarContato = ({
  leadId,
  proximaAcaoAtual,
}: RegistrarContatoProps) => {
  const { updateOneRecord } = useUpdateOneRecord();
  const [proximaAcao, setProximaAcao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [registrado, setRegistrado] = useState(false);

  const registrar = async () => {
    setSalvando(true);

    try {
      const dados: Record<string, unknown> = {
        ultimoContatoEm: hojeEmSaoPaulo(),
      };

      if (proximaAcao.trim() !== '') {
        dados.proximaAcao = proximaAcao.trim();
      }

      await updateOneRecord({
        idToUpdate: leadId,
        objectNameSingular: 'opportunity',
        // A fila reordena na hora. Sem isto o cartão só desceria quando o
        // servidor terminasse de repontuar, e o clique pareceria não ter feito
        // nada por alguns segundos.
        optimisticRecord: dados,
        updateOneRecordInput: dados,
      });

      setProximaAcao('');
      setRegistrado(true);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <StyledBloco>
      <StyledCampo
        onChange={(evento) => {
          setProximaAcao(evento.target.value);
          setRegistrado(false);
        }}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter' && !salvando) registrar();
        }}
        placeholder={
          proximaAcaoAtual !== null && proximaAcaoAtual.trim() !== ''
            ? `Próxima ação (hoje: ${proximaAcaoAtual})`
            : 'Próxima ação (opcional)'
        }
        value={proximaAcao}
      />

      <StyledBotao disabled={salvando} onClick={registrar} type="button">
        <IconPhone size={14} />
        {salvando ? 'Registrando…' : 'Registrar contato de hoje'}
      </StyledBotao>

      {registrado && (
        <StyledConfirmado>
          <IconCheck size={12} />
          Contato registrado — o score está sendo recalculado.
        </StyledConfirmado>
      )}
    </StyledBloco>
  );
};
