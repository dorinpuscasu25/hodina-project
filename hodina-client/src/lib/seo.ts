import { useEffect } from 'react';

interface SeoOptions {
  title: string;
  description: string;
  image?: string | null;
  type?: 'website' | 'article' | 'profile';
  noindex?: boolean;
  canonicalPath?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>> | null;
}

function upsertMeta(attribute: 'name' | 'property', value: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${value}"]`);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, value);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
}

function buildAbsoluteUrl(path?: string) {
  if (!path) {
    return window.location.href;
  }

  return new URL(path, window.location.origin).toString();
}

const DEFAULT_OG_IMAGE = 'https://images.pexels.com/photos/1470502/pexels-photo-1470502.jpeg';

export function useSeo({
  title,
  description,
  image,
  type = 'website',
  noindex = false,
  canonicalPath,
  jsonLd = null,
}: SeoOptions) {
  useEffect(() => {
    const pageTitle = title.includes('Hodina') ? title : `${title} | Hodina`;
    const canonicalUrl = buildAbsoluteUrl(canonicalPath);
    const imageUrl = image ? buildAbsoluteUrl(image) : DEFAULT_OG_IMAGE;

    document.title = pageTitle;

    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    upsertMeta('property', 'og:title', pageTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:image', imageUrl);
    upsertMeta('property', 'og:site_name', 'Hodina');
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', pageTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', imageUrl);
    upsertLink('canonical', canonicalUrl);

    const scriptId = 'hodina-jsonld';
    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      existingScript.remove();
    }

    if (jsonLd) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      const currentScript = document.getElementById(scriptId);

      if (currentScript) {
        currentScript.remove();
      }
    };
  }, [canonicalPath, description, image, jsonLd, noindex, title, type]);
}
