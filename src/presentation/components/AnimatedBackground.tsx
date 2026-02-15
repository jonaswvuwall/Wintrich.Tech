import styled, { keyframes } from 'styled-components';
import { theme } from '../styles/theme';

const float = keyframes`
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.6;
  }
`;

const gradientShift = keyframes`
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
`;

export const AnimatedBackground = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
  background: linear-gradient(
    -45deg,
    ${theme.colors.background},
    #0d1117,
    #0a1929,
    ${theme.colors.background}
  );
  background-size: 400% 400%;
  animation: ${gradientShift} 15s ease infinite;
  overflow: hidden;
`;

export const FloatingShape = styled.div<{ delay?: number; duration?: number; size?: number }>`
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    rgba(0, 168, 232, 0.1),
    rgba(72, 202, 228, 0.05)
  );
  filter: blur(40px);
  animation: ${float} ${props => props.duration || 20}s ease-in-out infinite;
  animation-delay: ${props => props.delay || 0}s;
  opacity: 0.4;
  width: ${props => props.size || 300}px;
  height: ${props => props.size || 300}px;

  &:nth-child(1) {
    top: 10%;
    left: 10%;
  }

  &:nth-child(2) {
    top: 60%;
    right: 10%;
  }

  &:nth-child(3) {
    bottom: 10%;
    left: 30%;
  }

  &:nth-child(4) {
    top: 30%;
    right: 25%;
  }
`;

export const ParticleContainer = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

const moveUp = keyframes`
  0% {
    transform: translateY(0) scale(0);
    opacity: 0;
  }
  10% {
    opacity: 0.3;
  }
  90% {
    opacity: 0.3;
  }
  100% {
    transform: translateY(-1000px) scale(1);
    opacity: 0;
  }
`;

export const Particle = styled.div<{ delay?: number; duration?: number; left?: string }>`
  position: absolute;
  bottom: -50px;
  left: ${props => props.left || '50%'};
  width: 2px;
  height: 2px;
  background: ${theme.colors.primary};
  border-radius: 50%;
  animation: ${moveUp} ${props => props.duration || 15}s linear infinite;
  animation-delay: ${props => props.delay || 0}s;
  box-shadow: 0 0 10px ${theme.colors.primary};
`;

export const GridOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    linear-gradient(rgba(0, 168, 232, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 168, 232, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  animation: ${pulse} 4s ease-in-out infinite;
`;

export const BackgroundGlow = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 800px;
  height: 800px;
  background: radial-gradient(
    circle,
    rgba(0, 168, 232, 0.15) 0%,
    transparent 70%
  );
  filter: blur(60px);
  animation: ${pulse} 8s ease-in-out infinite;
`;
