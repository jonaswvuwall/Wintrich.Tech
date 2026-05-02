import styled from 'styled-components';
import { theme } from '../styles/theme';

export const Card = styled.div`
  position: relative;
  width: 100%;
  padding: clamp(1.4rem, 2.4vw, 1.9rem);
  border-radius: 22px;
  background: rgba(14, 17, 23, 0.6);
  border: 1px solid ${theme.colors.border};
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  transition: transform ${theme.transitions.normal}, border-color ${theme.transitions.normal}, box-shadow ${theme.transitions.normal};
  overflow: visible;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: ${theme.gradients.glassBorder};
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
            mask-composite: exclude;
    opacity: 0;
    transition: opacity ${theme.transitions.normal};
    pointer-events: none;
  }

  &:hover {
    transform: translateY(-3px);
    border-color: rgba(34, 211, 238, 0.3);
    box-shadow: 0 16px 44px rgba(34, 211, 238, 0.18);

    &::before { opacity: 1; }
  }
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
`;

export const CardIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: ${theme.gradients.brandSoft};
  border: 1px solid rgba(34, 211, 238, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.primary};
  flex-shrink: 0;
  transition: border-color ${theme.transitions.normal}, box-shadow ${theme.transitions.normal}, color ${theme.transitions.normal};

  svg {
    width: 22px;
    height: 22px;
    stroke-width: 1.8;
  }

  ${Card}:hover & {
    border-color: rgba(34, 211, 238, 0.55);
    box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.08), 0 8px 24px rgba(34, 211, 238, 0.18);
    color: ${theme.colors.text};
  }
`;

export const CardTitle = styled.h2`
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${theme.colors.text};
  margin: 0;
`;

export const CardDescription = styled.p`
  color: ${theme.colors.textSecondary};
  font-size: 0.9rem;
  margin: 0;
  margin-top: 0.15rem;
`;

export const InputGroup = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

export const Label = styled.label`
  display: block;
  color: ${theme.colors.textMuted};
  font-size: 0.78rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: ${theme.spacing.sm};
`;

export const Input = styled.input`
  width: 100%;
  padding: 0.85rem 1rem;
  background: rgba(6, 7, 12, 0.6);
  border: 1px solid ${theme.colors.border};
  border-radius: 12px;
  color: ${theme.colors.text};
  font-size: 0.95rem;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  transition: all ${theme.transitions.fast};

  &:focus {
    outline: none;
    border-color: rgba(34, 211, 238, 0.6);
    box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.15);
    background: rgba(6, 7, 12, 0.85);
  }

  &:hover:not(:focus) {
    border-color: ${theme.colors.borderStrong};
  }

  &::placeholder {
    color: ${theme.colors.textMuted};
    font-family: 'Inter', sans-serif;
  }
`;

export const Button = styled.button`
  width: 100%;
  padding: 0.9rem 1.25rem;
  background: ${theme.gradients.brand};
  border: none;
  border-radius: 12px;
  color: #06070C;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  box-shadow: 0 8px 24px rgba(34, 211, 238, 0.25);
  position: relative;
  isolation: isolate;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: linear-gradient(135deg, #A78BFA 0%, #22D3EE 100%);
    opacity: 0;
    transition: opacity ${theme.transitions.normal};
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(167, 139, 250, 0.4);
    &::before { opacity: 1; }
  }

  &:active:not(:disabled) {
    transform: translateY(0) scale(0.99);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

export const ResultContainer = styled.div<{ success?: boolean }>`
  margin-top: ${theme.spacing.lg};
  padding: ${theme.spacing.lg};
  background: ${props => props.success === false
    ? 'rgba(244, 63, 94, 0.08)'
    : 'rgba(34, 211, 238, 0.05)'};
  border: 1px solid ${props => props.success === false
    ? 'rgba(244, 63, 94, 0.5)'
    : 'rgba(34, 211, 238, 0.25)'};
  border-radius: 14px;
  backdrop-filter: blur(10px);
  animation: fadeInExpand 0.4s ease-out;
  position: relative;
  z-index: 1;

  @keyframes fadeInExpand {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

export const ResultItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: all ${theme.transitions.fast};
  animation: slideInLeft 0.3s ease-out backwards;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    padding-left: ${theme.spacing.sm};
    background: rgba(34, 211, 238, 0.04);
    border-radius: 8px;
  }

  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-12px); }
    to { opacity: 1; transform: translateX(0); }
  }

  ${Array.from({ length: 20 }, (_, i) => `
    &:nth-child(${i + 1}) { animation-delay: ${i * 0.05}s; }
  `).join('')}
`;

export const ResultLabel = styled.span`
  display: flex;
  align-items: center;
  color: ${theme.colors.textSecondary};
  font-size: 0.85rem;
  font-weight: 500;
`;

export const ResultValue = styled.span<{ highlight?: boolean }>`
  color: ${props => props.highlight ? theme.colors.primary : theme.colors.text};
  font-size: 0.875rem;
  font-weight: ${props => props.highlight ? 600 : 400};
  font-family: ${props => props.highlight ? "'JetBrains Mono', monospace" : 'inherit'};
  text-align: right;
  word-break: break-all;
`;

export const LoadingSpinner = styled.div`
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2.5px solid rgba(6, 7, 12, 0.4);
  border-top-color: #06070C;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

export const ErrorMessage = styled.div`
  color: ${theme.colors.error};
  font-size: 0.875rem;
  margin-top: ${theme.spacing.sm};
  padding: 0.65rem 0.85rem;
  background: rgba(244, 63, 94, 0.08);
  border-left: 3px solid ${theme.colors.error};
  border-radius: 8px;
`;

export const Badge = styled.span<{ variant?: 'success' | 'warning' | 'error' | 'info' }>`
  display: inline-block;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  background: ${props => {
    switch (props.variant) {
      case 'success': return 'rgba(16, 224, 168, 0.15)';
      case 'warning': return 'rgba(251, 191, 36, 0.15)';
      case 'error':   return 'rgba(244, 63, 94, 0.15)';
      default:        return 'rgba(34, 211, 238, 0.15)';
    }
  }};
  border: 1px solid ${props => {
    switch (props.variant) {
      case 'success': return 'rgba(16, 224, 168, 0.4)';
      case 'warning': return 'rgba(251, 191, 36, 0.4)';
      case 'error':   return 'rgba(244, 63, 94, 0.4)';
      default:        return 'rgba(34, 211, 238, 0.4)';
    }
  }};
  color: ${props => {
    switch (props.variant) {
      case 'success': return theme.colors.success;
      case 'warning': return theme.colors.warning;
      case 'error':   return theme.colors.error;
      default:        return theme.colors.primary;
    }
  }};
  transition: all ${theme.transitions.fast};

  &:hover {
    transform: scale(1.04);
  }
`;
