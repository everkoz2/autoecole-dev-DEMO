import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Accueil from './pages/Accueil';
import Forfaits from './pages/Forfaits';
import Auth from './pages/Auth';
import MonCompte from './pages/MonCompte';
import Calendrier from './pages/Calendrier';
import MesHeures from './pages/MesHeures';
import MesDocuments from './pages/MesDocuments';
import LivretApprentissage from './pages/LivretApprentissage';
import MesFactures from './pages/MesFactures';
import Eleves from './pages/Eleves';
import GestionUtilisateurs from './pages/GestionUtilisateurs';
import Logs from './pages/Logs';
import Success from './pages/Success';
import CreerAutoEcole from './pages/CreerAutoEcole';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const queryClient = new QueryClient();

function PrivateRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, userRole } = useAuth();

  if (!user) {
    return <Navigate to="/auth" />;
  }

  if (roles && !roles.includes(userRole)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

export default App;