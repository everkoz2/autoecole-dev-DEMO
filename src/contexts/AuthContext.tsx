import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase/client';
import toast from 'react-hot-toast';

function slugify(nom: string) {
  return nom
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

interface AuthContextType {
  user: any;
  userRole: string;
  autoEcoleSlug: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string, phone: string, nomAutoecole?: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [autoEcoleSlug, setAutoEcoleSlug] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const navigate = useNavigate();
  const { autoEcoleSlug: urlAutoEcoleSlug } = useParams();

  // Récupère le slug de l'utilisateur (depuis la table utilisateurs et auto_ecoles)
  const fetchUserRoleAndSlug = async (userId: string): Promise<{ role: string, slug: string | null }> => {
    try {
      // On récupère le role et l'id de l'auto-école de l'utilisateur
      const { data, error } = await supabase
        .from('utilisateurs')
        .select('role, auto_ecole_id')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) {
        console.error('Error fetching user role:', error);
        return { role: '', slug: null };
      }

      // On récupère le slug de l'auto-école
      let slug: string | null = null;
      if (data.auto_ecole_id) {
        const { data: autoEcole, error: autoEcoleError } = await supabase
          .from('auto_ecoles')
          .select('slug')
          .eq('id', data.auto_ecole_id)
          .maybeSingle();
        if (autoEcoleError) {
          console.error('Error fetching autoEcole slug:', autoEcoleError);
        }
        slug = autoEcole?.slug || null;
      }

      setAutoEcoleSlug(slug || urlAutoEcoleSlug || null);

      return { role: data.role || '', slug: slug || null };
    } catch (error) {
      console.error('Error in fetchUserRoleAndSlug:', error);
      return { role: '', slug: null };
    }
  };

  const signOut = async () => {
    try {
      setIsAuthLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setUserRole('');
      setAutoEcoleSlug(null);
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
          const { role, slug } = await fetchUserRoleAndSlug(session.user.id);
          if (mounted) {
            setUser(session.user);
            setUserRole(role);
            setAutoEcoleSlug(slug);
          }
        } else {
          if (mounted) {
            setUser(null);
            setUserRole('');
            setAutoEcoleSlug(null);
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
  }, [urlAutoEcoleSlug]);

  const signIn = async (email: string, password: string) => {
    try {
      setIsAuthLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.session) {
        const { role, slug } = await fetchUserRoleAndSlug(data.user.id);
        setUser(data.user);
        setUserRole(role);
        setAutoEcoleSlug(slug);

        if (urlAutoEcoleSlug) {
          navigate(`/${urlAutoEcoleSlug}/accueil`);
        } else if (slug) {
          navigate(`/${slug}/accueil`);
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
    autoEcoleIdOrNom?: string // <-- peut être un nom ou un id
  ) => {
    try {
      setIsAuthLoading(true);

      // Création du compte dans Supabase Auth
      const { data: { user: newUser }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;
      if (!newUser) throw new Error("Erreur lors de la création du compte");

      let autoEcoleId = autoEcoleIdOrNom;
      let slug: string | null = null;

      // Si c'est une création d'auto-école (on reçoit un nom, pas un UUID)
      if (autoEcoleIdOrNom && !/^[0-9a-fA-F-]{36}$/.test(autoEcoleIdOrNom)) {
        slug = slugify(autoEcoleIdOrNom);
        const { data: autoEcole, error: autoEcoleError } = await supabase
          .from('auto_ecoles')
          .insert({ nom: autoEcoleIdOrNom, slug })
          .select()
          .single();

        if (autoEcoleError) {
          await supabase.auth.admin.deleteUser(newUser.id);
          throw autoEcoleError;
        }
        autoEcoleId = autoEcole.id;
        slug = autoEcole.slug;

        // 2. Créer l'utilisateur dans la table utilisateurs
        const { error: userError } = await supabase
          .from('utilisateurs')
          .insert({
            id: newUser.id,
            email,
            prenom: firstName,
            nom: lastName,
            telephone: phone,
            role: 'admin',
            auto_ecole_id: autoEcoleId
          });

        if (userError) {
          await supabase.auth.admin.deleteUser(newUser.id);
          throw userError;
        }

        // 3. Mettre à jour l'auto-école pour renseigner l'admin_id
        const { error: updateAdminError } = await supabase
          .from('auto_ecoles')
          .update({ admin_id: newUser.id })
          .eq('id', autoEcoleId);

        if (updateAdminError) {
          console.warn('Erreur lors de la mise à jour de admin_id:', updateAdminError);
        }

        setUser(newUser);
        setUserRole('admin');
        setAutoEcoleSlug(slug);

        if (slug) {
          navigate(`/${slug}/accueil`);
        } else {
          navigate('/');
        }
        return;
      }

      // Cas inscription élève (autoEcoleIdOrNom est un UUID)
      if (autoEcoleId) {
        // On récupère le slug correspondant à l'id
        const { data: autoEcole, error: autoEcoleError } = await supabase
          .from('auto_ecoles')
          .select('slug')
          .eq('id', autoEcoleId)
          .maybeSingle();
        slug = autoEcole?.slug || null;
      }

      const { error: userError } = await supabase
        .from('utilisateurs')
        .insert({
          id: newUser.id,
          email,
          prenom: firstName,
          nom: lastName,
          telephone: phone,
          role: 'eleve',
          auto_ecole_id: autoEcoleId
        });

      if (userError) {
        await supabase.auth.admin.deleteUser(newUser.id);
        throw userError;
      }

      setUser(newUser);
      setUserRole('eleve');
      setAutoEcoleSlug(slug);

      if (slug) {
        navigate(`/${slug}/accueil`);
      } else {
        navigate('/');
      }

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
      autoEcoleSlug,
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