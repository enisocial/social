import React, { useState } from 'react';
import { Users, Star, MessageSquare, ThumbsUp, ThumbsDown, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useScreenReader } from '@/hooks/useScreenReader';

interface AuditResponse {
  id: string;
  timestamp: string;
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
  accessibility: {
    canUseKeyboard: boolean;
    canUseScreenReader: boolean;
    canSeeColors: boolean;
    hasMotionSensitivity: boolean;
    hasCognitiveDisabilities: boolean;
  };
  ratings: {
    overall: number;
    navigation: number;
    content: number;
    functionality: number;
  };
  feedback: {
    positive: string;
    negative: string;
    suggestions: string;
  };
  assistiveTech: {
    screenReader: string;
    magnification: boolean;
    voiceControl: boolean;
    other: string;
  };
}

interface UserAccessibilityAuditProps {
  onAuditCompleted?: (response: AuditResponse) => void;
  autoShow?: boolean;
}

export const UserAccessibilityAudit: React.FC<UserAccessibilityAuditProps> = ({
  onAuditCompleted,
  autoShow = false
}) => {
  const [isOpen, setIsOpen] = useState(autoShow);
  const [currentStep, setCurrentStep] = useState(0);
  const [response, setResponse] = useState<Partial<AuditResponse>>({
    accessibility: {
      canUseKeyboard: false,
      canUseScreenReader: false,
      canSeeColors: false,
      hasMotionSensitivity: false,
      hasCognitiveDisabilities: false
    },
    ratings: {
      overall: 0,
      navigation: 0,
      content: 0,
      functionality: 0
    },
    feedback: {
      positive: '',
      negative: '',
      suggestions: ''
    },
    assistiveTech: {
      screenReader: '',
      magnification: false,
      voiceControl: false,
      other: ''
    }
  });
  const { announcePolite } = useScreenReader();

  const steps = [
    { id: 'intro', title: 'Introduction', required: false },
    { id: 'accessibility', title: 'Vos besoins d\'accessibilité', required: true },
    { id: 'ratings', title: 'Évaluation de l\'expérience', required: true },
    { id: 'assistive', title: 'Technologies d\'assistance', required: false },
    { id: 'feedback', title: 'Commentaires libres', required: true },
    { id: 'thankyou', title: 'Merci !', required: false }
  ];

  const updateResponse = (section: keyof AuditResponse, data: any) => {
    setResponse(prev => ({
      ...prev,
      [section]: { ...(prev[section] as any), ...data }
    }));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      announcePolite(`Étape ${currentStep + 2} sur ${steps.length}`);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      announcePolite(`Étape ${currentStep} sur ${steps.length}`);
    }
  };

  const submitAudit = () => {
    const completeResponse: AuditResponse = {
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      accessibility: response.accessibility as AuditResponse['accessibility'],
      ratings: response.ratings as AuditResponse['ratings'],
      feedback: response.feedback as AuditResponse['feedback'],
      assistiveTech: response.assistiveTech as AuditResponse['assistiveTech']
    };

    // Sauvegarder localement pour référence
    localStorage.setItem('accessibility_audit_response', JSON.stringify(completeResponse));

    onAuditCompleted?.(completeResponse);
    announcePolite('Audit d\'accessibilité soumis avec succès. Merci pour votre participation !');
    setIsOpen(false);
  };

  const renderStep = () => {
    switch (steps[currentStep].id) {
      case 'intro':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold">Audit d'Accessibilité Utilisateur</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Votre retour nous aide à améliorer l'accessibilité de notre plateforme.
              Cet audit est anonyme et prend environ 3 minutes.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Important :</strong> Soyez honnête dans vos réponses.
                Vos retours nous aident à identifier les vrais problèmes d'accessibilité.
              </p>
            </div>
          </div>
        );

      case 'accessibility':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Quels sont vos besoins d'accessibilité ?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Cochez toutes les options qui s'appliquent à vous :
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="keyboard"
                  className="rounded border-gray-300"
                  onChange={(e) => updateResponse('accessibility', {
                    canUseKeyboard: e.target.checked
                  })}
                />
                <Label htmlFor="keyboard" className="text-sm">
                  Je navigue principalement au clavier (Tab, Entrée, Échap)
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="screenreader"
                  className="rounded border-gray-300"
                  onChange={(e) => updateResponse('accessibility', {
                    canUseScreenReader: e.target.checked
                  })}
                />
                <Label htmlFor="screenreader" className="text-sm">
                  J'utilise un lecteur d'écran (NVDA, JAWS, VoiceOver, etc.)
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="colors"
                  className="rounded border-gray-300"
                  onChange={(e) => updateResponse('accessibility', {
                    canSeeColors: e.target.checked
                  })}
                />
                <Label htmlFor="colors" className="text-sm">
                  Je ne peux pas distinguer certaines couleurs
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="motion"
                  className="rounded border-gray-300"
                  onChange={(e) => updateResponse('accessibility', {
                    hasMotionSensitivity: e.target.checked
                  })}
                />
                <Label htmlFor="motion" className="text-sm">
                  Les animations me gênent (vertiges, migraines)
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="cognitive"
                  className="rounded border-gray-300"
                  onChange={(e) => updateResponse('accessibility', {
                    hasCognitiveDisabilities: e.target.checked
                  })}
                />
                <Label htmlFor="cognitive" className="text-sm">
                  J'ai des difficultés de compréhension ou de concentration
                </Label>
              </div>
            </div>
          </div>
        );

      case 'ratings':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Évaluez votre expérience</h3>
              <p className="text-sm text-gray-600 mb-6">
                Sur une échelle de 1 à 5, comment évaluez-vous :
              </p>
            </div>

            <div className="space-y-6">
              {[
                { key: 'overall', label: 'Expérience globale d\'accessibilité' },
                { key: 'navigation', label: 'Facilité de navigation' },
                { key: 'content', label: 'Lisibilité du contenu' },
                { key: 'functionality', label: 'Accessibilité des fonctionnalités' }
              ].map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <Label className="text-sm font-medium">{label}</Label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        className={`p-2 rounded-lg border-2 transition-all ${
                          response.ratings?.[key as keyof AuditResponse['ratings']] === rating
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => updateResponse('ratings', { [key]: rating })}
                        aria-label={`${rating} étoile${rating > 1 ? 's' : ''} pour ${label}`}
                      >
                        <Star
                          className={`w-5 h-5 ${
                            response.ratings?.[key as keyof AuditResponse['ratings']] >= rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'assistive':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Technologies d'assistance utilisées</h3>
              <p className="text-sm text-gray-600 mb-6">
                Optionnel : Quelles technologies utilisez-vous ?
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="screenreader-type" className="text-sm font-medium">
                  Lecteur d'écran (si utilisé) :
                </Label>
                <select
                  id="screenreader-type"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  onChange={(e) => updateResponse('assistiveTech', {
                    screenReader: e.target.value
                  })}
                >
                  <option value="">Sélectionnez...</option>
                  <option value="NVDA">NVDA</option>
                  <option value="JAWS">JAWS</option>
                  <option value="VoiceOver">VoiceOver (Mac/iOS)</option>
                  <option value="TalkBack">TalkBack (Android)</option>
                  <option value="Narrator">Narrator (Windows)</option>
                  <option value="Orca">Orca (Linux)</option>
                  <option value="other">Autre</option>
                </select>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="magnification"
                  className="rounded border-gray-300"
                  onChange={(e) => updateResponse('assistiveTech', {
                    magnification: (event.target as HTMLInputElement).checked
                  })}
                />
                <Label htmlFor="magnification" className="text-sm">
                  Logiciel de loupe/zoom
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="voicecontrol"
                  className="rounded border-gray-300"
                  onChange={(e) => updateResponse('assistiveTech', {
                    voiceControl: (event.target as HTMLInputElement).checked
                  })}
                />
                <Label htmlFor="voicecontrol" className="text-sm">
                  Contrôle vocal (dictée, commandes)
                </Label>
              </div>

              <div>
                <Label htmlFor="other-tech" className="text-sm font-medium">
                  Autres technologies :
                </Label>
                <Textarea
                  id="other-tech"
                  placeholder="Ex: Braille, switch control, etc."
                  className="mt-1"
                  onChange={(e) => updateResponse('assistiveTech', {
                    other: e.target.value
                  })}
                />
              </div>
            </div>
          </div>
        );

      case 'feedback':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Vos commentaires</h3>
              <p className="text-sm text-gray-600 mb-6">
                Aidez-nous à nous améliorer ! Partagez vos expériences positives et les difficultés rencontrées.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="positive" className="text-sm font-medium flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4 text-green-600" />
                  Ce qui fonctionne bien :
                </Label>
                <Textarea
                  id="positive"
                  placeholder="Qu'avez-vous apprécié dans l'accessibilité de l'application ?"
                  className="mt-1"
                  onChange={(e) => updateResponse('feedback', {
                    positive: (event.target as HTMLTextAreaElement).value
                  })}
                />
              </div>

              <div>
                <Label htmlFor="negative" className="text-sm font-medium flex items-center gap-2">
                  <ThumbsDown className="w-4 h-4 text-red-600" />
                  Ce qui pose problème :
                </Label>
                <Textarea
                  id="negative"
                  placeholder="Quels sont les problèmes d'accessibilité rencontrés ?"
                  className="mt-1"
                  onChange={(e) => updateResponse('feedback', {
                    negative: (event.target as HTMLTextAreaElement).value
                  })}
                />
              </div>

              <div>
                <Label htmlFor="suggestions" className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  Suggestions d'amélioration :
                </Label>
                <Textarea
                  id="suggestions"
                  placeholder="Comment pouvons-nous améliorer l'accessibilité ?"
                  className="mt-1"
                  onChange={(e) => updateResponse('feedback', {
                    suggestions: (event.target as HTMLTextAreaElement).value
                  })}
                />
              </div>
            </div>
          </div>
        );

      case 'thankyou':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-green-800">Merci pour votre participation !</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Vos retours sont précieux et nous aideront à améliorer l'accessibilité de notre plateforme pour tous les utilisateurs.
            </p>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-800">
                🎉 <strong>Audit terminé !</strong> Vos réponses ont été enregistrées anonymement.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="flex items-center gap-2"
      >
        <Users className="w-4 h-4" />
        Audit Accessibilité
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Audit d'Accessibilité Utilisateur
            </CardTitle>
            <Badge variant="outline">
              Étape {currentStep + 1} sur {steps.length}
            </Badge>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {renderStep()}
        </CardContent>

        <div className="border-t p-4 flex justify-between">
          <Button
            onClick={prevStep}
            disabled={currentStep === 0}
            variant="outline"
          >
            Précédent
          </Button>

          <div className="flex gap-2">
            {currentStep === steps.length - 1 ? (
              <Button
                onClick={submitAudit}
                className="bg-green-600 hover:bg-green-700"
              >
                Terminer
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                disabled={!steps[currentStep].required && !response.accessibility}
              >
                Suivant
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
