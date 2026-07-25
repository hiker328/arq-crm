import { styled } from '@linaria/react';
import { motion } from 'framer-motion';
import { themeCssVariables } from 'twenty-ui/theme-constants';

// Seletor de período no canto do painel de recebíveis.
//
// Não é enfeite copiado das referências: seis meses respondem "como está o
// caixa agora" e doze respondem "como foi o ano", e escritório de arquitetura
// tem sazonalidade forte o bastante para as duas perguntas serem diferentes.
//
// O indicador deslizante usa `layoutId` do framer-motion, que anima entre as
// posições sem que nenhum dos dois lados precise saber onde o outro está — ou
// seja, sem medir elemento.

const StyledGroup = styled.div`
  background: ${themeCssVariables.background.tertiary};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: inline-flex;
  gap: 2px;
  padding: 2px;
`;

const StyledOption = styled.button<{ isActive: boolean }>`
  background: transparent;
  border: none;
  border-radius: calc(${themeCssVariables.border.radius.sm} - 1px);
  color: ${({ isActive }) =>
    isActive
      ? themeCssVariables.font.color.primary
      : themeCssVariables.font.color.tertiary};
  cursor: pointer;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  position: relative;
  transition: color 140ms ease;

  &:hover {
    color: ${themeCssVariables.font.color.secondary};
  }
`;

const StyledIndicator = styled(motion.span)`
  background: ${themeCssVariables.background.primary};
  border-radius: calc(${themeCssVariables.border.radius.sm} - 1px);
  box-shadow: ${themeCssVariables.boxShadow.light};
  inset: 0;
  position: absolute;
  z-index: 0;
`;

const StyledLabel = styled.span`
  position: relative;
  z-index: 1;
`;

export type PeriodoOption<T extends string | number> = {
  value: T;
  label: string;
};

export type PeriodoSegmentadoProps<T extends string | number> = {
  options: PeriodoOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
};

export const PeriodoSegmentado = <T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: PeriodoSegmentadoProps<T>) => (
  <StyledGroup aria-label={ariaLabel} role="group">
    {options.map((option) => (
      <StyledOption
        aria-pressed={option.value === value}
        isActive={option.value === value}
        key={String(option.value)}
        onClick={() => onChange(option.value)}
        type="button"
      >
        {option.value === value && (
          <StyledIndicator
            layoutId={`periodo-${ariaLabel}`}
            transition={{ damping: 30, stiffness: 400, type: 'spring' }}
          />
        )}
        <StyledLabel>{option.label}</StyledLabel>
      </StyledOption>
    ))}
  </StyledGroup>
);
