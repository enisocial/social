import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <Link to="/auth">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-8">Politique de confidentialité</h1>
        
        <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
            <p>
              Chez s-ocial, nous prenons votre vie privée au sérieux. Cette politique de confidentialité 
              explique comment nous collectons, utilisons, partageons et protégeons vos informations personnelles 
              lorsque vous utilisez notre réseau social.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Informations que nous collectons</h2>
            
            <h3 className="text-xl font-semibold text-foreground mt-4 mb-2">2.1 Informations que vous nous fournissez</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Informations de compte (nom, nom d'utilisateur, adresse e-mail, mot de passe)</li>
              <li>Informations de profil (photo de profil, biographie, localisation)</li>
              <li>Contenu que vous créez (publications, commentaires, messages, photos, vidéos)</li>
              <li>Communications avec nous et autres utilisateurs</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mt-4 mb-2">2.2 Informations collectées automatiquement</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Informations sur l'appareil (type d'appareil, système d'exploitation, navigateur)</li>
              <li>Données de connexion (adresse IP, fournisseur d'accès Internet)</li>
              <li>Informations d'utilisation (pages visitées, fonctionnalités utilisées, temps passé)</li>
              <li>Cookies et technologies similaires</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Comment nous utilisons vos informations</h2>
            <p>Nous utilisons vos informations pour:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Fournir, maintenir et améliorer nos services</li>
              <li>Personnaliser votre expérience</li>
              <li>Vous connecter avec d'autres utilisateurs</li>
              <li>Vous envoyer des notifications et des mises à jour</li>
              <li>Prévenir et détecter les activités frauduleuses ou illégales</li>
              <li>Respecter nos obligations légales</li>
              <li>Analyser l'utilisation du service pour l'améliorer</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Partage de vos informations</h2>
            <p>Nous pouvons partager vos informations avec:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li><strong>Autres utilisateurs:</strong> Selon vos paramètres de confidentialité</li>
              <li><strong>Prestataires de services:</strong> Qui nous aident à fournir le service</li>
              <li><strong>Autorités légales:</strong> Si requis par la loi</li>
              <li><strong>Partenaires commerciaux:</strong> Avec votre consentement explicite</li>
            </ul>
            <p className="mt-4">
              Nous ne vendons pas vos informations personnelles à des tiers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Vos droits et choix</h2>
            <p>Vous avez le droit de:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Accéder à vos informations personnelles</li>
              <li>Corriger des informations inexactes</li>
              <li>Supprimer votre compte et vos données</li>
              <li>Vous opposer au traitement de vos données</li>
              <li>Demander la portabilité de vos données</li>
              <li>Retirer votre consentement à tout moment</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Sécurité des données</h2>
            <p>
              Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles appropriées 
              pour protéger vos informations contre l'accès non autorisé, la modification, la divulgation 
              ou la destruction. Cependant, aucune méthode de transmission sur Internet n'est totalement sécurisée.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Conservation des données</h2>
            <p>
              Nous conservons vos informations personnelles aussi longtemps que nécessaire pour fournir 
              nos services et respecter nos obligations légales. Lorsque vous supprimez votre compte, 
              nous supprimons vos données, sauf si nous devons les conserver pour des raisons légales.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Utilisateurs mineurs</h2>
            <p>
              Notre service n'est pas destiné aux personnes de moins de 13 ans. Nous ne collectons pas 
              sciemment d'informations personnelles auprès d'enfants de moins de 13 ans. Si nous découvrons 
              qu'un enfant de moins de 13 ans nous a fourni des informations personnelles, nous supprimerons 
              ces informations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Cookies</h2>
            <p>
              Nous utilisons des cookies et des technologies similaires pour améliorer votre expérience, 
              analyser l'utilisation du service et personnaliser le contenu. Vous pouvez contrôler les cookies 
              via les paramètres de votre navigateur.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Modifications de cette politique</h2>
            <p>
              Nous pouvons mettre à jour cette politique de confidentialité de temps à autre. Nous vous 
              informerons de tout changement important en publiant la nouvelle politique sur cette page 
              et en mettant à jour la date de "dernière mise à jour".
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">11. Contact</h2>
            <p>
              Si vous avez des questions concernant cette politique de confidentialité ou nos pratiques 
              en matière de données, veuillez nous contacter via le Service.
            </p>
          </section>

          <p className="mt-8 text-sm">
            Dernière mise à jour: {new Date().toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
