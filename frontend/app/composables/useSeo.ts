export const useSeo = async (options?: {
  title?: string,
  description?: string,
  keywords?: string,
  ogImage?: string,
}) => {
  const seoFallback = {
    "title": "Tutelage AI",
    "description": "",
    "keywords": ""
  };
  let title = options?.title || seoFallback.title;
  let description = options?.description || seoFallback.description;
  let keywords = options?.keywords || seoFallback.keywords;

  useSeoMeta({
    title,
    ogTitle: title,
    twitterTitle: title,
    description,
    ogDescription: description,
    twitterDescription: description,
    keywords,
    ogUrl: 'https://tutelage.krd',
    twitterImage: options?.ogImage || '/default-og-image.webp',
    ogImage: options?.ogImage || '/default-og-image.webp',
    ogType: 'website',
    twitterCard: 'summary_large_image',
    themeColor: '#cc923b',
  })

}
