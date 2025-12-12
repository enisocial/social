import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FacebookFeedLayout } from '@/components/feed/FacebookFeedLayout';
import { FileText, Shield, Users, AlertTriangle } from 'lucide-react';

const Terms = () => {
  return (
    <FacebookFeedLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
            Conditions d'utilisation
          </h1>
          <p className="text-muted-foreground mt-2">
            Dernière mise à jour: Novembre 2024
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>1. Acceptation des conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              En accédant et en utilisant notre plateforme de réseau social, vous acceptez d'être lié par ces conditions d'utilisation.
              Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Description du service</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Notre plateforme est un réseau social qui permet aux utilisateurs de créer des profils, publier du contenu,
              interagir avec d'autres utilisateurs et partager des expériences. Nous nous réservons le droit de modifier
              ou d'interrompre le service à tout moment.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              3. Comptes utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Création de compte</h4>
              <p className="text-muted-foreground">
                Pour utiliser notre service, vous devez créer un compte avec des informations exactes et à jour.
                Vous êtes responsable de maintenir la confidentialité de votre mot de passe.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Responsabilités</h4>
              <p className="text-muted-foreground">
                Vous êtes seul responsable de vos actions sur la plateforme et du contenu que vous publiez.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              4. Contenu et conduite
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Contenu autorisé</h4>
              <p className="text-muted-foreground">
                Vous pouvez publier du contenu original et respectueux. Tout contenu doit respecter les lois en vigueur
                et nos standards communautaires.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Contenu interdit</h4>
              <ul className="text-muted-foreground space-y-1 ml-4">
                <li>• Contenu haineux, discriminatoire ou offensant</li>
                <li>• Contenu violent ou menaçant</li>
                <li>• Contenu illégal ou portant atteinte aux droits d'autrui</li>
                <li>• Spam ou contenu promotionnel non sollicité</li>
                <li>• Contenu diffamatoire ou faux</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Propriété intellectuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Vous conservez les droits sur votre contenu original. En publiant du contenu sur notre plateforme,
              vous nous accordez une licence non-exclusive pour afficher et distribuer ce contenu dans le cadre de notre service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Résiliation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Nous nous réservons le droit de suspendre ou de résilier votre compte à tout moment en cas de violation
              de ces conditions. Vous pouvez également supprimer votre compte à tout moment depuis vos paramètres.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              7. Limitation de responsabilité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Notre plateforme est fournie "en l'état". Nous ne garantissons pas l'absence d'interruptions ou d'erreurs.
              En aucun cas notre responsabilité ne pourra être engagée pour des dommages indirects ou consécutifs.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>8. Modifications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications entreront
              en vigueur immédiatement après leur publication. Votre utilisation continue du service constitue
              l'acceptation des nouvelles conditions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>9. Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Pour toute question concernant ces conditions, contactez-nous via le centre d'aide ou
              envoyez-nous un message depuis votre compte.
            </p>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>© 2024 Social Media Platform • Tous droits réservés</p>
        </div>
      </div>
    </FacebookFeedLayout>
  );
};

export default Terms;
