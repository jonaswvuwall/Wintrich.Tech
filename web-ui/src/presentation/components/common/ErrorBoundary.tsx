import React, { Component, type ReactNode } from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

const ErrorContainer = styled.div`
  background: ${theme.colors.error}15;
  border: 1px solid ${theme.colors.error};
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1rem 0;
`;

const ErrorTitle = styled.h3`
  color: ${theme.colors.error};
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
`;

const ErrorMessage = styled.p`
  color: ${theme.colors.text};
  margin: 0.5rem 0;
  font-size: 0.9rem;
`;

const ErrorDetails = styled.details`
  margin-top: 1rem;
  cursor: pointer;
  
  summary {
    color: ${theme.colors.textSecondary};
    font-size: 0.85rem;
    user-select: none;
    
    &:hover {
      color: ${theme.colors.text};
    }
  }
`;

const ErrorStack = styled.pre`
  background: ${theme.colors.background};
  border: 1px solid ${theme.colors.border};
  border-radius: 4px;
  padding: 0.75rem;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  overflow-x: auto;
  color: ${theme.colors.textSecondary};
`;

const RetryButton = styled.button`
  background: ${theme.colors.primary};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  margin-top: 1rem;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s ease;
  
  &:hover {
    background: ${theme.colors.primaryDark};
  }
`;

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorContainer>
          <ErrorTitle>⚠️ Something went wrong</ErrorTitle>
          <ErrorMessage>
            An error occurred while rendering this component. This has been logged and won't affect other parts of the application.
          </ErrorMessage>
          {this.state.error && (
            <ErrorMessage>
              <strong>Error:</strong> {this.state.error.message}
            </ErrorMessage>
          )}
          <RetryButton onClick={this.handleReset}>
            Try Again
          </RetryButton>
          {this.state.errorInfo && (
            <ErrorDetails>
              <summary>Technical Details</summary>
              <ErrorStack>{this.state.errorInfo.componentStack}</ErrorStack>
            </ErrorDetails>
          )}
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}
