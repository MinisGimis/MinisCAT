import React from "react";
import { AppProvider } from "./contexts/AppContext";
import AppRouter from "./Router";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import "./styles/App.css";

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;
