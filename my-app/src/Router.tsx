import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Viewer from './components/Viewer';

const AppRouter = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Viewer />} />
            </Routes>
        </Router>
    );
};

export default AppRouter; 