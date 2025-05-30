import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Log {
  id: string;
  utilisateur_id: string;
  action: string;
  table_cible: string;
  valeur_cible: string;
  message: string;
  created_at: string;
  utilisateur: {
    prenom: string;
    nom: string;
    email: string;
  };
}

const Logs = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tableFilter, setTableFilter] = useState('toutes');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logs')
        .select(`
          *,
          utilisateur:utilisateurs(prenom, nom, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Log[];
    },
  });

  // Obtenir la liste unique des tables
  const tables = logs ? [...new Set(logs.map(log => log.table_cible))] : [];

  const filteredLogs = logs?.filter(log => {
    const matchesSearch = (
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.utilisateur?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.utilisateur?.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.utilisateur?.nom.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesTable = tableFilter === 'toutes' || log.table_cible === tableFilter;
    return matchesSearch && matchesTable;
  });

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd MMMM yyyy à HH:mm:ss', { locale: fr });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Logs du système</h1>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Rechercher dans les logs..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex space-x-4">
          <select
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="toutes">Toutes les tables</option>
            {tables.map(table => (
              <option key={table} value={table}>
                {table}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="divide-y divide-gray-200">
          {filteredLogs?.map((log) => (
            <div key={log.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full
                    ${log.action === 'INSERT' ? 'bg-green-100 text-green-800' :
                      log.action === 'UPDATE' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'}`}>
                    {log.action}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    Table: {log.table_cible}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {formatDate(log.created_at)}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {log.message}
              </p>
              {log.utilisateur && (
                <p className="text-sm text-gray-500">
                  Par {log.utilisateur.prenom} {log.utilisateur.nom} ({log.utilisateur.email})
                </p>
              )}
            </div>
          ))}
          {filteredLogs?.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              Aucun log trouvé
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Logs;