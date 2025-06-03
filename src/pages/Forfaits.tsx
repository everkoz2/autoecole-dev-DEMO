import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';
import toast from 'react-hot-toast';
import { supabase } from '../supabase/client';
import { useQuery } from '@tanstack/react-query';

const Forfaits = () => {
  const { user, userRole } = useAuth();

  // Récupère le forfait depuis la BDD (le premier ou celui avec id=1)
  const { data: forfait, isLoading } = useQuery({
    queryKey: ['forfait-demo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forfaits')
        .select('*')
        .eq('id', 1)
        .single();
      if (error) throw error;
      return data;
    }
  });

  const handleDemoForfait = async () => {
    if (!user || !forfait) return;
    // Ajoute le nombre d'heures du forfait à l'élève
    const { error } = await supabase.rpc('ajouter_heures', {
      user_id: user.id,
      heures: forfait.heures,
    });
    if (error) {
      toast.error("Erreur lors de l'attribution des heures");
    } else {
      toast.success(`${forfait.heures}h de conduite ajoutées à votre compte !`);
    }
  };

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </>
    );
  }

  if (!forfait) {
    return (
      <>
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Nos Forfaits</h1>
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center">
            <p className="text-gray-600">Aucun forfait disponible.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Nos Forfaits</h1>
        <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">{forfait.nom}</h2>
          <p className="text-gray-600 mb-4">{forfait.description}</p>
          <span className="text-3xl font-bold text-primary-600 mb-4">{forfait.prix}€</span>
          <div className="mb-4 text-lg text-gray-700">{forfait.heures}h de conduite</div>
          {user && userRole === 'eleve' && (
            <button
              className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700"
              onClick={handleDemoForfait}
            >
              Obtenir ce forfait
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default Forfaits;