import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';
import { useParams, useNavigate } from 'react-router-dom';

interface Point {
  id: number;
  description: string;
}

interface Appreciation {
  id: string;
  point_id: number;
  appreciation: 'non acquis' | 'à revoir' | 'assimilé';
  commentaire: string;
  created_at: string;
  moniteur: {
    prenom: string;
    nom: string;
  };
}

interface Props {
  userId?: string;
}

const appreciationColors = {
  'non acquis': 'bg-red-100 text-red-800',
  'à revoir': 'bg-yellow-100 text-yellow-800',
  'assimilé': 'bg-green-100 text-green-800',
};

const LivretApprentissage = ({ userId }: Props) => {
  const { user, autoEcoleSlug: contextAutoEcoleSlug } = useAuth();
  const { autoEcoleSlug: urlAutoEcoleSlug } = useParams();
  const navigate = useNavigate();
  const [autoEcoleId, setAutoEcoleId] = useState<string | null>(null);

  // Récupère l'id de l'auto-école à partir du slug
  useEffect(() => {
    const fetchAutoEcoleId = async () => {
      const slug = contextAutoEcoleSlug || urlAutoEcoleSlug;
      if (slug) {
        const { data } = await supabase
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
      navigate(`/${contextAutoEcoleSlug}/livret-apprentissage`, { replace: true });
    }
  }, [urlAutoEcoleSlug, contextAutoEcoleSlug, navigate]);

  const studentId = userId || user?.id;

  const { data: points } = useQuery({
    queryKey: ['points'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('livret_points')
        .select('*')
        .order('id');

      if (error) throw error;
      return data as Point[];
    },
  });

  const { data: appreciations, isLoading } = useQuery({
    queryKey: ['appreciations', studentId, autoEcoleId],
    queryFn: async () => {
      if (!studentId || !autoEcoleId) return [];
      const { data, error } = await supabase
        .from('livret_appreciations')
        .select(`
          *,
          moniteur:utilisateurs!livret_appreciations_moniteur_id_fkey(prenom, nom)
        `)
        .eq('eleve_id', studentId)
        .eq('auto_ecole_id', autoEcoleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Appreciation[];
    },
    enabled: !!studentId && !!autoEcoleId,
  });

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

  const getAppreciationForPoint = (pointId: number) => {
    return appreciations?.find(a => a.point_id === pointId);
  };

  return (
    <>
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!userId && <h1 className="text-3xl font-bold text-gray-900 mb-8">Livret d'apprentissage</h1>}

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">
              Points d'évaluation
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Suivi de votre progression
            </p>
          </div>
          <div className="border-t border-gray-200">
            <ul className="divide-y divide-gray-200">
              {points?.map((point) => {
                const appreciation = getAppreciationForPoint(point.id);
                return (
                  <li key={point.id} className="px-4 py-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">
                          {point.description}
                        </h3>
                        {appreciation ? (
                          <div className="mt-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${appreciationColors[appreciation.appreciation]}`}>
                              {appreciation.appreciation}
                            </span>
                            <p className="mt-1 text-sm text-gray-500">
                              Par {appreciation.moniteur.prenom} {appreciation.moniteur.nom} - 
                              {new Date(appreciation.created_at).toLocaleDateString('fr-FR')}
                            </p>
                            {appreciation.commentaire && (
                              <p className="mt-1 text-sm text-gray-600">
                                {appreciation.commentaire}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="mt-2">
                            <span className="text-sm text-gray-500 italic">
                              En attente d'évaluation
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default LivretApprentissage;