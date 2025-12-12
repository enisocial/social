/**
 * Utilitaires de tests d'accessibilité automatisés
 * Compatible avec axe-core et WCAG 2.1 AA
 */

import { useCallback } from 'react';

export interface AccessibilityIssue {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: Array<{
    target: string[];
    html: string;
    failureSummary: string;
  }>;
}

export interface AccessibilityReport {
  timestamp: string;
  url: string;
  score: number;
  issues: AccessibilityIssue[];
  summary: {
    passed: number;
    failed: number;
    incomplete: number;
    inapplicable: number;
  };
  wcagCompliance: {
    level: 'A' | 'AA' | 'AAA';
    compliance: number; // pourcentage
    issues: {
      critical: number;
      serious: number;
      moderate: number;
      minor: number;
    };
  };
}

/**
 * Fonction principale pour exécuter les tests d'accessibilité
 */
export const runAccessibilityTest = async (
  element?: Element
): Promise<AccessibilityReport> => {
  const target = element || document.body;

  try {
    // Simulation des résultats axe-core (en production, utiliser axe-core directement)
    const mockResults = await simulateAxeCoreTest(target);

    return {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      score: calculateAccessibilityScore(mockResults),
      issues: mockResults.violations,
      summary: mockResults.summary,
      wcagCompliance: {
        level: 'AA',
        compliance: calculateWCAGCompliance(mockResults),
        issues: countIssuesByImpact(mockResults.violations)
      }
    };
  } catch (error) {
    console.error('Erreur lors du test d\'accessibilité:', error);
    return {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      score: 0,
      issues: [],
      summary: { passed: 0, failed: 0, incomplete: 0, inapplicable: 0 },
      wcagCompliance: {
        level: 'AA',
        compliance: 0,
        issues: { critical: 0, serious: 0, moderate: 0, minor: 0 }
      }
    };
  }
};

/**
 * Simulation des tests axe-core pour le développement
 * En production, remplacer par axe-core.run()
 */
const simulateAxeCoreTest = async (element: Element) => {
  // Simuler un délai de test
  await new Promise(resolve => setTimeout(resolve, 100));

  // Tests simulés basés sur les composants live audio
  const violations: AccessibilityIssue[] = [];

  // Test des labels aria manquants
  const elementsWithoutAriaLabel = element.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
  if (elementsWithoutAriaLabel.length > 0) {
    violations.push({
      id: 'button-name',
      impact: 'serious',
      description: 'Les boutons doivent avoir un nom accessible',
      help: 'Assurez-vous que tous les boutons ont un texte visible ou un attribut aria-label',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.7/button-name',
      tags: ['wcag2a', 'wcag412', 'section508', 'section508.22.a'],
      nodes: Array.from(elementsWithoutAriaLabel).map(el => ({
        target: [getElementSelector(el)],
        html: el.outerHTML,
        failureSummary: 'Le bouton n\'a pas de nom accessible'
      }))
    });
  }

  // Test du contraste des couleurs
  const lowContrastElements = element.querySelectorAll('[class*="text-gray-400"], [class*="text-gray-300"]');
  if (lowContrastElements.length > 0) {
    violations.push({
      id: 'color-contrast',
      impact: 'serious',
      description: 'Le contraste des couleurs doit être suffisant',
      help: 'Assurez-vous qu\'il y a suffisamment de contraste entre le texte et l\'arrière-plan',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.7/color-contrast',
      tags: ['wcag2aa', 'wcag143', 'section508', 'section508.22.a'],
      nodes: Array.from(lowContrastElements).map(el => ({
        target: [getElementSelector(el)],
        html: el.outerHTML,
        failureSummary: 'Contraste insuffisant détecté'
      }))
    });
  }

  // Test des images sans alt
  const imagesWithoutAlt = element.querySelectorAll('img:not([alt])');
  if (imagesWithoutAlt.length > 0) {
    violations.push({
      id: 'image-alt',
      impact: 'serious',
      description: 'Les images doivent avoir un attribut alt',
      help: 'Fournissez un attribut alt descriptif pour toutes les images',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.7/image-alt',
      tags: ['wcag2a', 'wcag111', 'section508', 'section508.22.a'],
      nodes: Array.from(imagesWithoutAlt).map(el => ({
        target: [getElementSelector(el)],
        html: el.outerHTML,
        failureSummary: 'Image sans attribut alt'
      }))
    });
  }

  return {
    violations,
    summary: {
      passed: 15, // simulé
      failed: violations.length,
      incomplete: 2,
      inapplicable: 5
    }
  };
};

/**
 * Calcule le score d'accessibilité global
 */
const calculateAccessibilityScore = (results: any): number => {
  const total = results.summary.passed + results.summary.failed;
  if (total === 0) return 100;

  const score = (results.summary.passed / total) * 100;
  return Math.round(score);
};

/**
 * Calcule la conformité WCAG
 */
const calculateWCAGCompliance = (results: any): number => {
  // Logique simplifiée : plus il y a d'erreurs, moins le score est élevé
  const baseScore = calculateAccessibilityScore(results);
  const penalty = results.violations.length * 5; // 5 points de pénalité par violation
  return Math.max(0, baseScore - penalty);
};

/**
 * Compte les problèmes par niveau d'impact
 */
const countIssuesByImpact = (violations: AccessibilityIssue[]) => {
  return violations.reduce(
    (acc, violation) => {
      acc[violation.impact as keyof typeof acc]++;
      return acc;
    },
    { critical: 0, serious: 0, moderate: 0, minor: 0 }
  );
};

/**
 * Génère un sélecteur CSS pour un élément
 */
const getElementSelector = (element: Element): string => {
  if (element.id) {
    return `#${element.id}`;
  }

  if (element.className) {
    return `${element.tagName.toLowerCase()}.${element.className.split(' ').join('.')}`;
  }

  // Générer un sélecteur basé sur la position
  let path = [];
  let current = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break;
    } else if (current.className) {
      selector += `.${current.className.split(' ').join('.')}`;
    }

    // Ajouter l'index si nécessaire
    const siblings = Array.from(current.parentNode?.children || []);
    const index = siblings.indexOf(current as Element);
    if (siblings.length > 1) {
      selector += `:nth-child(${index + 1})`;
    }

    path.unshift(selector);
    current = current.parentNode as Element;

    if (path.length > 5) break; // Limiter la profondeur
  }

  return path.join(' > ');
};

/**
 * Hook React pour utiliser les tests d'accessibilité
 */
export const useAccessibilityTest = () => {
  const testComponent = useCallback(async (element?: Element) => {
    return await runAccessibilityTest(element);
  }, []);

  const testCurrentPage = useCallback(async () => {
    return await runAccessibilityTest();
  }, []);

  return {
    testComponent,
    testCurrentPage
  };
};
