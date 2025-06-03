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

// >>>>>>>>>>>> IL FAUT GARDER CETTE FONCTION <<<<<<<<<<<<
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/creer-auto-ecole" element={<CreerAutoEcole />} />
              <Route path="/success" element={<Success />} />
              <Route path="/:autoEcoleId/accueil" element={<Accueil />} />
              <Route path="/:autoEcoleId/forfaits" element={<Forfaits />} />
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
              <Route path="/:autoEcoleId/calendrier" element={<Calendrier />} />
              <Route path="/:autoEcoleId/mes-heures" element={<MesHeures />} />
              <Route path="/:autoEcoleId/mes-documents" element={<MesDocuments />} />
              <Route path="/:autoEcoleId/livret-apprentissage" element={<LivretApprentissage />} />
              <Route path="/:autoEcoleId/mes-factures" element={<MesFactures />} />
              <Route path="/:autoEcoleId/eleves" element={<Eleves />} />
              <Route path="/:autoEcoleId/mon-compte" element={<MonCompte />} />
              {/* Ajoute ici d'autres routes si besoin */}
              <Route path="*" element={<Navigate to="/auth" />} />
            </Routes>
          </main>
          <Toaster position="top-right" />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;