import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <Link to="/auth">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-8">Conditions d'utilisation</h1>
        
        <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptation des conditions</h2>
            <p>
              En accédant et en utilisant s-ocial (le "Service"), vous acceptez d'être lié par ces conditions d'utilisation. 
              Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser le Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Utilisation du Service</h2>
            <p>
              Vous devez avoir au moins 13 ans pour utiliser ce Service. En utilisant le Service, vous déclarez 
              que vous avez au moins 13 ans et que vous avez la capacité légale de conclure ces conditions.
            </p>
            <p className="mt-4">
              Vous êtes responsable de maintenir la confidentialité de votre compte et de votre mot de passe. 
              Vous acceptez de ne pas divulguer votre mot de passe à des tiers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Contenu utilisateur</h2>
            <p>
              Vous conservez tous les droits sur le contenu que vous publiez sur s-ocial. En publiant du contenu, 
              vous nous accordez une licence mondiale, non exclusive, libre de redevances pour utiliser, reproduire, 
              modifier et afficher ce contenu dans le cadre du Service.
            </p>
            <p className="mt-4">
              Vous acceptez de ne pas publier de contenu qui:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Est illégal, menaçant, abusif, harcelant, diffamatoire ou obscène</li>
              <li>Viole les droits de propriété intellectuelle d'autrui</li>
              <li>Contient des virus ou tout autre code malveillant</li>
              <li>Fait la promotion de la discrimination, du sectarisme, du racisme ou de la haine</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Conduite interdite</h2>
            <p>Vous acceptez de ne pas:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Harceler, intimider ou menacer d'autres utilisateurs</li>
              <li>Usurper l'identité d'une autre personne ou entité</li>
              <li>Collecter des informations sur d'autres utilisateurs sans leur consentement</li>
              <li>Utiliser le Service à des fins commerciales non autorisées</li>
              <li>Tenter d'accéder à des zones restreintes du Service</li>
              <li>Utiliser des robots, scripts ou autres moyens automatisés pour accéder au Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Propriété intellectuelle</h2>
            <p>
              Le Service et son contenu original (à l'exclusion du contenu fourni par les utilisateurs), 
              les fonctionnalités et les fonctionnalités sont et resteront la propriété exclusive de s-ocial 
              et de ses concédants de licence.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Résiliation</h2>
            <p>
              Nous pouvons résilier ou suspendre votre accès au Service immédiatement, sans préavis ni 
              responsabilité, pour quelque raison que ce soit, y compris, sans limitation, si vous violez 
              les Conditions.
            </p>
            <p className="mt-4">
              Vous pouvez résilier votre compte à tout moment en nous contactant. À la résiliation, 
              votre droit d'utiliser le Service cessera immédiatement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Limitation de responsabilité</h2>
            <p>
              Dans toute la mesure permise par la loi applicable, s-ocial ne sera pas responsable des 
              dommages indirects, accessoires, spéciaux, consécutifs ou punitifs, ou de toute perte de 
              profits ou de revenus.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Modifications des conditions</h2>
            <p>
              Nous nous réservons le droit de modifier ou de remplacer ces Conditions à tout moment. 
              Si une révision est importante, nous fournirons un préavis d'au moins 30 jours avant 
              l'entrée en vigueur des nouvelles conditions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Contact</h2>
            <p>
              Si vous avez des questions concernant ces Conditions, veuillez nous contacter via le Service.
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

export default TermsOfService;
