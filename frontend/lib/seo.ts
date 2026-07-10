// lib/seo.ts
import { Metadata } from 'next';

export interface SEOProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  keywords?: string[];
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

export function generateMetadata({
  title,
  description = 'Shop the best products at SnapCart - Your one-stop e-commerce destination',
  image = '/og-image.jpg',
  url,
  type = 'website',
  keywords = ['ecommerce', 'shop', 'products', 'snapcart'],
  author = 'SnapCart',
  publishedTime,
  modifiedTime,
}: SEOProps): Metadata {
  const siteName = 'SnapCart';
  const fullTitle = `${title} | ${siteName}`;

  // ✅ Build openGraph with proper typing
  const openGraph: any = {
    title: fullTitle,
    description,
    url,
    siteName,
    images: [
      {
        url: image,
        width: 1200,
        height: 630,
        alt: title,
      },
    ],
    type: type === 'website' ? 'website' : 'article',
  };

  // ✅ Add dates only if provided (using any to bypass strict typing)
  if (publishedTime) {
    openGraph.publishedTime = publishedTime;
  }

  if (modifiedTime) {
    openGraph.modifiedTime = modifiedTime;
  }

  const metadata: Metadata = {
    title: fullTitle,
    description,
    keywords: keywords.join(', '),
    authors: [{ name: author }],
    creator: author,
    publisher: author,
    openGraph,
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
      creator: `@${author.toLowerCase()}`,
      site: `@${author.toLowerCase()}`,
    },
    alternates: {
      canonical: url,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };

  // ✅ Add verification only if set
  if (process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION) {
    metadata.verification = {
      google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
    };
  }

  return metadata;
}

// ✅ Generate JSON-LD for products
export function generateProductJsonLd(product: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.imageUrl,
    sku: `PROD-${product.id}`,
    brand: {
      '@type': 'Brand',
      name: product.owner?.name || 'SnapCart',
    },
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'USD',
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: product.owner?.name || 'SnapCart',
      },
      url: `/products/${product.id}`,
    },
    ...(product.averageRating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.averageRating,
        reviewCount: product.totalReviews || 0,
      },
    }),
    ...(product.category && {
      category: product.category.name,
    }),
  };
}

// ✅ Generate JSON-LD for breadcrumbs
export function generateBreadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ✅ Generate JSON-LD for organization
export function generateOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SnapCart',
    url: 'https://snapcart.com',
    logo: 'https://snapcart.com/logo.png',
    sameAs: [
      'https://facebook.com/snapcart',
      'https://twitter.com/snapcart',
      'https://instagram.com/snapcart',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-555-123-4567',
      contactType: 'Customer Service',
      availableLanguage: ['English'],
    },
  };
}

// ✅ Generate JSON-LD for website
export function generateWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'SnapCart',
    url: 'https://snapcart.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://snapcart.com/products?search={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };
}