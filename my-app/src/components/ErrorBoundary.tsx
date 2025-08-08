import React, { Component, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import '../styles/ErrorBoundary.css';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <Box className="error-boundary-container">
                    <Typography variant="h4" gutterBottom>
                        Something went wrong
                    </Typography>
                    <Typography variant="body1" color="text.secondary" className="error-boundary-description">
                        An unexpected error occurred. Please try reloading the page.
                    </Typography>
                    <Button variant="contained" onClick={this.handleReload}>
                        Reload Page
                    </Button>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <Box className="error-boundary-debug">
                            <Typography variant="body2" component="pre" className="error-boundary-debug-text">
                                {this.state.error.toString()}
                            </Typography>
                        </Box>
                    )}
                </Box>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary; 