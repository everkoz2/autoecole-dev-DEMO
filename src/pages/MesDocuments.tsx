import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { Dialog } from '@headlessui/react';
import toast from 'react-hot-toast';

interface Document {
  id: string;
  type: 'resultat_code' | 'neph' | 'ants' | 'contrat';
  url: string;
  uploaded_at: string;
}

interface MesDocumentsProps {
  userId?: string;
  isAdmin?: boolean;
}

const documentTypes = {
  resultat_code: 'Résultat du code',
  neph: 'Numéro NEPH',
  ants: 'Documents ANTS',
  contrat: 'Contrat de conduite',
};

const MesDocuments = ({ userId, isAdmin }: MesDocumentsProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [selectedType, setSelectedType] = useState<'resultat_code' | 'neph' | 'ants' | 'contrat'>('resultat_code');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [nephNumber, setNephNumber] = useState('');

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', userId ?? user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('eleve_id', userId ?? user?.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data as Document[];
    },
  });

  const handleDownload = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(link.href);
  } catch (err) {
    toast.error('Erreur lors du téléchargement');
  }
};

  const uploadDocument = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: string }) => {
      // Vérifier si un document de ce type existe déjà
      const existingDoc = documents?.find(doc => doc.type === type);
      if (existingDoc) {
        throw new Error(`Un document de type ${documentTypes[type]} existe déjà`);
      }

      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${type}_${timestamp}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          eleve_id: userId ?? user?.id,
          type,
          url: publicUrl,
        });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document ajouté avec succès');
      setIsModalOpen(false);
      setSelectedFile(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addNephNumber = useMutation({
    mutationFn: async (nephNumber: string) => {
      // Vérifier si un numéro NEPH existe déjà
      const existingNeph = documents?.find(doc => doc.type === 'neph');
      if (existingNeph) {
        throw new Error('Un numéro NEPH existe déjà');
      }

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          eleve_id: userId ?? user?.id,
          type: 'neph',
          url: nephNumber,
        });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Numéro NEPH ajouté avec succès');
      setIsModalOpen(false);
      setNephNumber('');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (document: Document) => {
      if (document.type !== 'neph') {
        const filePath = document.url.split('/').slice(-2).join('/');
        
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([filePath]);

        if (storageError) throw storageError;
      }

      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document supprimé avec succès');
      setIsConfirmDeleteOpen(false);
      setDocumentToDelete(null);
    },
    onError: () => {
      toast.error('Erreur lors de la suppression du document');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Le fichier est trop volumineux (max 5MB)');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedType === 'neph') {
      if (!nephNumber.trim()) {
        toast.error('Veuillez entrer un numéro NEPH');
        return;
      }
      addNephNumber.mutate(nephNumber);
    } else {
      if (!selectedFile) {
        toast.error('Veuillez sélectionner un fichier');
        return;
      }
      uploadDocument.mutate({ file: selectedFile, type: selectedType });
    }
  };

  const handleDelete = (document: Document) => {
    setDocumentToDelete(document);
    setIsConfirmDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (documentToDelete) {
      deleteDocument.mutate(documentToDelete);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Filtrer les types de documents disponibles
  const availableTypes = Object.entries(documentTypes).filter(([type]) => 
    !documents?.some(doc => doc.type === type)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mes documents</h1>
        {availableTypes.length > 0 && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            Ajouter un document
          </button>
        )}
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg leading-6 font-medium text-gray-900">
            Documents administratifs
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Tous vos documents importants liés à votre formation
          </p>
        </div>
        <div className="border-t border-gray-200">
          <ul className="divide-y divide-gray-200">
            {documents?.map((document) => (
              <li key={document.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {documentTypes[document.type]}
                    </h3>
                    {document.type === 'neph' ? (
                      <p className="mt-2 text-sm text-gray-500">
                        Numéro : {document.url}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-gray-500">
                        Ajouté le {new Date(document.uploaded_at).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    {document.type !== 'neph' && (
                      <>
                        <a
                          href={document.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-primary-100 text-primary-700 hover:bg-primary-200 px-4 py-2 rounded-md text-sm font-medium"
                        >
                          Voir
                        </a>
                        <a
                          href="#"
                          onClick={e => {
                            e.preventDefault();
                            handleDownload(document.url, `document_${document.id}`);
                          }}
                          className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-2 rounded-md text-sm font-medium"
                        >
                          Télécharger
                        </a>
                      </>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(document)}
                        className="bg-red-100 text-red-700 hover:bg-red-200 px-4 py-2 rounded-md text-sm font-medium"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
            {documents?.length === 0 && (
              <li className="px-4 py-8 sm:px-6 text-center text-gray-500">
                Aucun document disponible
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Modal d'ajout de document */}
      <Dialog
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedFile(null);
          setNephNumber('');
        }}
        className="fixed z-10 inset-0 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen">
          <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

          <div className="relative bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
              Ajouter un document
            </Dialog.Title>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Type de document
                </label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as any)}
                >
                  {availableTypes.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedType === 'neph' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Numéro NEPH
                  </label>
                  <input
                    type="text"
                    value={nephNumber}
                    onChange={(e) => setNephNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    placeholder="Entrez votre numéro NEPH"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Fichier (PDF, JPG, PNG - max 5MB)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="mt-1 block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-medium
                      file:bg-primary-50 file:text-primary-700
                      hover:file:bg-primary-100"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedFile(null);
                    setNephNumber('');
                  }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                >
                  Ajouter
                </button>
              </div>
            </form>

            <button
              onClick={() => {
                setIsModalOpen(false);
                setSelectedFile(null);
                setNephNumber('');
              }}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Fermer</span>
              ×
            </button>
          </div>
        </div>
      </Dialog>

      {/* Modal de confirmation de suppression */}
      <Dialog
        open={isConfirmDeleteOpen}
        onClose={() => {
          setIsConfirmDeleteOpen(false);
          setDocumentToDelete(null);
        }}
        className="fixed z-10 inset-0 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen">
          <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

          <div className="relative bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
              Confirmer la suppression
            </Dialog.Title>

            <p className="text-sm text-gray-500 mb-6">
              Êtes-vous sûr de vouloir supprimer ce document ?
              {documentToDelete && (
                <span className="block mt-2 font-medium">
                  {documentTypes[documentToDelete.type]}
                </span>
              )}
            </p>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setIsConfirmDeleteOpen(false);
                  setDocumentToDelete(null);
                }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Supprimer
              </button>
            </div>

            <button
              onClick={() => {
                setIsConfirmDeleteOpen(false);
                setDocumentToDelete(null);
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

export default MesDocuments;
