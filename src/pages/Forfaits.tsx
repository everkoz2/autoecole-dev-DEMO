import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';

interface Forfait {
  id: number;
  nom: string;
  description: string;
  prix: number;
  heures: number;
}

const Forfaits = () => {
  const { user, userRole, autoEcoleSlug: contextAutoEcoleSlug } = useAuth();
  const { autoEcoleSlug: urlAutoEcoleSlug } = useParams();
  const navigate = useNavigate();
  const [autoEcoleId, setAutoEcoleId] = useState<string | null>(null);

  // Récupère l'id de l'auto-école à partir du slug
  useEffect(() => {
    const fetchAutoEcoleId = async () => {
      const slug = contextAutoEcoleSlug || urlAutoEcoleSlug;
      if (slug) {
        const { data, error } = await supabase
          .from('auto_ecoles')
          .select('id')
          .eq('slug', slug)
          .single();
        setAutoEcoleId(data?.id || null);
      }
    };
    fetchAutoEcoleId();
  }, [contextAutoEcoleSlug, urlAutoEcoleSlug]);

  // Sécurité : redirige si l'utilisateur tente d'accéder à une auto-école qui n'est pas la sienne
  useEffect(() => {
    if (urlAutoEcoleSlug && contextAutoEcoleSlug && urlAutoEcoleSlug !== contextAutoEcoleSlug) {
      navigate(`/${contextAutoEcoleSlug}/forfaits`, { replace: true });
    }
  }, [urlAutoEcoleSlug, contextAutoEcoleSlug, navigate]);

  // Récupère tous les forfaits de l'auto-école courante
  const { data: forfaits, isLoading } = useQuery({
    queryKey: ['forfaits', autoEcoleId],
    queryFn: async () => {
      if (!autoEcoleId) return [];
      const { data, error } = await supabase
        .from('forfaits')
        .select('*')
        .eq('auto_ecole_id', autoEcoleId);
      if (error) throw error;
      return data as Forfait[];
    },
    enabled: !!autoEcoleId,
  });

  // Récupère les infos utilisateur (pour heures_restantes)
  const { data: utilisateur, refetch } = useQuery({
    queryKey: ['utilisateur', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('utilisateurs')
        .select('id, heures_restantes, forfait_id')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Quand l'élève clique sur "Acheter", on additionne les heures
  const handleAcheter = async (forfait: Forfait) => {
    if (!user || !utilisateur) return;
    const nouvellesHeures = (utilisateur.heures_restantes || 0) + (forfait.heures || 0);
    const { error } = await supabase
      .from('utilisateurs')
      .update({
        heures_restantes: nouvellesHeures,
        forfait_id: forfait.id,
      })
      .eq('id', user.id);
    if (error) {
      toast.error("Erreur lors de l'attribution du forfait");
    } else {
      toast.success(`${forfait.heures}h de conduite ajoutées à votre compte !`);
      refetch();
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

  return (
    <>
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Nos Forfaits</h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {forfaits?.map((forfait) => (
            <div
              key={forfait.id}
              className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:scale-105"
            >
              <div className="p-6 flex flex-col items-center">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">{forfait.nom}</h2>
                <p className="text-gray-600 mb-4">{forfait.description}</p>
                <span className="text-3xl font-bold text-primary-600 mb-4">{forfait.prix}€</span>
                <div className="mb-4 text-lg text-gray-700">{forfait.heures}h de conduite</div>
                {user && userRole === 'eleve' && (
                  <button
                    className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700"
                    onClick={() => handleAcheter(forfait)}
                  >
                    Obtenir ce forfait
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Forfaits;