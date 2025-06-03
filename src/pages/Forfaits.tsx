import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { Dialog } from '@headlessui/react';
import toast from 'react-hot-toast';
import { useStripe } from '../hooks/useStripe';
import Navigation from '../components/Navigation';

interface Forfait {
  id: number;
  nom: string;
  description: string;
  prix: number;
}

interface ForfaitFormData {
  id?: number;
  nom: string;
  description: string;
  prix: string;
}

const Forfaits = () => {
  const { user, userRole, autoEcoleId } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingForfait, setEditingForfait] = useState<ForfaitFormData | null>(null);
  const { checkout, isLoading } = useStripe();

  const { data: forfaits, isLoading: isLoadingForfaits } = useQuery({
    queryKey: ['forfaits', autoEcoleId],
    queryFn: async () => {
      if (!autoEcoleId) return [];
      const { data, error } = await supabase
        .from('forfaits')
        .select('*')
        .eq('auto_ecole_id', autoEcoleId) // Filtre par auto_ecole_id
        .order('prix');
      if (error) throw error;
      return data as Forfait[];
    },
    enabled: !!autoEcoleId, // N'exécute la requête que si autoEcoleId est défini
  });

  const handleCheckout = async (forfaitId: number) => {
    try {
      if (forfaitId === 1) {
        await checkout('forfait_5h');
      } else if (forfaitId === 2) {
        await checkout('forfait_20h');
      } else if (forfaitId === 3) {
        await checkout('forfait_test');
      } else {
        toast.error('Forfait non disponible pour l\'achat en ligne');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Erreur lors de la création de la session de paiement');
    }
  };

  const createForfait = useMutation({
    mutationFn: async (forfait: ForfaitFormData) => {
      const { error } = await supabase
        .from('forfaits')
        .insert({
          nom: forfait.nom,
          description: forfait.description,
          prix: parseFloat(forfait.prix),
          auto_ecole_id: autoEcoleId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forfaits', autoEcoleId] });
      toast.success('Forfait créé avec succès');
      setIsModalOpen(false);
      setEditingForfait(null);
    },
    onError: () => {
      toast.error('Erreur lors de la création du forfait');
    },
  });

  const updateForfait = useMutation({
    mutationFn: async (forfait: ForfaitFormData) => {
      const { error } = await supabase
        .from('forfaits')
        .update({
          nom: forfait.nom,
          description: forfait.description,
          prix: parseFloat(forfait.prix),
          auto_ecole_id: autoEcoleId,
        })
        .eq('id', forfait.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forfaits', autoEcoleId] });
      toast.success('Forfait modifié avec succès');
      setIsModalOpen(false);
      setEditingForfait(null);
    },
    onError: () => {
      toast.error('Erreur lors de la modification du forfait');
    },
  });

  const deleteForfait = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('forfaits')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forfaits', autoEcoleId] });
      toast.success('Forfait supprimé avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression du forfait');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingForfait) return;
    if (editingForfait.id) {
      updateForfait.mutate(editingForfait);
    } else {
      createForfait.mutate(editingForfait);
    }
  };

  if (isLoadingForfaits) {
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Nos Forfaits
          </h1>
          {userRole === 'admin' && (
            <button
              onClick={() => {
                setEditingForfait({ nom: '', description: '', prix: '' });
                setIsModalOpen(true);
              }}
              className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
            >
              Ajouter un forfait
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {forfaits?.map((forfait) => (
            <div
              key={forfait.id}
              className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:scale-105"
            >
              <div className="p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  {forfait.nom}
                </h2>
                <p className="text-gray-600 mb-4">{forfait.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-bold text-primary-600">
                    {forfait.prix}€
                  </span>
                  <div className="flex space-x-2">
                    {user && userRole === 'eleve' && (
                      <button
                        className={`bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 transition-colors ${
                          isLoading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={() => handleCheckout(forfait.id)}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Chargement...' : 'Acheter'}
                      </button>
                    )}
                    {userRole === 'admin' && (
                      <>
                        <button
                          onClick={() => {
                            setEditingForfait({
                              id: forfait.id,
                              nom: forfait.nom,
                              description: forfait.description,
                              prix: forfait.prix.toString(),
                            });
                            setIsModalOpen(true);
                          }}
                          className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Êtes-vous sûr de vouloir supprimer ce forfait ?')) {
                              deleteForfait.mutate(forfait.id);
                            }
                          }}
                          className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                        >
                          Supprimer
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Dialog
          open={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingForfait(null);
          }}
          className="fixed z-10 inset-0 overflow-y-auto"
        >
          <div className="flex items-center justify-center min-h-screen">
            <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

            <div className="relative bg-white rounded-lg p-8 max-w-md w-full mx-4">
              <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
                {editingForfait?.id ? 'Modifier le forfait' : 'Ajouter un forfait'}
              </Dialog.Title>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nom
                  </label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={editingForfait?.nom || ''}
                    onChange={(e) => setEditingForfait(prev => ({ ...prev!, nom: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    required
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={editingForfait?.description || ''}
                    onChange={(e) => setEditingForfait(prev => ({ ...prev!, description: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Prix (€)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={editingForfait?.prix || ''}
                    onChange={(e) => setEditingForfait(prev => ({ ...prev!, prix: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingForfait(null);
                    }}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                  >
                    {editingForfait?.id ? 'Modifier' : 'Ajouter'}
                  </button>
                </div>
              </form>

              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingForfait(null);
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

export default Forfaits;