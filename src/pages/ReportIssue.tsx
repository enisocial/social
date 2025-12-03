import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Shield,
  AlertTriangle,
  Bug,
  MessageSquare,
  User,
  Image,
  Video,
  Users,
  ArrowLeft,
  Send,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function ReportIssue() {
  const navigate = useNavigate();
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [includeScreenshots, setIncludeScreenshots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const issueTypes = [
    {
      id: 'harassment',
      label: 'Harcèlement ou intimidation',
      description: 'Menaces, insultes, harcèlement ou contenu intimidant',
      icon: Shield,
      color: 'text-red-600 bg-red-50 dark:bg-red-950/30'
    },
    {
      id: 'inappropriate',
      label: 'Contenu inapproprié',
      description: 'Contenu adulte, violent ou offensant',
      icon: AlertTriangle,
      color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30'
    },
    {
      id: 'spam',
      label: 'Spam ou faux comptes',
      description: 'Messages indésirables ou comptes suspects',
      icon: MessageSquare,
      color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30'
    },
    {
      id: 'bug',
      label: 'Bug technique',
      description: 'Problème technique ou dysfonctionnement',
      icon: Bug,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30'
    },
    {
      id: 'privacy',
      label: 'Violation de confidentialité',
      description: 'Partage non autorisé d\'informations personnelles',
      icon: User,
      color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30'
    },
    {
      id: 'copyright',
      label: 'Violation de droits d\'auteur',
      description: 'Contenu protégé par des droits d\'auteur',
      icon: Image,
      color: 'text-green-600 bg-green-50 dark:bg-green-950/30'
    }
  ];

  const handleSubmit = async () => {
    if (!issueType || !description) {
      toast.error('Veuillez sélectionner un type de problème et fournir une description');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulation d'envoi du rapport
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast.success('Votre signalement a été envoyé avec succès. Nous allons examiner votre rapport dans les plus brefs délais.');

      // Reset form
      setIssueType('');
      setDescription('');
      setContactEmail('');
      setIncludeScreenshots(false);

      // Redirection après un délai
      setTimeout(() => {
        navigate('/profile');
      }, 3000);

    } catch (error) {
      toast.error('Erreur lors de l\'envoi du signalement. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50/20 to-orange-50/30 dark:from-slate-950 dark:via-red-950/5 dark:to-orange-950/10">
      <Navbar />

      {/* HEADER ULTRA-MODERNE */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 via-orange-600/5 to-yellow-600/10"></div>
        <div className="absolute inset-0">
          <div className="absolute top-10 left-1/4 w-72 h-72 bg-gradient-to-br from-red-400/10 to-orange-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/8 to-yellow-400/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-16">
          <div className="text-center space-y-6">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 1, type: "spring", stiffness: 200 }}
              className="flex justify-center"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 via-orange-500 to-yellow-600 rounded-3xl flex items-center justify-center shadow-2xl">
                <Shield className="w-10 h-10 text-white" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="space-y-4"
            >
              <h1 className="text-5xl lg:text-6xl font-black bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent">
                Signaler un Problème
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed">
                🛡️ Aidez-nous à maintenir une communauté sûre et respectueuse
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="inline-flex items-center gap-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-6 py-3 rounded-full text-sm font-semibold shadow-lg"
            >
              <Info className="w-5 h-5" />
              Tous les signalements sont traités de manière confidentielle
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          {/* BARRE DE NAVIGATION */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 gap-3 px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour
            </Button>
          </div>

          <div className="space-y-8">
            {/* INSTRUCTIONS */}
            <Card className="bg-gradient-to-br from-blue-50/80 via-indigo-50/80 to-purple-50/80 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 backdrop-blur-sm border border-blue-200/50 dark:border-blue-800/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-blue-900 dark:text-blue-100">
                  <Info className="w-6 h-6" />
                  Comment signaler un problème ?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">Sélectionnez le type</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">Choisissez la catégorie qui correspond le mieux à votre problème</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">Décrivez précisément</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">Fournissez autant de détails que possible</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">Ajoutez des preuves</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">Captures d'écran ou liens vers le contenu concerné</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                    <div>
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">Soumettez</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">Nous examinerons votre signalement rapidement</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FORMULAIRE DE SIGNALEMENT */}
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-red-600" />
                  Détails du signalement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* TYPE DE PROBLÈME */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold text-gray-800 dark:text-gray-200">
                    Quel type de problème souhaitez-vous signaler ?
                  </Label>
                  <RadioGroup value={issueType} onValueChange={setIssueType} className="grid gap-4 md:grid-cols-2">
                    {issueTypes.map((type) => (
                      <div key={type.id} className="relative">
                        <RadioGroupItem value={type.id} id={type.id} className="peer sr-only" />
                        <Label
                          htmlFor={type.id}
                          className="flex items-start gap-3 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 peer-checked:border-red-400 peer-checked:bg-red-50 dark:peer-checked:bg-red-950/30 transition-all duration-200 cursor-pointer"
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${type.color} mt-0.5`}>
                            <type.icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
                              {type.label}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                              {type.description}
                            </p>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* DESCRIPTION */}
                <div className="space-y-3">
                  <Label htmlFor="description" className="text-base font-semibold text-gray-800 dark:text-gray-200">
                    Description détaillée *
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Décrivez le problème en détail. Incluez des liens, noms d'utilisateurs ou toute information utile pour nous aider à identifier et résoudre le problème..."
                    rows={6}
                    className="border-2 border-gray-200 dark:border-gray-700 focus:border-red-400 rounded-xl resize-none"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Plus votre description est détaillée, plus nous pourrons agir efficacement.
                  </p>
                </div>

                {/* EMAIL DE CONTACT */}
                <div className="space-y-3">
                  <Label htmlFor="contactEmail" className="text-base font-semibold text-gray-800 dark:text-gray-200">
                    Email de contact (optionnel)
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="votre.email@exemple.com"
                    className="h-12 border-2 border-gray-200 dark:border-gray-700 focus:border-red-400 rounded-xl"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Pour vous tenir informé de l'évolution de votre signalement.
                  </p>
                </div>

                {/* OPTIONS SUPPLÉMENTAIRES */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="screenshots"
                      checked={includeScreenshots}
                      onCheckedChange={(checked) => setIncludeScreenshots(checked === true)}
                    />
                    <Label htmlFor="screenshots" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      J'ai des captures d'écran ou des preuves à fournir
                    </Label>
                  </div>
                  {includeScreenshots && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl"
                    >
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        📎 Après avoir soumis ce formulaire, vous pourrez télécharger vos captures d'écran dans la page de suivi de votre signalement.
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* POLITIQUE DE CONFIDENTIALITÉ */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                        Politique de confidentialité
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        Toutes les informations que vous fournissez sont traitées de manière strictement confidentielle.
                        Nous utilisons ces informations uniquement pour examiner et résoudre votre signalement.
                        Vos données personnelles ne seront jamais partagées avec des tiers sans votre consentement explicite.
                      </p>
                    </div>
                  </div>
                </div>

                {/* BOUTON DE SOUMISSION */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !issueType || !description}
                    className="w-full h-14 bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 hover:from-red-700 hover:via-orange-700 hover:to-yellow-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl text-lg font-semibold disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Envoi en cours...
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Send className="w-6 h-6" />
                        Soumettre le signalement
                      </div>
                    )}
                  </Button>
                </motion.div>
              </CardContent>
            </Card>

            {/* TEMPS DE TRAITEMENT */}
            <Card className="bg-gradient-to-br from-green-50/80 via-teal-50/80 to-cyan-50/80 dark:from-green-950/20 dark:via-teal-950/20 dark:to-cyan-950/20 backdrop-blur-sm border border-green-200/50 dark:border-green-800/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-green-900 dark:text-green-100">
                  <Clock className="w-6 h-6" />
                  Délais de traitement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl">
                    <div className="text-2xl font-bold text-green-600 mb-2">24h</div>
                    <div className="text-sm font-medium text-green-800 dark:text-green-200">Révision initiale</div>
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">Harcèlement & menaces</div>
                  </div>
                  <div className="text-center p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl">
                    <div className="text-2xl font-bold text-blue-600 mb-2">48h</div>
                    <div className="text-sm font-medium text-blue-800 dark:text-blue-200">Investigation</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Contenu inapproprié</div>
                  </div>
                  <div className="text-center p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl">
                    <div className="text-2xl font-bold text-purple-600 mb-2">72h</div>
                    <div className="text-sm font-medium text-purple-800 dark:text-purple-200">Résolution</div>
                    <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">Autres problèmes</div>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-green-100 dark:bg-green-900/30 rounded-xl border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-800 dark:text-green-200 text-center">
                    ⚡ <strong>Signalements urgents</strong> (menaces, harcèlement) sont traités en priorité absolue
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
