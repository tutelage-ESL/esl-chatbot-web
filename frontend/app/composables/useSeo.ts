export const useSeo = async (options?: {
  title?: string,
  description?: string,
  keywords?: string,
  ogImage?: string,
}) => {
  const seoFallback = {
    "title": "Smiles Mates",
    "description": "Smile Mates is a loyalty program that rewards customers for their repeat purchases by offering discounts and rewards for every purchase. This program allows us to gain insights into our customers' preferences and thus improve their experience and satisfaction.",
    "keywords": "loyalty program, rewards, discounts, customer satisfaction, repeat purchases, customer insights"
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
    ogUrl: 'https://smilemates.com',
    twitterImage: options?.ogImage || '/default-og-image.webp',
    ogImage: options?.ogImage || '/default-og-image.webp',
    ogType: 'website',
    twitterCard: 'summary_large_image',
    themeColor: '#cc923b',
  })

}
