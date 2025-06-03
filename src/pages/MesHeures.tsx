import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { Dialog } from '@headlessui/react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Navigation from '../components/Navigation';

interface Heure {
  id: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  eleve_id: string | null;
  moniteur_id: string;
  modele_vehicule: string;
  boite_vitesse: string;
  reserve: boolean;
  heure_passee: boolean;
  commentaires_moniteur: string | null;
  eleve?: {
    prenom: string;
    nom: string;
  };
  moniteur: {
    prenom: string;
    nom: string;
  };
}

const MesHeures = () => {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('effectuees');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedHeure, setSelectedHeure] = useState<Heure | null>(null);
  const [commentaire, setCommentaire] = useState('');

  useEffect(() => {
    const heuresSubscription = supabase
      .channel('heures-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'heures',
          filter: userRole === 'eleve' 
            ? `eleve_id=eq.${user?.id}` 
            : `moniteur_id=eq.${user?.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['heures'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(heuresSubscription);
    };
  }, [user?.id, userRole, queryClient]);

  const { data: heures, isLoading } = useQuery({
    queryKey: ['heures', user?.id, activeTab],
    queryFn: async () => {
      let query = supabase
        .from('heures')
        .select(`
          *,
          eleve:utilisateurs!heures_eleve_id_fkey(prenom, nom),
          moniteur:utilisateurs!heures_moniteur_id_fkey(prenom, nom)
        `);

      if (userRole === 'eleve') {
        query = query.eq('eleve_id', user?.id);
      } else if (userRole === 'moniteur') {
        query = query.eq('moniteur_id', user?.id);
      }

      if (activeTab === 'effectuees') {
        query = query.eq('heure_passee', true);
      } else if (activeTab === 'a_venir') {
        query = query
          .eq('reserve', true)
          .eq('heure_passee', false);
      } else if (activeTab === 'en_attente' && userRole === 'moniteur') {
        query = query
          .eq('reserve', false)
          .eq('heure_passee', false);
      }

      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw error;

      // Filtrer les heures en fonction de la date et l'heure actuelles
      const now = new Date();
      return (data as Heure[]).filter(heure => {
        const heureComplete = new Date(`${heure.date}T${heure.heure_fin}`);
        
        if (activeTab === 'effectuees') {
          return heure.heure_passee;
        } else if (activeTab === 'a_venir') {
          return heureComplete > now && heure.reserve && !heure.heure_passee;
        } else if (activeTab === 'en_attente') {
          return heureComplete > now && !heure.reserve && !heure.heure_passee;
        }
        return true;
      });
    },
  });

  const ajouterCommentaire = useMutation({
    mutationFn: async ({ heureId, commentaire }: { heureId: string; commentaire: string }) => {
      const { error } = await supabase
        .from('heures')
        .update({ 
          commentaires_moniteur: commentaire,
          heure_passee: true
        })
        .eq('id', heureId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heures'] });
      toast.success('Commentaire ajouté avec succès');
      setIsModalOpen(false);
      setSelectedHeure(null);
      setCommentaire('');
    },
    onError: () => {
      toast.error('Erreur lors de l\'ajout du commentaire');
    },
  });

  const annulerHeure = useMutation({
    mutationFn: async (heureId: string) => {
      if (userRole === 'moniteur' && activeTab === 'en_attente') {
        const { error } = await supabase
          .from('heures')
          .delete()
          .eq('id', heureId);

        if (error) throw error;
      } else {
        const { data: heure, error: heureError } = await supabase
          .from('heures')
          .select('eleve_id')
          .eq('id', heureId)
          .single();

        if (heureError) throw heureError;

        const { error: updateError } = await supabase
          .from('heures')
          .update({ 
            eleve_id: null,
            reserve: false
          })
          .eq('id', heureId);

        if (updateError) throw updateError;

        // Si c'est un élève qui annule, on lui rend son heure
        if (userRole === 'eleve' && heure.eleve_id) {
          const { error: incrementError } = await supabase
            .rpc('increment_heures', { user_id: heure.eleve_id });

          if (incrementError) throw incrementError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heures'] });
      queryClient.invalidateQueries({ queryKey: ['utilisateur-heures'] });
      toast.success('Heure annulée avec succès');
      setIsConfirmModalOpen(false);
      setSelectedHeure(null);
    },
    onError: () => {
      toast.error('Erreur lors de l\'annulation de l\'heure');
    },
  });

  const handleAjoutCommentaire = () => {
    if (!selectedHeure || !commentaire.trim()) return;
    ajouterCommentaire.mutate({ heureId: selectedHeure.id, commentaire });
  };

  const handleAnnulation = () => {
    if (selectedHeure) {
      annulerHeure.mutate(selectedHeure.id);
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

  const tabs = [
    { id: 'effectuees', label: 'Heures effectuées' },
    { id: 'a_venir', label: 'À venir' },
    ...(userRole === 'moniteur' ? [{ id: 'en_attente', label: 'En attente' }] : []),
  ];

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd MMMM yyyy', { locale: fr });
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  return (
    <>
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Mes heures</h1>

        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <ul className="divide-y divide-gray-200">
            {heures?.map((heure) => (
              <li key={heure.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(heure.date)} - {formatTime(heure.heure_debut)} à {formatTime(heure.heure_fin)}
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      {userRole === 'eleve' ? (
                        <>Moniteur : {heure.moniteur.prenom} {heure.moniteur.nom}</>
                      ) : (
                        <>Élève : {heure.eleve ? `${heure.eleve.prenom} ${heure.eleve.nom}` : 'Non réservé'}</>
                      )}
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      Véhicule : {heure.modele_vehicule} ({heure.boite_vitesse})
                    </p>
                    {heure.commentaires_moniteur && (
                      <div className="mt-2 bg-gray-50 p-3 rounded-md">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Commentaire du moniteur :</span>{' '}
                          {heure.commentaires_moniteur}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex flex-col space-y-2">
                    {((userRole === 'moniteur' && (activeTab === 'a_venir' || activeTab === 'en_attente')) ||
                      (userRole === 'eleve' && activeTab === 'a_venir')) && (
                      <button
                        onClick={() => {
                          setSelectedHeure(heure);
                          setIsConfirmModalOpen(true);
                        }}
                        className="bg-red-100 text-red-700 hover:bg-red-200 px-4 py-2 rounded-md text-sm font-medium"
                      >
                        Annuler
                      </button>
                    )}
                    {userRole === 'moniteur' && activeTab === 'effectuees' && !heure.commentaires_moniteur && (
                      <button
                        onClick={() => {
                          setSelectedHeure(heure);
                          setIsModalOpen(true);
                        }}
                        className="bg-primary-100 text-primary-700 hover:bg-primary-200 px-4 py-2 rounded-md text-sm font-medium"
                      >
                        Ajouter un commentaire
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
            {heures?.length === 0 && (
              <li className="px-4 py-8 sm:px-6 text-center text-gray-500">
                Aucune heure {activeTab === 'effectuees' ? 'effectuée' : activeTab === 'a_venir' ? 'à venir' : 'en attente'}
              </li>
            )}
          </ul>
        </div>

        {/* Modal de confirmation d'annulation */}
        <Dialog
          open={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          className="fixed z-10 inset-0 overflow-y-auto"
        >
          <div className="flex items-center justify-center min-h-screen">
            <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

            <div className="relative bg-white rounded-lg p-8 max-w-md w-full mx-4">
              <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
                Confirmer l'annulation
              </Dialog.Title>

              <p className="text-sm text-gray-500 mb-6">
                Êtes-vous sûr de vouloir annuler cette heure de conduite ?
                {selectedHeure && (
                  <span className="block mt-2 font-medium">
                    {formatDate(selectedHeure.date)} - {formatTime(selectedHeure.heure_debut)} à {formatTime(selectedHeure.heure_fin)}
                  </span>
                )}
              </p>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setIsConfirmModalOpen(false);
                    setSelectedHeure(null);
                  }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                >
                  Non, annuler
                </button>
                <button
                  onClick={handleAnnulation}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                >
                  Oui, confirmer
                </button>
              </div>

              <button
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  setSelectedHeure(null);
                }}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Fermer</span>
                ×
              </button>
            </div>
          </div>
        </Dialog>

        {/* Modal d'ajout de commentaire */}
        <Dialog
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          className="fixed z-10 inset-0 overflow-y-auto"
        >
          <div className="flex items-center justify-center min-h-screen">
            <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

            <div className="relative bg-white rounded-lg p-8 max-w-md w-full mx-4">
              <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
                Ajouter un commentaire
              </Dialog.Title>

              <div className="mb-4">
                <p className="text-sm text-gray-500">
                  {selectedHeure && `${formatDate(selectedHeure.date)} - ${formatTime(selectedHeure.heure_debut)} à ${formatTime(selectedHeure.heure_fin)}`}
                </p>
                <p className="text-sm text-gray-500">
                  {selectedHeure?.eleve && `Élève : ${selectedHeure.eleve.prenom} ${selectedHeure.eleve.nom}`}
                </p>
              </div>

              <textarea
                className="w-full h-32 p-2 border rounded-md"
                placeholder="Votre commentaire..."
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
              />

              <div className="mt-6 flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedHeure(null);
                    setCommentaire('');
                  }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAjoutCommentaire}
                  className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                >
                  Enregistrer
                </button>
              </div>

              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedHeure(null);
                  setCommentaire('');
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

export default MesHeures;