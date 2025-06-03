import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navigation from './components/Navigation';
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            <Navigation />
            <main className="container mx-auto px-4 py-8">
              <Routes>
                {/* Routes publiques */}
                <Route path="/" element={<Accueil />} />
                <Route path="/creer-auto-ecole" element={<CreerAutoEcole />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/success" element={<Success />} />

                {/* Routes avec auto-école */}
                <Route path="/:autoEcoleId/accueil" element={<Accueil />} />
                <Route path="/:autoEcoleId/forfaits" element={<Forfaits />} />
                <Route path="/:autoEcoleId/mon-compte" element={
                  <PrivateRoute>
                    <MonCompte />
                  </PrivateRoute>
                } />
                <Route path="/:autoEcoleId/calendrier" element={
                  <PrivateRoute>
                    <Calendrier />
                  </PrivateRoute>
                } />
                <Route path="/:autoEcoleId/mes-heures" element={
                  <PrivateRoute roles={['eleve', 'moniteur']}>
                    <MesHeures />
                  </PrivateRoute>
                } />
                <Route path="/:autoEcoleId/mes-documents" element={
                  <PrivateRoute roles={['eleve']}>
                    <MesDocuments />
                  </PrivateRoute>
                } />
                <Route path="/:autoEcoleId/livret-apprentissage" element={
                  <PrivateRoute roles={['eleve']}>
                    <LivretApprentissage />
                  </PrivateRoute>
                } />
                <Route path="/:autoEcoleId/mes-factures" element={
                  <PrivateRoute roles={['eleve']}>
                    <MesFactures />
                  </PrivateRoute>
                } />
                <Route path="/:autoEcoleId/eleves" element={
                  <PrivateRoute roles={['moniteur']}>
                    <Eleves />
                  </PrivateRoute>
                } />
                <Route path="/:autoEcoleId/gestion-utilisateurs" element={
                  <PrivateRoute roles={['admin']}>
                    <GestionUtilisateurs />
                  </PrivateRoute>
                } />
                <Route path="/:autoEcoleId/logs" element={
                  <PrivateRoute roles={['admin']}>
                    <Logs />
                  </PrivateRoute>
                } />
                {/* Redirection pour /:autoEcoleId vers /:autoEcoleId/accueil */}
                <Route path="/:autoEcoleId" element={<Navigate to={`/${window.location.pathname.split('/')[1]}/accueil`} />} />
              </Routes>
            </main>
          </div>
          <Toaster position="top-right" />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;