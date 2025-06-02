import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { Dialog } from '@headlessui/react';
import toast from 'react-hot-toast';
import LivretApprentissage from './LivretApprentissage';
import MesDocuments from './MesDocuments';
import { useAuth } from '../contexts/AuthContext'; // Assure-toi d'avoir accès à l'utilisateur connecté

interface User {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  telephone: string;
  role: 'eleve' | 'moniteur' | 'admin';
  forfait_id: number | null;
  heures_restantes: number;
  heures_effectuees: number;
}

interface Forfait {
  id: number;
  nom: string;
}

const GestionUtilisateurs = () => {
  // ...existing code...
  const { user } = useAuth(); // Récupère l'utilisateur connecté

  // Récupère l'auto_ecole_id de l'admin connecté (à adapter selon ton modèle)
  const [autoEcoleId, setAutoEcoleId] = useState<string | null>(null);

  // Va chercher l'auto_ecole_id au montage si besoin
  useEffect(() => {
    const fetchAutoEcoleId = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('utilisateurs')
          .select('auto_ecole_id')
          .eq('id', user.id)
          .single();
        if (data) setAutoEcoleId(data.auto_ecole_id);
      }
    };
    fetchAutoEcoleId();
  }, [user]);

  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users', autoEcoleId],
    queryFn: async () => {
      if (!autoEcoleId) return [];
      const { data, error } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('auto_ecole_id', autoEcoleId) // <-- Filtre ici
        .order('nom');
      if (error) throw error;
      return data as User[];
    },
    enabled: !!autoEcoleId, // N'exécute la requête que si autoEcoleId est défini
  });

  const { data: forfaits } = useQuery({
    queryKey: ['forfaits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forfaits')
        .select('id, nom');

      if (error) throw error;
      return data as Forfait[];
    },
  });

  const updateUser = useMutation({
    mutationFn: async (user: User) => {
      const { error } = await supabase
        .from('utilisateurs')
        .update({
          prenom: user.prenom,
          nom: user.nom,
          telephone: user.telephone,
          role: user.role,
          forfait_id: user.forfait_id,
          heures_restantes: user.heures_restantes,
        })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur modifié avec succès');
      setIsEditModalOpen(false);
      setEditingUser(null);
    },
    onError: () => {
      toast.error('Erreur lors de la modification de l\'utilisateur');
    },
  });

  const filteredUsers = users?.filter(user => {
    const matchesSearch = (
      user.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesRole = roleFilter === 'tous' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (isLoadingUsers) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Gestion des utilisateurs</h1>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex space-x-4">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="tous">Tous les utilisateurs</option>
            <option value="eleve">Élèves</option>
            <option value="moniteur">Moniteurs</option>
            <option value="admin">Administrateurs</option>
          </select>
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
                Rôle
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers?.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {user.prenom} {user.nom}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{user.telephone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'moniteur' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'}`}>
                    {user.role === 'admin' ? 'Administrateur' :
                     user.role === 'moniteur' ? 'Moniteur' : 'Élève'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button
                    onClick={() => {
                      setEditingUser(user);
                      setIsEditModalOpen(true);
                    }}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    Modifier
                  </button>
                  {user.role === 'eleve' && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setIsAppreciationModalOpen(true);
                        }}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Appréciation
                      </button>
                      <button
                        onClick={() => {
                          setSelectedDocumentsUser(user);
                          setIsDocumentsModalOpen(true);
                        }}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Documents
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de modification */}
      <Dialog
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingUser(null);
        }}
        className="fixed z-10 inset-0 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen">
          <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

          <div className="relative bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
              Modifier l'utilisateur
            </Dialog.Title>

            {editingUser && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editingUser) {
                    updateUser.mutate(editingUser);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingUser.email}
                    disabled
                    className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={editingUser.prenom}
                    onChange={(e) => setEditingUser({ ...editingUser, prenom: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={editingUser.nom}
                    onChange={(e) => setEditingUser({ ...editingUser, nom: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={editingUser.telephone}
                    onChange={(e) => setEditingUser({ ...editingUser, telephone: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Rôle
                  </label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as User['role'] })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="eleve">Élève</option>
                    <option value="moniteur">Moniteur</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>

                {editingUser.role === 'eleve' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Forfait
                      </label>
                      <select
                        value={editingUser.forfait_id || ''}
                        onChange={(e) => setEditingUser({ ...editingUser, forfait_id: parseInt(e.target.value) || null })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      >
                        <option value="">Aucun forfait</option>
                        {forfaits?.map((forfait) => (
                          <option key={forfait.id} value={forfait.id}>
                            {forfait.nom}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Heures restantes
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editingUser.heures_restantes}
                        onChange={(e) => setEditingUser({ ...editingUser, heures_restantes: parseInt(e.target.value) })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingUser(null);
                    }}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            )}

            <button
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingUser(null);
              }}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Fermer</span>
              ×
            </button>
          </div>
        </div>
      </Dialog>

      {/* Modal des appréciations */}
      <Dialog
        open={isAppreciationModalOpen}
        onClose={() => {
          setIsAppreciationModalOpen(false);
          setSelectedUser(null);
        }}
        className="fixed z-10 inset-0 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen">
          <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

          <div className="relative bg-white rounded-lg p-8 max-w-4xl w-full mx-4">
            <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
              Appréciations de {selectedUser?.prenom} {selectedUser?.nom}
            </Dialog.Title>

            {selectedUser && (
              <div className="min-h-[400px]">
                <LivretApprentissage userId={selectedUser.id} />
              </div>
            )}

            <button
              onClick={() => {
                setIsAppreciationModalOpen(false);
                setSelectedUser(null);
              }}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Fermer</span>
              ×
            </button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={isDocumentsModalOpen}
        onClose={() => {
          setIsDocumentsModalOpen(false);
          setSelectedDocumentsUser(null);
        }}
        className="fixed z-10 inset-0 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen">
          <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

          <div className="relative bg-white rounded-lg p-8 max-w-4xl w-full mx-4">
            <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
              Documents de {selectedDocumentsUser?.prenom} {selectedDocumentsUser?.nom}
            </Dialog.Title>

            {selectedDocumentsUser && (
              <div className="min-h-[400px]">
                {/* Réutilise le composant MesDocuments en mode admin */}
                <MesDocuments userId={selectedDocumentsUser.id} isAdmin />
              </div>
            )}

            <button
              onClick={() => {
                setIsDocumentsModalOpen(false);
                setSelectedDocumentsUser(null);
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
  );
};

export default GestionUtilisateurs;
