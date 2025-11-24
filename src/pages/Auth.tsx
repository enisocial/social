import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const signInSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères')
});

const signUpSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  username: z.string().min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères').max(30),
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword']
});

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;

const Auth = () => {
  const { user, signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  
  // États locaux pour nom et username
  const [nameValue, setNameValue] = useState('');
  const [usernameValue, setUsernameValue] = useState('');

  // Redirect to splash if this is first visit
  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem('splash_viewed');
    if (!hasSeenSplash) {
      navigate('/');
      return;
    }
    
    // Redirect authenticated users to feed
    if (user) {
      navigate('/feed');
    }
  }, [navigate, user]);

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    },
    mode: 'onChange'
  });

  const handleSignIn = async (data: SignInFormData) => {
    const result = await signIn(data.email, data.password);
    
    // Gérer "Se souvenir de moi"
    if (!result.error && rememberMe) {
      localStorage.setItem('rememberMe', 'true');
    }
  };

  const handleSignUp = async (data: SignUpFormData) => {
    // Utiliser les valeurs des états locaux
    await signUp(data.email, data.password, nameValue, usernameValue);
  };

  const handleGoogleSignIn = async () => {
    await signInWithGoogle();
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    await resetPassword(resetEmail);
    setShowForgotPassword(false);
    setResetEmail('');
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Left Sidebar */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 to-accent/10 p-12 flex-col justify-center">
        <div className="max-w-lg">
          <div className="flex items-center gap-3 mb-6">
            <img 
              src="/icon-192.png" 
              alt="Logo" 
              className="w-14 h-14 rounded-2xl shadow-glow"
            />
            <h1 className="text-5xl font-bold">
              <span className="text-primary">s</span>ocial
            </h1>
          </div>
          
          <h2 className="text-2xl font-semibold mb-4 text-foreground">
            Connectez-vous avec le monde
          </h2>
          
          <p className="text-muted-foreground text-lg leading-relaxed">
            Rejoignez une communauté dynamique où vous pouvez partager vos moments, découvrir de nouvelles passions et rester connecté avec vos proches.
          </p>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-lg p-8 sm:p-10">
            {activeTab === 'signin' ? (
              <>
                <div className="mb-8">
                  <h2 className="text-3xl font-bold mb-2">Bon retour !</h2>
                  <p className="text-muted-foreground">Connectez-vous pour continuer</p>
                </div>

                <Form {...signInForm}>
                  <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-5">
                    <FormField
                      control={signInForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                              <Input 
                                type="email" 
                                placeholder="vous@exemple.com" 
                                className="pl-10 h-12"
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={signInForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Mot de passe</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                              <Input 
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••" 
                                className="pl-10 pr-10 h-12"
                                {...field} 
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="remember" 
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                        />
                        <label
                          htmlFor="remember"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Se souvenir de moi
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-primary hover:underline font-medium"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>

                    <Button type="submit" className="w-full h-12 gradient-primary text-white text-base font-semibold">
                      Se connecter
                    </Button>
                  </form>
                </Form>

                <div className="my-6 flex items-center gap-4">
                  <Separator className="flex-1" />
                  <span className="text-sm text-muted-foreground">Ou continuer avec</span>
                  <Separator className="flex-1" />
                </div>

                <Button 
                  variant="outline" 
                  className="h-12 w-full" 
                  type="button"
                  onClick={handleGoogleSignIn}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continuer avec Google
                </Button>

                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Nouveau sur social ?{' '}
                    <button
                      onClick={() => setActiveTab('signup')}
                      className="text-primary hover:underline font-semibold"
                    >
                      Créer un compte
                    </button>
                  </p>
                </div>

                <div className="mt-8 text-center text-xs text-muted-foreground">
                  En continuant, vous acceptez nos{' '}
                  <Link to="/terms" className="text-primary hover:underline">
                    Conditions d'utilisation
                  </Link>{' '}
                  et notre{' '}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Politique de confidentialité
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="mb-8">
                  <h2 className="text-3xl font-bold mb-2">Créer un compte</h2>
                  <p className="text-muted-foreground">Rejoignez social aujourd'hui</p>
                </div>

                <Form {...signUpForm}>
                  <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-medium">Nom complet</label>
                      <input 
                        id="name"
                        type="text"
                        placeholder="Jean Dupont" 
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={nameValue}
                        onChange={(e) => {
                          setNameValue(e.target.value);
                          signUpForm.setValue('name', e.target.value);
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="username" className="text-sm font-medium">Nom d'utilisateur</label>
                      <input 
                        id="username"
                        type="text"
                        placeholder="jeandupont" 
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={usernameValue}
                        onChange={(e) => {
                          setUsernameValue(e.target.value);
                          signUpForm.setValue('username', e.target.value);
                        }}
                      />
                    </div>

                    <FormField
                      control={signUpForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                              <Input 
                                type="email" 
                                placeholder="vous@exemple.com" 
                                className="pl-10 h-11"
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={signUpForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Mot de passe</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                              <Input 
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••" 
                                className="pl-10 pr-10 h-11"
                                {...field} 
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={signUpForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Confirmer le mot de passe</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                              <Input 
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••" 
                                className="pl-10 h-11"
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full h-12 gradient-primary text-white text-base font-semibold mt-6">
                      Créer un compte
                    </Button>
                  </form>
                </Form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Vous avez déjà un compte ?{' '}
                    <button
                      onClick={() => setActiveTab('signin')}
                      className="text-primary hover:underline font-semibold"
                    >
                      Se connecter
                    </button>
                  </p>
                </div>

                <div className="mt-8 text-center text-xs text-muted-foreground">
                  En continuant, vous acceptez nos{' '}
                  <Link to="/terms" className="text-primary hover:underline">
                    Conditions d'utilisation
                  </Link>{' '}
                  et notre{' '}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Politique de confidentialité
                  </Link>
                </div>
              </>
            )}
          </div>
          
          <div className="text-center mt-6">
            <p className="text-xs text-muted-foreground">by AFRINEX TECH</p>
          </div>
        </div>
      </div>

      {/* Modal de mot de passe oublié */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Mot de passe oublié ?</h2>
            <p className="text-muted-foreground mb-6">
              Entrez votre adresse e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="text-sm font-medium mb-2 block">
                  Adresse e-mail
                </label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="vous@exemple.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmail('');
                  }}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button type="submit" className="flex-1 gradient-primary text-white">
                  Envoyer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auth;
