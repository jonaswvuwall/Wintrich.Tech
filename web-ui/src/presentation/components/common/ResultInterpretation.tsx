import React, { useState } from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/theme';

interface ResultInterpretationProps {
  title: string;
  summary: string;
  details: string[];
  severity: 'info' | 'success' | 'warning' | 'error';
}

const Container = styled.div`
  margin-top: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.md};
`;

const InterpretButton = styled.button`
  width: 100%;
  padding: ${theme.spacing.md};
  background: linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%);
  color: white;
  border: none;
  border-radius: ${theme.borderRadius.md};
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all ${theme.transitions.normal};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 168, 232, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const InterpretationPanel = styled.div<{ severity: string; show: boolean }>`
  margin-top: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  background: ${({ severity }) => {
    switch (severity) {
      case 'success':
        return 'rgba(6, 214, 160, 0.1)';
      case 'warning':
        return 'rgba(255, 214, 10, 0.1)';
      case 'error':
        return 'rgba(239, 71, 111, 0.1)';
      default:
        return 'rgba(0, 168, 232, 0.1)';
    }
  }};
  border-left: 4px solid ${({ severity }) => {
    switch (severity) {
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.info;
    }
  }};
  border-radius: ${theme.borderRadius.md};
  max-height: ${({ show }) => (show ? '1000px' : '0')};
  opacity: ${({ show }) => (show ? 1 : 0)};
  overflow: hidden;
  transition: all 0.4s ease-out;
  transform-origin: top;
`;

const InterpretationTitle = styled.h3`
  margin: 0 0 ${theme.spacing.md} 0;
  color: ${theme.colors.text};
  font-size: 1.125rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const InterpretationIcon = styled.span<{ severity: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${({ severity }) => {
    switch (severity) {
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.info;
    }
  }};
  color: white;
  font-size: 0.875rem;
`;

const InterpretationSummary = styled.p`
  margin: 0 0 ${theme.spacing.md} 0;
  color: ${theme.colors.text};
  font-size: 0.9375rem;
  line-height: 1.6;
`;

const DetailsList = styled.ul`
  margin: ${theme.spacing.md} 0 0 0;
  padding-left: ${theme.spacing.lg};
  color: ${theme.colors.textSecondary};
  font-size: 0.875rem;
  line-height: 1.8;
`;

const DetailItem = styled.li`
  margin-bottom: ${theme.spacing.sm};
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const getIcon = (severity: string): string => {
  switch (severity) {
    case 'success':
      return '✓';
    case 'warning':
      return '⚠';
    case 'error':
      return '✕';
    default:
      return 'i';
  }
};

export const ResultInterpretation: React.FC<ResultInterpretationProps> = ({
  title,
  summary,
  details,
  severity,
}) => {
  const [show, setShow] = useState(false);

  // Safety checks
  if (!title || !summary) {
    return null;
  }

  const safeDetails = Array.isArray(details) ? details : [];
  const safeSeverity = severity || 'info';

  return (
    <Container>
      <InterpretButton onClick={() => setShow(!show)}>
        <span>🎯</span>
        <span>{show ? 'Hide Interpretation' : 'Interpret This Result'}</span>
      </InterpretButton>
      
      <InterpretationPanel severity={safeSeverity} show={show}>
        <InterpretationTitle>
          <InterpretationIcon severity={safeSeverity}>
            {getIcon(safeSeverity)}
          </InterpretationIcon>
          {title}
        </InterpretationTitle>
        
        <InterpretationSummary>{summary}</InterpretationSummary>
        
        {safeDetails.length > 0 && (
          <DetailsList>
            {safeDetails.map((detail, index) => (
              <DetailItem key={index}>{detail}</DetailItem>
            ))}
          </DetailsList>
        )}
      </InterpretationPanel>
    </Container>
  );
};
