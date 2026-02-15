import styled from 'styled-components';
import { theme } from '../styles/theme';

export const Card = styled.div`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  transition: all ${theme.transitions.normal};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, ${theme.colors.primary} 0%, ${theme.colors.primaryLight} 100%);
    transform: scaleX(0);
    transition: transform ${theme.transitions.normal};
  }

  &:hover {
    border-color: ${theme.colors.primary};
    box-shadow: ${theme.shadows.lg};
    transform: translateY(-2px);

    &::before {
      transform: scaleX(1);
    }
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
  border-radius: ${theme.borderRadius.md};
  background: linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  box-shadow: ${theme.shadows.glow};
`;

export const CardTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${theme.colors.text};
  margin: 0;
`;

export const CardDescription = styled.p`
  color: ${theme.colors.textSecondary};
  font-size: 0.875rem;
  margin: 0;
`;

export const InputGroup = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

export const Label = styled.label`
  display: block;
  color: ${theme.colors.textSecondary};
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: ${theme.spacing.sm};
`;

export const Input = styled.input`
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${theme.colors.background};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  color: ${theme.colors.text};
  font-size: 0.9375rem;
  transition: all ${theme.transitions.fast};

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(0, 168, 232, 0.1);
  }

  &::placeholder {
    color: ${theme.colors.textSecondary};
  }
`;

export const Button = styled.button`
  width: 100%;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%);
  border: none;
  border-radius: ${theme.borderRadius.md};
  color: ${theme.colors.text};
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  box-shadow: ${theme.shadows.md};

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: ${theme.shadows.glow};
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const ResultContainer = styled.div<{ success?: boolean }>`
  margin-top: ${theme.spacing.lg};
  padding: ${theme.spacing.lg};
  background: ${props => props.success === false 
    ? 'rgba(239, 71, 111, 0.1)' 
    : 'rgba(0, 168, 232, 0.05)'};
  border: 1px solid ${props => props.success === false 
    ? theme.colors.error 
    : theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  max-height: 400px;
  overflow-y: auto;
`;

export const ResultItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.sm} 0;
  border-bottom: 1px solid ${theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`;

export const ResultLabel = styled.span`
  color: ${theme.colors.textSecondary};
  font-size: 0.875rem;
  font-weight: 500;
`;

export const ResultValue = styled.span<{ highlight?: boolean }>`
  color: ${props => props.highlight ? theme.colors.primary : theme.colors.text};
  font-size: 0.875rem;
  font-weight: ${props => props.highlight ? 600 : 400};
  font-family: ${props => props.highlight ? "'Fira Code', monospace" : 'inherit'};
`;

export const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid ${theme.colors.border};
  border-top-color: ${theme.colors.primary};
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
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(239, 71, 111, 0.1);
  border-left: 3px solid ${theme.colors.error};
  border-radius: ${theme.borderRadius.sm};
`;

export const Badge = styled.span<{ variant?: 'success' | 'warning' | 'error' | 'info' }>`
  display: inline-block;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.sm};
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => {
    switch (props.variant) {
      case 'success': return 'rgba(6, 214, 160, 0.2)';
      case 'warning': return 'rgba(255, 214, 10, 0.2)';
      case 'error': return 'rgba(239, 71, 111, 0.2)';
      default: return 'rgba(0, 168, 232, 0.2)';
    }
  }};
  color: ${props => {
    switch (props.variant) {
      case 'success': return theme.colors.success;
      case 'warning': return theme.colors.warning;
      case 'error': return theme.colors.error;
      default: return theme.colors.primary;
    }
  }};
`;
