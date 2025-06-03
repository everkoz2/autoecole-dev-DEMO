import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase/client';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: any;
  userRole: string;
  autoEcoleId: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string, phone: string, nomAutoecole: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [autoEcoleId, setAutoEcoleId] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const navigate = useNavigate();
  const { autoEcoleId: urlAutoEcoleId } = useParams();

  const fetchUserRole = async (userId: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('utilisateurs')
        .select('role, auto_ecole_id')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return '';
      }

      // Mettre à jour l'ID de l'auto-école
      setAutoEcoleId(data?.auto_ecole_id || null);

      // Vérifier si l'utilisateur appartient à l'auto-école actuelle
      if (urlAutoEcoleId && data?.auto_ecole_id !== urlAutoEcoleId) {
        return '';
      }

      return data?.role || '';
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      return '';
    }
  };

  const signOut = async () => {
    try {
      setIsAuthLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setUserRole('');
      setAutoEcoleId(null);
      navigate('/');
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    } finally {
      setIsAuthLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let initialSessionChecked = false;

    const handleAuthChange = async (event: string, session: any) => {
      if (!mounted) return;

      try {
        if (session?.user) {
          const role = await fetchUserRole(session.user.id);
          if (mounted) {
            setUser(session.user);
            setUserRole(role);
          }
        } else {
          if (mounted) {
            setUser(null);
            setUserRole('');
            setAutoEcoleId(null);
          }
        }
      } catch (error) {
        console.error('Error in handleAuthChange:', error);
      } finally {
        if (mounted) {
          setIsAuthLoading(false);
          if (!initialSessionChecked) {
            setIsBootstrapping(false);
            initialSessionChecked = true;
          }
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        handleAuthChange('INITIAL_SESSION', session);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== 'INITIAL_SESSION') {
        handleAuthChange(event, session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [urlAutoEcoleId]);

  const signIn = async (email: string, password: string) => {
    try {
      setIsAuthLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;

      if (data.session) {
        const role = await fetchUserRole(data.user.id);
        setUser(data.user);
        setUserRole(role);
        
        // Rediriger vers la page de l'auto-école si disponible
        if (autoEcoleId) {
          navigate(`/${autoEcoleId}`);
        } else {
          navigate('/');
        }
      }
    } catch (error: any) {
      let message = 'Email ou mot de passe incorrect';
      toast.error(message);
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone: string,
    nomAutoecole: string
  ) => {
    try {
      setIsAuthLoading(true);

      const { data: { user: newUser }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;
      if (!newUser) throw new Error("Erreur lors de la création du compte");

      const { data: autoEcole, error: autoEcoleError } = await supabase
        .from('auto_ecoles')
        .insert({
          nom: nomAutoecole,
          admin_id: newUser.id
        })
        .select()
        .single();

      if (autoEcoleError) {
        await supabase.auth.admin.deleteUser(newUser.id);
        throw autoEcoleError;
      }

      const { error: userError } = await supabase
        .from('utilisateurs')
        .insert({
          id: newUser.id,
          email,
          prenom: firstName,
          nom: lastName,
          telephone: phone,
          role: 'admin',
          auto_ecole_id: autoEcole.id
        });

      if (userError) {
        await supabase.from('auto_ecoles').delete().eq('id', autoEcole.id);
        await supabase.auth.admin.deleteUser(newUser.id);
        throw userError;
      }

      setUser(newUser);
      setUserRole('admin');
      setAutoEcoleId(autoEcole.id);
      navigate('/success');

    } catch (error: any) {
      console.error('Error in signUp:', error);
      toast.error(error.message || "Erreur lors de la création du compte");
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  if (isBootstrapping) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      userRole, 
      autoEcoleId,
      signIn, 
      signUp, 
      signOut, 
      isAuthLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 