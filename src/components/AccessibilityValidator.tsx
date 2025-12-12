import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { runAccessibilityTest, AccessibilityReport, AccessibilityIssue } from '@/utils/accessibilityTest';
import { useScreenReader } from '@/hooks/useScreenReader';

interface AccessibilityValidatorProps {
  autoRun?: boolean;
  showDetails?: boolean;
  onReportGenerated?: (report: AccessibilityReport) => void;
}

export const AccessibilityValidator: React.FC<AccessibilityValidatorProps> = ({
  autoRun = false,
  showDetails = true,
  onReportGenerated
}) => {
  const [report, setReport] = useState<AccessibilityReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const { announceAssertive } = useScreenReader();

  // Exécution automatique au montage si demandé
  useEffect(() => {
    if (autoRun) {
      runTest();
    }
  }, [autoRun]);

  const runTest = async () => {
    setIsRunning(true);
    announceAssertive('Test d\'accessibilité en cours...');

    try {
      const result = await runAccessibilityTest();
      setReport(result);
      setLastRun(new Date());

      // Annoncer les résultats
      const status = result.score >= 90 ? 'excellent' : result.score >= 70 ? 'bon' : 'à améliorer';
      announceAssertive(`Test terminé. Score d'accessibilité: ${result.score}%. Statut: ${status}`);

      onReportGenerated?.(result);
    } catch (error) {
      console.error('Erreur lors du test d\'accessibilité:', error);
      announceAssertive('Erreur lors du test d\'accessibilité');
    } finally {
      setIsRunning(false);
    }
  };

  const exportReport = () => {
    if (!report) return;

    const dataStr = JSON.stringify(report, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `accessibility-report-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 70) return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'serious': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'minor': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!showDetails) {
    return (
      <div className="flex items-center gap-4 p-4 bg-white/80 backdrop-blur-sm rounded-lg border">
        <Shield className={`w-6 h-6 ${report ? getScoreColor(report.score) : 'text-gray-400'}`} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">Accessibilité</span>
            {report && (
              <Badge variant="outline" className={getScoreColor(report.score)}>
                {report.score}%
              </Badge>
            )}
          </div>
          {lastRun && (
            <p className="text-sm text-gray-600">
              Dernier test: {lastRun.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button
          onClick={runTest}
          disabled={isRunning}
          size="sm"
          variant="outline"
        >
          {isRunning ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Shield className="w-4 h-4" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-600" />
          Validateur d'Accessibilité WCAG 2.1 AA
          {report && getScoreIcon(report.score)}
        </CardTitle>
        <div className="flex items-center gap-4">
          <Button
            onClick={runTest}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Shield className="w-4 h-4" />
            )}
            {isRunning ? 'Test en cours...' : 'Lancer le test'}
          </Button>

          {report && (
            <Button
              onClick={exportReport}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exporter
            </Button>
          )}

          {lastRun && (
            <span className="text-sm text-gray-600">
              Dernière exécution: {lastRun.toLocaleString()}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {report ? (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Aperçu</TabsTrigger>
              <TabsTrigger value="issues">
                Problèmes ({report.issues.length})
              </TabsTrigger>
              <TabsTrigger value="compliance">Conformité WCAG</TabsTrigger>
              <TabsTrigger value="details">Détails</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Score principal */}
              <div className="text-center py-8">
                <div className={`text-6xl font-bold ${getScoreColor(report.score)}`}>
                  {report.score}%
                </div>
                <p className="text-gray-600 mt-2">
                  Score d'accessibilité global
                </p>
                <Progress
                  value={report.score}
                  className="mt-4 max-w-md mx-auto"
                />
              </div>

              {/* Métriques principales */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {report.summary.passed}
                    </div>
                    <p className="text-sm text-gray-600">Tests réussis</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {report.summary.failed}
                    </div>
                    <p className="text-sm text-gray-600">Échecs</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {report.wcagCompliance.compliance}%
                    </div>
                    <p className="text-sm text-gray-600">Conformité WCAG</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {report.issues.length}
                    </div>
                    <p className="text-sm text-gray-600">Problèmes détectés</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="issues" className="space-y-4">
              <ScrollArea className="h-96">
                {report.issues.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Aucun problème détecté !
                    </h3>
                    <p className="text-gray-600">
                      Félicitations ! Votre page respecte les critères d'accessibilité testés.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {report.issues.map((issue, index) => (
                      <Card key={issue.id} className="border-l-4 border-l-red-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge className={getImpactColor(issue.impact)}>
                                {issue.impact}
                              </Badge>
                              <span className="font-medium text-gray-900">
                                {issue.description}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500">
                              #{index + 1}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 mb-3">
                            {issue.help}
                          </p>

                          <div className="text-xs text-gray-500">
                            <a
                              href={issue.helpUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              En savoir plus →
                            </a>
                          </div>

                          {issue.nodes.length > 0 && (
                            <details className="mt-3">
                              <summary className="text-sm font-medium cursor-pointer text-gray-700">
                                Éléments affectés ({issue.nodes.length})
                              </summary>
                              <div className="mt-2 space-y-2">
                                {issue.nodes.slice(0, 3).map((node, nodeIndex) => (
                                  <div key={nodeIndex} className="bg-gray-50 p-2 rounded text-xs font-mono">
                                    {node.target[0]}
                                  </div>
                                ))}
                                {issue.nodes.length > 3 && (
                                  <p className="text-xs text-gray-500">
                                    ... et {issue.nodes.length - 3} autres éléments
                                  </p>
                                )}
                              </div>
                            </details>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="compliance" className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-4">Conformité WCAG 2.1 AA</h3>
                <div className="inline-flex items-center gap-4">
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${getScoreColor(report.wcagCompliance.compliance)}`}>
                      {report.wcagCompliance.compliance}%
                    </div>
                    <p className="text-sm text-gray-600">Conformité</p>
                  </div>
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    Niveau {report.wcagCompliance.level}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {report.wcagCompliance.issues.critical}
                    </div>
                    <p className="text-sm text-gray-600">Critiques</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {report.wcagCompliance.issues.serious}
                    </div>
                    <p className="text-sm text-gray-600">Graves</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {report.wcagCompliance.issues.moderate}
                    </div>
                    <p className="text-sm text-gray-600">Modérés</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {report.wcagCompliance.issues.minor}
                    </div>
                    <p className="text-sm text-gray-600">Mineurs</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Résumé des tests</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Tests réussis:</span>
                      <span className="font-medium text-green-600">{report.summary.passed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tests échoués:</span>
                      <span className="font-medium text-red-600">{report.summary.failed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tests incomplets:</span>
                      <span className="font-medium text-yellow-600">{report.summary.incomplete}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Non applicables:</span>
                      <span className="font-medium text-gray-600">{report.summary.inapplicable}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-600">URL testée:</span>
                      <p className="text-xs font-mono break-all">{report.url}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Horodatage:</span>
                      <p className="text-sm">{new Date(report.timestamp).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Problèmes détectés:</span>
                      <p className="text-lg font-bold">{report.issues.length}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucun rapport disponible
            </h3>
            <p className="text-gray-600 mb-6">
              Lancez un test d'accessibilité pour générer un rapport détaillé.
            </p>
            <Button onClick={runTest} disabled={isRunning}>
              {isRunning ? 'Test en cours...' : 'Lancer le test d\'accessibilité'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
