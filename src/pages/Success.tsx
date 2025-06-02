import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase/client';
import toast from 'react-hot-toast';

const Success = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [autoEcoleUrl, setAutoEcoleUrl] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchAutoEcole = async () => {
      const { data } = await supabase
        .from('auto_ecoles')
        .select('id')
        .eq('admin_id', user.id)
        .single();

      if (data) {
        // Utiliser l'URL de production
        setAutoEcoleUrl(`https://demo.verkoz.com/${data.id}`);
      }
    };

    fetchAutoEcole();
  }, [user, navigate]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(autoEcoleUrl);
    toast.success('Lien copié dans le presse-papier');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="flex flex-col items-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Votre auto-école a été créée avec succès !
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Partagez ce lien avec vos élèves pour qu'ils puissent rejoindre votre auto-école :
          </p>
          <div className="mt-4 flex items-center gap-2 bg-white p-3 rounded-lg shadow-sm">
            <input
              type="text"
              readOnly
              value={autoEcoleUrl}
              className="flex-1 text-sm text-gray-800 bg-transparent border-none focus:ring-0"
            />
            <button
              onClick={copyToClipboard}
              className="p-2 text-primary-600 hover:text-primary-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
            </button>
          </div>
        </div>
        <div className="mt-8 space-y-4">
          <Link
            to="/gestion-utilisateurs"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Gérer les utilisateurs
          </Link>
          <Link
            to="/"
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Success;