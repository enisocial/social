import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FacebookFeedLayout } from '@/components/feed/FacebookFeedLayout';
import { HelpContactForm } from '@/components/HelpContactForm';
import {
  HelpCircle,
  MessageSquare,
  Users,
  Image,
  Shield,
  Settings,
  Search,
  Heart
} from 'lucide-react';

const Help = () => {
  const helpTopics = [
    {
      icon: MessageSquare,
      title: 'Messagerie',
      description: 'Envoyez des messages privés, partagez des photos et discutez en temps réel',
      tips: [
        'Cliquez sur un ami dans la sidebar pour ouvrir un chat',
        'Utilisez les icônes pour envoyer des emojis, images ou fichiers',
        'Votre statut en ligne est visible par vos amis'
      ]
    },
    {
      icon: Users,
      title: 'Amis et réseau',
      description: 'Connectez-vous avec d\'autres utilisateurs et élargissez votre réseau',
      tips: [
        'Envoyez des demandes d\'ami depuis les profils',
        'Acceptez ou refusez les demandes reçues',
        'Retirez des amis via le menu actions du profil'
      ]
    },
    {
      icon: Image,
      title: 'Publications et médias',
      description: 'Partagez vos photos, vidéos et pensées avec la communauté',
      tips: [
        'Utilisez le bouton "Créer un post" en haut du feed',
        'Ajoutez des photos, vidéos ou du texte à vos publications',
        'Les publications peuvent être publiques ou privées'
      ]
    },
    {
      icon: Settings,
      title: 'Paramètres du compte',
      description: 'Personnalisez votre expérience et gérez votre confidentialité',
      tips: [
        'Modifiez votre profil dans Paramètres > Profil',
        'Gérez vos notifications dans Paramètres > Notifications',
        'Changez votre mot de passe dans Paramètres > Sécurité'
      ]
    },
    {
      icon: Shield,
      title: 'Sécurité et confidentialité',
      description: 'Protégez vos données et contrôlez qui voit vos informations',
      tips: [
        'Définissez la visibilité de votre profil',
        'Choisissez qui peut vous envoyer des demandes d\'ami',
        'Téléchargez vos données à tout moment'
      ]
    },
    {
      icon: Search,
      title: 'Recherche et découverte',
      description: 'Trouvez du contenu et des personnes intéressantes',
      tips: [
        'Utilisez la barre de recherche en haut de la page',
        'Découvrez du contenu recommandé dans votre feed',
        'Explorez les profils d\'autres utilisateurs'
      ]
    }
  ];

  const faq = [
    {
      question: 'Comment changer ma photo de profil ?',
      answer: 'Allez dans votre profil, cliquez sur votre photo actuelle, puis choisissez "Changer la photo". Vous pouvez recadrer et appliquer des filtres avant de sauvegarder.'
    },
    {
      question: 'Comment supprimer un post ?',
      answer: 'Cliquez sur les trois points (...) en haut à droite de votre post, puis sélectionnez "Supprimer". La suppression est immédiate et irréversible.'
    },
    {
      question: 'Comment bloquer quelqu\'un ?',
      answer: 'Sur le profil de la personne, cliquez sur "Actions" puis "Bloquer". Cette personne ne pourra plus vous contacter ni voir vos publications.'
    },
    {
      question: 'Comment signaler un contenu inapproprié ?',
      answer: 'Cliquez sur les trois points (...) du post ou du commentaire, puis sélectionnez "Signaler". Notre équipe examinera le signalement.'
    },
    {
      question: 'Puis-je récupérer mes données ?',
      answer: 'Oui ! Allez dans Paramètres > Compte > "Télécharger mes données". Vous recevrez un fichier JSON contenant toutes vos informations.'
    }
  ];

  return (
    <FacebookFeedLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
            <HelpCircle className="h-8 w-8 text-blue-600" />
            Centre d'aide
          </h1>
          <p className="text-muted-foreground mt-2">
            Découvrez comment utiliser toutes les fonctionnalités de notre plateforme
          </p>
        </div>

        {/* Rubriques d'aide */}
        <div className="grid gap-6 md:grid-cols-2">
          {helpTopics.map((topic, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <topic.icon className="h-6 w-6 text-blue-600" />
                  {topic.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{topic.description}</p>
                <ul className="space-y-2">
                  {topic.tips.map((tip, tipIndex) => (
                    <li key={tipIndex} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-green-600" />
              Questions fréquemment posées
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {faq.map((item, index) => (
              <div key={index} className="border-b border-gray-100 last:border-b-0 pb-6 last:pb-0">
                <h3 className="font-semibold text-lg mb-2">{item.question}</h3>
                <p className="text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Formulaire de contact support */}
        <HelpContactForm />

        {/* Version info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Version 1.0.0 • Dernière mise à jour: Novembre 2024</p>
          <p className="mt-1">© 2024 Social Media Platform • Tous droits réservés</p>
        </div>
      </div>
    </FacebookFeedLayout>
  );
};

export default Help;
