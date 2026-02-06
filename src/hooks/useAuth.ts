import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

const ALLOWED_EMAIL_DOMAIN = import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN;

export const ALLOWED_EMAIL_DOMAIN_MESSAGE =
  typeof ALLOWED_EMAIL_DOMAIN === 'string' && ALLOWED_EMAIL_DOMAIN
    ? `Only ${ALLOWED_EMAIL_DOMAIN} emails are allowed.`
    : 'Allowed email domain is not configured.';

export function isAllowedEmail(email: string | null): boolean {
  if (!email || typeof ALLOWED_EMAIL_DOMAIN !== 'string' || !ALLOWED_EMAIL_DOMAIN) return false;
  return email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN.toLowerCase());
}

export interface AuthUser {
  id: string;
  email: string | null;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: Error | null;
}

function mapFirebaseUser(fbUser: FirebaseUser | null): AuthUser | null {
  if (!fbUser) return null;
  return {
    id: fbUser.uid,
    email: fbUser.email ?? null,
    user_metadata: {
      full_name: fbUser.displayName ?? undefined,
      avatar_url: fbUser.photoURL ?? undefined,
    },
  };
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser && !isAllowedEmail(fbUser.email ?? null)) {
        firebaseSignOut(auth).then(() => {
          setState({
            user: null,
            loading: false,
            error: new Error(ALLOWED_EMAIL_DOMAIN_MESSAGE),
          });
        });
        return;
      }
      setState((prev) => ({
        ...prev,
        user: mapFirebaseUser(fbUser),
        loading: false,
        error: null,
      }));
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
      if (!isAllowedEmail(user.email ?? null)) {
        await firebaseSignOut(auth);
        const err = new Error(ALLOWED_EMAIL_DOMAIN_MESSAGE);
        setState((prev) => ({ ...prev, loading: false, user: null, error: err }));
        toast({
          title: 'Access restricted',
          description: ALLOWED_EMAIL_DOMAIN_MESSAGE,
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Signed in',
        description: 'You are now signed in with Google.',
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sign-in failed');
      setState((prev) => ({ ...prev, loading: false, error }));
      toast({
        title: 'Sign-in failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const signOut = async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      await firebaseSignOut(auth);
      setState({ user: null, loading: false, error: null });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sign-out failed');
      setState((prev) => ({ ...prev, loading: false, error }));
      toast({
        title: 'Sign out failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return {
    ...state,
    signInWithGoogle,
    signOut,
    isAuthenticated: !!state.user,
    isAllowedUser: !!state.user && isAllowedEmail(state.user.email),
  };
}
