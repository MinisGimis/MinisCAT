import React, { Component, ReactNode } from "react";
import { Box, Typography, Button } from "@mui/material";

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
    console.error("Error caught by boundary:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            p: 3,
            textAlign: "center",
          }}
        >
          <Typography variant="h4" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            An unexpected error occurred. Please try reloading the page.
          </Typography>
          <Button variant="contained" onClick={this.handleReload}>
            Reload Page
          </Button>
          {this.state.error && (
            <Box
              sx={{
                mt: 3,
                p: 2,
                bgcolor: "grey.100",
                borderRadius: 1,
                textAlign: "left",
              }}
            >
              <Typography
                variant="body2"
                component="pre"
                sx={{ fontSize: "0.8rem" }}
              >
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
