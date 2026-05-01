import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../styles/theme';

const ScrollButton = styled.button<{ visible: boolean }>`
  position: fixed;
  bottom: ${theme.spacing.xl};
  right: ${theme.spacing.xl};
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%);
  border: 2px solid rgba(0, 168, 232, 0.3);
  color: ${theme.colors.text};
  font-size: 1.5rem;
  cursor: pointer;
  z-index: 1000;
  opacity: ${props => props.visible ? 1 : 0};
  transform: ${props => props.visible ? 'scale(1)' : 'scale(0)'};
  transition: all ${theme.transitions.normal};
  box-shadow: 0 4px 20px rgba(0, 168, 232, 0.4);

  &:hover {
    transform: ${props => props.visible ? 'scale(1.1)' : 'scale(0)'};
    box-shadow: 0 6px 30px rgba(0, 168, 232, 0.6);
  }

  &:active {
    transform: scale(0.95);
  }

  @media (max-width: ${theme.breakpoints.tablet}) {
    bottom: ${theme.spacing.lg};
    right: ${theme.spacing.lg};
    width: 45px;
    height: 45px;
    font-size: 1.25rem;
  }
`;

export const ScrollToTop: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const toggleVisible = () => {
      const scrolled = document.documentElement.scrollTop;
      setVisible(scrolled > 300);
    };

    window.addEventListener('scroll', toggleVisible);
    return () => window.removeEventListener('scroll', toggleVisible);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <ScrollButton visible={visible} onClick={scrollToTop} aria-label="Scroll to top">
      ↑
    </ScrollButton>
  );
};
