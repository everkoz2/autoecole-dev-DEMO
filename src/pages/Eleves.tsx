import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { Dialog } from '@headlessui/react';
import toast from 'react-hot-toast';
import Navigation from '../components/Navigation';

interface Eleve {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  heures_effectuees: number;
  auto_ecole_id?: string;
}

interface Point {
  id: number;
  description: string;
}

interface Appreciation {
  id: string;
  point_id: number;
  appreciation: 'non acquis' | 'à revoir' | 'assimilé';
  commentaire: string | null;
  created_at?: string;
}

const Eleves = () => {
  const { user, autoEcoleId: contextAutoEcoleId } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEleve, setSelectedEleve] = useState<Eleve | null>(null);
  const [commentaire, setCommentaire] = useState('');
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [selectedAppreciation, setSelectedAppreciation] = useState<'non acquis' | 'à revoir' | 'assimilé' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // On ne récupère que les élèves de la même auto-école que le moniteur
  const { data: eleves, isLoading: isLoadingEleves } = useQuery({
    queryKey: ['eleves', contextAutoEcoleId],
    queryFn: async () => {
      if (!contextAutoEcoleId) return [];
      const { data: utilisateurs, error: userError } = await supabase
        .from('utilisateurs')
        .select('id, prenom, nom, email, telephone, auto_ecole_id')
        .eq('role', 'eleve')
        .eq('auto_ecole_id', contextAutoEcoleId);

      if (userError) throw userError;

      const elevesAvecHeures = await Promise.all(utilisateurs.map(async (eleve) => {
        const { count, error: heuresError } = await supabase
          .from('heures')
          .select('*', { count: 'exact' })
          .eq('eleve_id', eleve.id)
          .eq('heure_passee', true);

        if (heuresError) throw heuresError;

        return {
          ...eleve,
          heures_effectuees: count || 0
        };
      }));

      return elevesAvecHeures as Eleve[];
    },
  });

  const { data: points, isLoading: isLoadingPoints } = useQuery({
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

  const { data: appreciations } = useQuery({
    queryKey: ['appreciations', selectedEleve?.id],
    queryFn: async () => {
      if (!selectedEleve) return [];
      const { data, error } = await supabase
        .from('livret_appreciations')
        .select('*, created_at')
        .eq('eleve_id', selectedEleve.id);
      if (error) throw error;
      return data as Appreciation[];
    },
    enabled: !!selectedEleve,
  });

  const addAppreciation = useMutation({
    mutationFn: async () => {
      if (!selectedEleve || !selectedPoint || !selectedAppreciation) return;

      const { error } = await supabase
        .from('livret_appreciations')
        .upsert({
          eleve_id: selectedEleve.id,
          point_id: selectedPoint,
          appreciation: selectedAppreciation,
          moniteur_id: user?.id,
          commentaire: commentaire.trim() || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appreciations', selectedEleve?.id] });
      toast.success('Appréciation ajoutée avec succès');
      setCommentaire('');
      setSelectedPoint(null);
      setSelectedAppreciation(null);
      setIsModalOpen(false);
    },
    onError: () => {
      toast.error('Erreur lors de l\'ajout de l\'appréciation');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoint || !selectedAppreciation) {
      toast.error('Veuillez sélectionner un point et une appréciation');
      return;
    }
    addAppreciation.mutate();
  };

  const getAppreciationForPoint = (pointId: number) => {
    const appreciationsForPoint = appreciations
      ?.filter(a => a.point_id === pointId)
      ?.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    return appreciationsForPoint?.[0];
  };

  const filteredEleves = eleves?.filter(eleve => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      eleve.nom.toLowerCase().includes(searchTermLower) ||
      eleve.prenom.toLowerCase().includes(searchTermLower) ||
      eleve.email.toLowerCase().includes(searchTermLower)
    );
  });

  if (isLoadingEleves || isLoadingPoints) {
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mes élèves</h1>
          <div className="w-64">
            <input
              type="text"
              placeholder="Rechercher un élève..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Téléphone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Heures effectuées
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEleves?.map((eleve) => (
                <tr key={eleve.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {eleve.prenom} {eleve.nom}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{eleve.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{eleve.telephone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{eleve.heures_effectuees}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => {
                        setSelectedEleve(eleve);
                        setIsModalOpen(true);
                      }}
                      className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                    >
                      Appréciation
                    </button>
                  </td>
                </tr>
              ))}
              {filteredEleves?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Aucun élève trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Dialog
          open={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedEleve(null);
            setCommentaire('');
            setSelectedPoint(null);
            setSelectedAppreciation(null);
          }}
          className="fixed z-10 inset-0 overflow-y-auto"
        >
          <div className="flex items-center justify-center min-h-screen">
            <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

            <div className="relative bg-white rounded-lg p-8 max-w-4xl w-full mx-4">
              <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
                Appréciation pour {selectedEleve?.prenom} {selectedEleve?.nom}
              </Dialog.Title>

              <div className="mt-4 space-y-4">
                {points?.map((point) => {
                  const appreciation = getAppreciationForPoint(point.id);
                  return (
                    <div key={point.id} className="border-b pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">
                            {point.description}
                          </h3>
                          {appreciation && (
                            <p className="mt-1 text-sm text-gray-500">
                              Appréciation actuelle : {appreciation.appreciation}
                              {appreciation.commentaire && (
                                <span className="block italic">
                                  "{appreciation.commentaire}"
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                        <div className="ml-4 flex space-x-2">
                          {(['non acquis', 'à revoir', 'assimilé'] as const).map((niveau) => (
                            <button
                              key={niveau}
                              onClick={() => {
                                setSelectedPoint(point.id);
                                setSelectedAppreciation(niveau);
                                setCommentaire(appreciation?.commentaire || '');
                              }}
                              className={`px-3 py-1 rounded-full text-sm font-medium ${
                                selectedPoint === point.id && selectedAppreciation === niveau
                                  ? 'bg-primary-600 text-white'
                                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                              }`}
                            >
                              {niveau}
                            </button>
                          ))}
                        </div>
                      </div>
                      {selectedPoint === point.id && (
                        <div className="mt-2">
                          <textarea
                            placeholder="Ajouter un commentaire (optionnel)"
                            className="w-full h-20 p-2 border rounded-md"
                            value={commentaire}
                            onChange={(e) => setCommentaire(e.target.value)}
                          />
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={handleSubmit}
                              className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                            >
                              Enregistrer
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedEleve(null);
                  setCommentaire('');
                  setSelectedPoint(null);
                  setSelectedAppreciation(null);
                }}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Fermer</span>
                ×
              </button>
            </div>
          </div>
        </Dialog>
      </div>
    </>
  );
};

export default Eleves;