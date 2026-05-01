import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import type { Interpretation } from '../../../shared/utils/interpretations';
import { theme } from '../../styles/theme';

interface InfoTooltipProps {
  interpretation: Interpretation;
}

const TooltipContainer = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  margin-left: 0.5rem;
`;

const InfoIcon = styled.span<{ severity: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
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
  font-size: 12px;
  font-weight: bold;
  cursor: help;
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
`;

const TooltipContent = styled.div<{ show: boolean; top: number; left: number }>`
  position: fixed;
  top: ${({ top }) => top}px;
  left: ${({ left }) => left}px;
  transform: translateX(-50%);
  background: ${theme.colors.cardBackground};
  border: 1px solid ${theme.colors.border};
  border-radius: 8px;
  padding: 0.75rem;
  min-width: 250px;
  max-width: 350px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 10000;
  opacity: ${({ show }) => (show ? 1 : 0)};
  visibility: ${({ show }) => (show ? 'visible' : 'hidden')};
  transition: opacity 0.2s ease, visibility 0.2s ease;
  pointer-events: ${({ show }) => (show ? 'auto' : 'none')};
  
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: ${theme.colors.border};
  }
  
  @media (max-width: 768px) {
    min-width: 200px;
    max-width: 90vw;
  }
`;

const TooltipTitle = styled.div`
  font-weight: 600;
  font-size: 0.875rem;
  color: ${theme.colors.primary};
  margin-bottom: 0.5rem;
`;

const TooltipDescription = styled.div`
  font-size: 0.8rem;
  color: ${theme.colors.textSecondary};
  line-height: 1.5;
`;

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ interpretation }) => {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLSpanElement>(null);

  const updatePosition = () => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 8, // Position above the icon with some spacing
        left: rect.left + rect.width / 2, // Center horizontally
      });
    }
  };

  const handleMouseEnter = () => {
    updatePosition();
    setShow(true);
  };

  const handleMouseLeave = () => {
    setShow(false);
  };

  const handleClick = () => {
    updatePosition();
    setShow(!show);
  };

  useEffect(() => {
    if (show) {
      const handleScroll = () => {
        updatePosition();
      };
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [show]);

  // Safety check: don't render if interpretation is invalid
  if (!interpretation || !interpretation.meaning) {
    return null;
  }

  return (
    <TooltipContainer
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <InfoIcon 
        ref={iconRef}
        severity={interpretation.severity || 'info'}
        onClick={handleClick}
      >
        ?
      </InfoIcon>
      <TooltipContent show={show} top={position.top} left={position.left}>
        <TooltipTitle>{interpretation.meaning}</TooltipTitle>
        {interpretation.context && (
          <TooltipDescription>{interpretation.context}</TooltipDescription>
        )}
      </TooltipContent>
    </TooltipContainer>
  );
};
