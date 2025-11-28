// Hook pour gérer le SEO dynamique par page
import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  keywords?: string[];
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
}

export const useSEO = ({
  title,
  description,
  image,
  url,
  type = 'website',
  keywords = [],
  author,
  publishedTime,
  modifiedTime,
  section,
  tags = []
}: SEOProps = {}) => {

  useEffect(() => {
    // Titre de la page
    if (title) {
      document.title = title;
    }

    // Meta description
    updateMetaTag('description', description);

    // Keywords
    if (keywords.length > 0) {
      updateMetaTag('keywords', keywords.join(', '));
    }

    // Author
    if (author) {
      updateMetaTag('author', author);
    }

    // Article metadata
    if (publishedTime) {
      updateMetaProperty('article:published_time', publishedTime);
    }
    if (modifiedTime) {
      updateMetaProperty('article:modified_time', modifiedTime);
    }
    if (section) {
      updateMetaProperty('article:section', section);
    }
    if (tags.length > 0) {
      tags.forEach(tag => {
        updateMetaProperty('article:tag', tag);
      });
    }

    // Open Graph
    updateMetaProperty('og:title', title);
    updateMetaProperty('og:description', description);
    updateMetaProperty('og:image', image);
    updateMetaProperty('og:url', url);
    updateMetaProperty('og:type', type);

    // Twitter Card
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', image);

    // Canonical URL
    updateCanonicalUrl(url);

    // Structured Data
    updateStructuredData({
      title,
      description,
      image,
      url,
      type,
      author,
      publishedTime,
      section
    });

  }, [title, description, image, url, type, keywords, author, publishedTime, modifiedTime, section, tags]);
};

// Fonctions utilitaires pour mettre à jour les métas
function updateMetaTag(name: string, content?: string) {
  if (!content) return;

  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
}

function updateMetaProperty(property: string, content?: string) {
  if (!content) return;

  let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', property);
    document.head.appendChild(meta);
  }
  meta.content = content;
}

function updateCanonicalUrl(url?: string) {
  if (!url) return;

  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = url;
}

function updateStructuredData(data: any) {
  // Supprimer l'ancien structured data s'il existe
  const existingSD = document.querySelector('script[type="application/ld+json"][data-dynamic-seo]');
  if (existingSD) {
    existingSD.remove();
  }

  // Créer le nouveau structured data
  const structuredData: any = {
    "@context": "https://schema.org",
    "@type": data.type === 'article' ? 'Article' : 'WebPage',
    "name": data.title,
    "description": data.description,
    "url": data.url,
    "image": data.image,
    "publisher": {
      "@type": "Organization",
      "name": "Social",
      "url": "https://b1894adb-8667-4b24-898a-262927a8296d.lovableproject.com/"
    }
  };

  if (data.type === 'article') {
    structuredData["@type"] = "Article";
    if (data.author) {
      structuredData.author = {
        "@type": "Person",
        "name": data.author
      };
    }
    if (data.publishedTime) {
      structuredData.datePublished = data.publishedTime;
    }
    if (data.section) {
      structuredData.articleSection = data.section;
    }
  }

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-dynamic-seo', 'true');
  script.textContent = JSON.stringify(structuredData);
  document.head.appendChild(script);
}

// Hook pour gérer les métas Open Graph dynamiques pour le partage social
export const useSocialShare = (shareData: {
  title: string;
  description: string;
  image: string;
  url: string;
  hashtags?: string[];
}) => {
  useEffect(() => {
    // WhatsApp
    updateMetaProperty('og:image', shareData.image);

    // Facebook
    updateMetaProperty('og:title', shareData.title);
    updateMetaProperty('og:description', shareData.description);
    updateMetaProperty('og:image', shareData.image);
    updateMetaProperty('og:url', shareData.url);

    // Twitter
    updateMetaTag('twitter:title', shareData.title);
    updateMetaTag('twitter:description', shareData.description);
    updateMetaTag('twitter:image', shareData.image);

    // LinkedIn
    updateMetaProperty('og:title', shareData.title);
    updateMetaProperty('og:description', shareData.description);
    updateMetaProperty('og:image', shareData.image);

    // Hashtags pour Twitter
    if (shareData.hashtags && shareData.hashtags.length > 0) {
      updateMetaTag('twitter:hashtags', shareData.hashtags.join(','));
    }

  }, [shareData]);
};

// Hook pour optimiser le SEO des pages de profil
export const useProfileSEO = (profile: {
  username: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  location?: string;
  joinDate?: string;
}) => {
  const title = `${profile.name} (@${profile.username}) - Social`;
  const description = profile.bio
    ? `${profile.bio} - Découvrez le profil de ${profile.name} sur Social.`
    : `Découvrez le profil de ${profile.name} sur Social, le réseau social panafricain.`;
  const image = profile.avatarUrl || '/og-image.png';
  const url = `https://b1894adb-8667-4b24-898a-262927a8296d.lovableproject.com/profile/${profile.username}`;

  useSEO({
    title,
    description,
    image,
    url,
    type: 'profile',
    author: profile.name,
    publishedTime: profile.joinDate,
    keywords: ['profil', 'réseau social', 'communauté', profile.name, profile.username]
  });
};

// Hook pour optimiser le SEO des posts
export const usePostSEO = (post: {
  id: string;
  content: string;
  author: {
    name: string;
    username: string;
  };
  createdAt: string;
  mediaUrls?: string[];
}) => {
  const title = `Post de ${post.author.name} - Social`;
  const description = post.content.length > 160
    ? post.content.substring(0, 157) + '...'
    : post.content;
  const image = post.mediaUrls?.[0] || '/og-image.png';
  const url = `https://b1894adb-8667-4b24-898a-262927a8296d.lovableproject.com/post/${post.id}`;

  useSEO({
    title,
    description,
    image,
    url,
    type: 'article',
    author: post.author.name,
    publishedTime: post.createdAt,
    keywords: ['post', 'réseau social', 'partage', post.author.username]
  });
};
