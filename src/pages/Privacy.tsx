import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FacebookFeedLayout } from '@/components/feed/FacebookFeedLayout';
import { Shield, Eye, Lock, Database, Users, Cookie } from 'lucide-react';

const Privacy = () => {
  return (
    <FacebookFeedLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
            <Shield className="h-8 w-8 text-green-600" />
            Politique de confidentialité
          </h1>
          <p className="text-muted-foreground mt-2">
            Comment nous protégeons et utilisons vos données personnelles
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              1. Collecte des données
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Nous collectons les informations suivantes lorsque vous utilisez notre plateforme :
            </p>
            <ul className="text-muted-foreground space-y-2 ml-4">
              <li>• <strong>Informations de compte :</strong> nom, email, nom d'utilisateur, biographie</li>
              <li>• <strong>Contenu publié :</strong> posts, commentaires, messages, photos</li>
              <li>• <strong>Données d'utilisation :</strong> interactions, préférences, historique de navigation</li>
              <li>• <strong>Informations techniques :</strong> adresse IP, type d'appareil, navigateur</li>
              <li>• <strong>Cookies :</strong> pour améliorer votre expérience utilisateur</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              2. Utilisation des données
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Vos données sont utilisées pour :
            </p>
            <ul className="text-muted-foreground space-y-2 ml-4">
              <li>• Fournir et améliorer notre service</li>
              <li>• Personnaliser votre expérience (recommandations, feed)</li>
              <li>• Assurer la sécurité et prévenir les abus</li>
              <li>• Communiquer avec vous concernant votre compte</li>
              <li>• Analyser l'utilisation pour optimiser la plateforme</li>
              <li>• Respecter nos obligations légales</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              3. Partage des données
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Nous ne vendons pas vos données personnelles. Nous pouvons partager vos informations dans les cas suivants :
            </p>
            <ul className="text-muted-foreground space-y-2 ml-4">
              <li>• <strong>Avec votre consentement :</strong> lorsque vous choisissez de partager du contenu</li>
              <li>• <strong>Prestataires de service :</strong> pour héberger nos données (chiffrées)</li>
              <li>• <strong>Obligations légales :</strong> si requis par la loi ou une décision judiciaire</li>
              <li>• <strong>Sécurité :</strong> pour protéger nos utilisateurs contre les menaces</li>
              <li>• <strong>Anonymisées :</strong> statistiques d'utilisation sans données personnelles</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              4. Sécurité des données
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Nous mettons en place plusieurs mesures de sécurité :
            </p>
            <ul className="text-muted-foreground space-y-2 ml-4">
              <li>• <strong>Chiffrement :</strong> toutes les données sensibles sont chiffrées</li>
              <li>• <strong>Accès limité :</strong> seules les personnes autorisées accèdent aux données</li>
              <li>• <strong>Surveillance :</strong> détection et prévention des accès non autorisés</li>
              <li>• <strong>Sauvegardes :</strong> données sauvegardées régulièrement</li>
              <li>• <strong>Audits :</strong> vérifications régulières de sécurité</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5" />
              5. Cookies et technologies similaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Nous utilisons des cookies pour améliorer votre expérience :
            </p>
            <ul className="text-muted-foreground space-y-2 ml-4">
              <li>• <strong>Cookies essentiels :</strong> pour le fonctionnement de base du site</li>
              <li>• <strong>Cookies de performance :</strong> pour analyser l'utilisation</li>
              <li>• <strong>Cookies fonctionnels :</strong> pour mémoriser vos préférences</li>
              <li>• <strong>Cookies de marketing :</strong> seulement avec votre consentement</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Vous pouvez gérer vos préférences de cookies dans les paramètres de votre navigateur.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Conservation des données</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Nous conservons vos données aussi longtemps que nécessaire pour fournir notre service.
              Vous pouvez demander la suppression de vos données à tout moment. Certaines données
              peuvent être conservées plus longtemps pour des raisons légales ou de sécurité.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7. Vos droits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <ul className="text-muted-foreground space-y-2 ml-4">
              <li>• <strong>Accès :</strong> consulter vos données personnelles</li>
              <li>• <strong>Rectification :</strong> corriger vos données inexactes</li>
              <li>• <strong>Effacement :</strong> supprimer vos données (droit à l'oubli)</li>
              <li>• <strong>Portabilité :</strong> recevoir vos données dans un format structuré</li>
              <li>• <strong>Opposition :</strong> vous opposer au traitement de vos données</li>
              <li>• <strong>Limitation :</strong> restreindre l'utilisation de vos données</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>8. Modifications de cette politique</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Nous pouvons modifier cette politique de confidentialité à tout moment. Les modifications
              importantes vous seront notifiées par email ou via une notification sur la plateforme.
              Votre utilisation continue du service constitue l'acceptation des nouvelles conditions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>9. Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Pour toute question concernant cette politique de confidentialité ou vos données personnelles,
              contactez-nous via le centre d'aide ou envoyez-nous un message depuis votre compte.
            </p>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Délégué à la protection des données :</strong> Vous pouvez contacter notre DPO
                pour toute question relative à la protection de vos données personnelles.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>Dernière mise à jour: Novembre 2024</p>
          <p className="mt-1">© 2024 Social Media Platform • Tous droits réservés</p>
        </div>
      </div>
    </FacebookFeedLayout>
  );
};

export default Privacy;
