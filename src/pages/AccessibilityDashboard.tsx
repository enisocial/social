import React, { useState } from 'react';
import { Shield, Users, TestTube, BarChart3, Settings, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AccessibilityValidator } from '@/components/AccessibilityValidator';
import { UserAccessibilityAudit } from '@/components/UserAccessibilityAudit';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useScreenReader } from '@/hooks/useScreenReader';

const AccessibilityDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [auditResponses, setAuditResponses] = useState<any[]>([]);
  const { help } = useKeyboardShortcuts({
    'ctrl+h': () => setActiveTab('help'),
    'ctrl+v': () => setActiveTab('validator'),
    'ctrl+a': () => setActiveTab('audit'),
    'ctrl+r': () => setActiveTab('reports')
  });
  const { announcePolite } = useScreenReader();

  const handleAuditCompleted = (response: any) => {
    setAuditResponses(prev => [...prev, response]);
    announcePolite('Nouvelle réponse d\'audit reçue');
  };

  const exportAllData = () => {
    const data = {
      auditResponses,
      timestamp: new Date().toISOString(),
      totalAudits: auditResponses.length,
      summary: {
        totalParticipants: auditResponses.length,
        accessibilityNeeds: auditResponses.reduce((acc, response) => {
          if (response.accessibility.canUseKeyboard) acc.keyboard++;
          if (response.accessibility.canUseScreenReader) acc.screenReader++;
          if (response.accessibility.canSeeColors) acc.colorBlind++;
          if (response.accessibility.hasMotionSensitivity) acc.motion++;
          if (response.accessibility.hasCognitiveDisabilities) acc.cognitive++;
          return acc;
        }, { keyboard: 0, screenReader: 0, colorBlind: 0, motion: 0, cognitive: 0 })
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accessibility-audit-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearAllData = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer toutes les données d\'audit ? Cette action est irréversible.')) {
      setAuditResponses([]);
      localStorage.removeItem('accessibility_audit_responses');
      announcePolite('Toutes les données d\'audit ont été supprimées');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Tableau de Bord Accessibilité
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Outils de validation et d'audit d'accessibilité WCAG 2.1 AA
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {auditResponses.length}
                </div>
                <p className="text-sm text-gray-600">Audits utilisateur</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {auditResponses.filter(r => r.ratings.overall >= 4).length}
                </div>
                <p className="text-sm text-gray-600">Expériences positives</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {auditResponses.filter(r => r.accessibility.canUseScreenReader).length}
                </div>
                <p className="text-sm text-gray-600">Utilisateurs SR</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {auditResponses.filter(r => r.accessibility.canUseKeyboard).length}
                </div>
                <p className="text-sm text-gray-600">Navigation clavier</p>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 flex-wrap">
            <Button onClick={exportAllData} disabled={auditResponses.length === 0} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Exporter les données
            </Button>

            <Button onClick={clearAllData} disabled={auditResponses.length === 0} variant="outline" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Effacer les données
            </Button>

            <KeyboardShortcutsHelp shortcuts={help} />
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Aperçu
            </TabsTrigger>
            <TabsTrigger value="validator" className="flex items-center gap-2">
              <TestTube className="w-4 h-4" />
              Validateur
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Audit Utilisateur
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Rapports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Welcome Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    Bienvenue dans l'Accessibilité
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600">
                    Ce tableau de bord vous permet de valider et d'auditer l'accessibilité
                    de votre application selon les standards WCAG 2.1 AA.
                  </p>

                  <div className="space-y-2">
                    <h4 className="font-medium">Fonctionnalités disponibles :</h4>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4">
                      <li>• Tests automatisés axe-core simulés</li>
                      <li>• Audit utilisateur guidé</li>
                      <li>• Validation WCAG 2.1 AA</li>
                      <li>• Export des données d'audit</li>
                      <li>• Support reduced-motion et haute contraste</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>💡 Conseil :</strong> Commencez par lancer un test d'accessibilité
                      automatique dans l'onglet "Validateur".
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-green-600" />
                    Actions Rapides
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => setActiveTab('validator')}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    Lancer un test d'accessibilité
                  </Button>

                  <Button
                    onClick={() => setActiveTab('audit')}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Effectuer un audit utilisateur
                  </Button>

                  <Button
                    onClick={() => setActiveTab('reports')}
                    className="w-full justify-start"
                    variant="outline"
                    disabled={auditResponses.length === 0}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Consulter les rapports
                    {auditResponses.length > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {auditResponses.length}
                      </Badge>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Accessibility Features Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Fonctionnalités d'Accessibilité Implémentées</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Shield className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-green-800">WCAG 2.1 AA</h4>
                      <p className="text-sm text-green-600">Conformité validée</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <TestTube className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-800">Tests Automatisés</h4>
                      <p className="text-sm text-blue-600">axe-core simulé</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-purple-800">Audit Utilisateur</h4>
                      <p className="text-sm text-purple-600">Retour qualitatif</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <Settings className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-orange-800">Reduced Motion</h4>
                      <p className="text-sm text-orange-600">Animations contrôlables</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-red-800">Haute Contraste</h4>
                      <p className="text-sm text-red-600">Visibilité améliorée</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                      <div className="w-4 h-4 bg-indigo-600 rounded" />
                    </div>
                    <div>
                      <h4 className="font-medium text-indigo-800">Raccourcis Clavier</h4>
                      <p className="text-sm text-indigo-600">Navigation accélérée</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="validator">
            <AccessibilityValidator
              onReportGenerated={(report) => {
                console.log('Rapport d\'accessibilité généré:', report);
                announcePolite(`Test terminé. Score: ${report.score}%`);
              }}
            />
          </TabsContent>

          <TabsContent value="audit">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Audit d'Accessibilité Utilisateur
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Lancez un audit guidé pour recueillir des retours qualitatifs
                    sur l'accessibilité de votre application.
                  </p>
                  <UserAccessibilityAudit onAuditCompleted={handleAuditCompleted} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Rapports d'Audit ({auditResponses.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {auditResponses.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Aucun audit effectué
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Les résultats des audits utilisateur apparaîtront ici.
                      </p>
                      <Button onClick={() => setActiveTab('audit')}>
                        Lancer un audit
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {auditResponses.map((response, index) => (
                        <Card key={response.id} className="border-l-4 border-l-blue-500">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium">Audit #{index + 1}</h4>
                              <Badge variant="outline">
                                {new Date(response.timestamp).toLocaleDateString()}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                              <div className="text-center">
                                <div className="text-lg font-bold text-blue-600">
                                  {response.ratings.overall}/5
                                </div>
                                <p className="text-xs text-gray-600">Global</p>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold text-green-600">
                                  {response.ratings.navigation}/5
                                </div>
                                <p className="text-xs text-gray-600">Navigation</p>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold text-purple-600">
                                  {response.ratings.content}/5
                                </div>
                                <p className="text-xs text-gray-600">Contenu</p>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold text-orange-600">
                                  {response.ratings.functionality}/5
                                </div>
                                <p className="text-xs text-gray-600">Fonctionnalités</p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div>
                                <span className="text-sm font-medium">Technologies d'assistance :</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {response.accessibility.canUseScreenReader && (
                                    <Badge variant="secondary">Lecteur d'écran</Badge>
                                  )}
                                  {response.accessibility.canUseKeyboard && (
                                    <Badge variant="secondary">Clavier</Badge>
                                  )}
                                  {response.accessibility.canSeeColors && (
                                    <Badge variant="secondary">Daltonien</Badge>
                                  )}
                                  {response.accessibility.hasMotionSensitivity && (
                                    <Badge variant="secondary">Motion sensitive</Badge>
                                  )}
                                </div>
                              </div>

                              {response.feedback.positive && (
                                <div>
                                  <span className="text-sm font-medium text-green-600">Points positifs :</span>
                                  <p className="text-sm text-gray-600 mt-1">{response.feedback.positive}</p>
                                </div>
                              )}

                              {response.feedback.negative && (
                                <div>
                                  <span className="text-sm font-medium text-red-600">Points d'amélioration :</span>
                                  <p className="text-sm text-gray-600 mt-1">{response.feedback.negative}</p>
                                </div>
                              )}

                              {response.feedback.suggestions && (
                                <div>
                                  <span className="text-sm font-medium text-blue-600">Suggestions :</span>
                                  <p className="text-sm text-gray-600 mt-1">{response.feedback.suggestions}</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AccessibilityDashboard;
