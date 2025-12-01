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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header with Logo */}
      <div className="flex justify-center items-center p-8 bg-white border-b border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-xl flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
            <img
              src="/icon-192.png"
              alt="Logo"
              className="w-8 h-8"
            />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900">
              <span className="text-amber-500">s</span>ocial
            </h1>
            <div className="h-0.5 w-12 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full mt-1"></div>
          </div>
        </div>
      </div>

      {/* Main Content - Centered Single Column */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Connectez-vous avec <span className="text-amber-500">l'Afrique</span>
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed max-w-md mx-auto">
              Rejoignez la communauté panafricaine où vous pouvez partager vos histoires, découvrir de nouvelles cultures et rester connecté avec votre continent.
            </p>

            {/* African-inspired elements */}
            <div className="flex justify-center gap-8 mt-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mx-auto mb-2 flex items-center justify-center shadow-lg">
                  <div className="w-6 h-6 bg-white rounded-lg"></div>
                </div>
                <p className="text-sm font-semibold text-slate-700">Communauté</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl mx-auto mb-2 flex items-center justify-center shadow-lg">
                  <div className="w-6 h-6 bg-white rounded-lg"></div>
                </div>
                <p className="text-sm font-semibold text-slate-700">Culture</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl mx-auto mb-2 flex items-center justify-center shadow-lg">
                  <div className="w-6 h-6 bg-white rounded-lg"></div>
                </div>
                <p className="text-sm font-semibold text-slate-700">Connexion</p>
              </div>
            </div>
          </div>

          {/* Auth Form Card */}
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-8">
            {activeTab === 'signin' ? (
              <>
                <div className="mb-8 text-center">
                  <h2 className="text-3xl font-bold mb-3 text-slate-900">Bon retour !</h2>
                  <p className="text-slate-600">Connectez-vous pour continuer votre voyage africain</p>
                </div>

                <Form {...signInForm}>
                  <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-6">
                    <FormField
                      control={signInForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">Adresse email</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-orange-400/20 rounded-xl blur-sm group-focus-within:from-amber-400/30 group-focus-within:to-orange-400/30 transition-all duration-300"></div>
                              <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-xl">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-500" />
                                <Input
                                  type="email"
                                  placeholder="votre.email@exemple.com"
                                  className="pl-12 pr-4 h-14 bg-transparent border-0 focus:ring-0 text-gray-800 dark:text-gray-200 placeholder:text-gray-500"
                                  {...field}
                                />
                              </div>
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
                          <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">Mot de passe</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-yellow-400/20 rounded-xl blur-sm group-focus-within:from-orange-400/30 group-focus-within:to-yellow-400/30 transition-all duration-300"></div>
                              <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-xl">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-500" />
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  className="pl-12 pr-12 h-14 bg-transparent border-0 focus:ring-0 text-gray-800 dark:text-gray-200 placeholder:text-gray-500"
                                  {...field}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-amber-500 transition-colors"
                                >
                                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <input
                            type="checkbox"
                            id="remember"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 text-amber-500 bg-white/80 border-2 border-amber-300 rounded focus:ring-amber-500 focus:ring-2"
                          />
                          <label
                            htmlFor="remember"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer ml-2"
                          >
                            Se souvenir de moi
                          </label>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-amber-600 hover:text-amber-700 font-semibold transition-colors"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-14 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                    >
                      Se connecter à la communauté
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
                <div className="mb-8 text-center">
                  <h2 className="text-3xl font-bold mb-3 text-slate-900">Créer un compte</h2>
                  <p className="text-slate-600">Rejoignez la communauté panafricaine</p>
                </div>

                <Form {...signUpForm}>
                  <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-5">
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nom complet</label>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl blur-sm group-focus-within:from-blue-400/30 group-focus-within:to-purple-400/30 transition-all duration-300"></div>
                        <input
                          id="name"
                          type="text"
                          placeholder="Jean Dupont"
                          className="relative w-full h-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-xl px-4 text-gray-800 dark:text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          value={nameValue}
                          onChange={(e) => {
                            setNameValue(e.target.value);
                            signUpForm.setValue('name', e.target.value);
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="username" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nom d'utilisateur</label>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-teal-400/20 rounded-xl blur-sm group-focus-within:from-green-400/30 group-focus-within:to-teal-400/30 transition-all duration-300"></div>
                        <input
                          id="username"
                          type="text"
                          placeholder="jeandupont"
                          className="relative w-full h-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-xl px-4 text-gray-800 dark:text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                          value={usernameValue}
                          onChange={(e) => {
                            setUsernameValue(e.target.value);
                            signUpForm.setValue('username', e.target.value);
                          }}
                        />
                      </div>
                    </div>

                    <FormField
                      control={signUpForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">Adresse email</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-orange-400/20 rounded-xl blur-sm group-focus-within:from-amber-400/30 group-focus-within:to-orange-400/30 transition-all duration-300"></div>
                              <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-xl">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-500" />
                                <Input
                                  type="email"
                                  placeholder="votre.email@exemple.com"
                                  className="pl-12 pr-4 h-12 bg-transparent border-0 focus:ring-0 text-gray-800 dark:text-gray-200 placeholder:text-gray-500"
                                  {...field}
                                />
                              </div>
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
                          <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">Mot de passe</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-yellow-400/20 rounded-xl blur-sm group-focus-within:from-orange-400/30 group-focus-within:to-yellow-400/30 transition-all duration-300"></div>
                              <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-xl">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-500" />
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  className="pl-12 pr-12 h-12 bg-transparent border-0 focus:ring-0 text-gray-800 dark:text-gray-200 placeholder:text-gray-500"
                                  {...field}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-amber-500 transition-colors"
                                >
                                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                              </div>
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
                          <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">Confirmer le mot de passe</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-red-400/20 rounded-xl blur-sm group-focus-within:from-yellow-400/30 group-focus-within:to-red-400/30 transition-all duration-300"></div>
                              <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-xl">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-yellow-500" />
                                <Input
                                  type="password"
                                  placeholder="••••••••"
                                  className="pl-12 pr-4 h-12 bg-transparent border-0 focus:ring-0 text-gray-800 dark:text-gray-200 placeholder:text-gray-500"
                                  {...field}
                                />
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full h-14 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] mt-6"
                    >
                      Rejoindre la communauté
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

      {/* Modal de mot de passe oublié avec design africain */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-600/30 p-8 max-w-md w-full relative overflow-hidden">
            {/* Motif africain subtil dans le modal */}
            <div className="absolute top-0 right-0 w-24 h-24 opacity-5">
              <div className="absolute inset-0 border-4 border-amber-400 rounded-full transform rotate-45"></div>
              <div className="absolute inset-2 border-2 border-orange-400 rounded-full"></div>
            </div>

            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent text-center">Mot de passe oublié ?</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
                Entrez votre adresse e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </p>
              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="reset-email" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Adresse e-mail
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-orange-400/20 rounded-xl blur-sm group-focus-within:from-amber-400/30 group-focus-within:to-orange-400/30 transition-all duration-300"></div>
                    <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-xl">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-500" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="votre.email@exemple.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        className="pl-12 pr-4 h-12 bg-transparent border-0 focus:ring-0 text-gray-800 dark:text-gray-200 placeholder:text-gray-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmail('');
                    }}
                    className="flex-1 bg-white/60 hover:bg-white/80 border-amber-200 hover:border-amber-300"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                  >
                    Envoyer
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auth;
