// lib/translation_data.ts
import { Locale } from '../constants/translations';

/**
 * A mapping for common fruits and items used in the seeded data.
 * Even if new fruits are added via voice, they typically follow these names.
 */
const ITEM_MAP: Record<string, Partial<Record<Locale, string>>> = {
  'apple': { 'hi-IN': 'सेब', 'mr-IN': 'सफरचंद', 'gu-IN': 'સફરજન' },
  'apples': { 'hi-IN': 'सेब', 'mr-IN': 'सफरचंद', 'gu-IN': 'સફરજન' },
  'banana': { 'hi-IN': 'केला', 'mr-IN': 'केळी', 'gu-IN': 'કેળા' },
  'bananas': { 'hi-IN': 'केले', 'mr-IN': 'केळी', 'gu-IN': 'કેળા' },
  'mango': { 'hi-IN': 'आम', 'mr-IN': 'आंबा', 'gu-IN': 'કેરી' },       
  'mangoes': { 'hi-IN': 'आम', 'mr-IN': 'आंबे', 'gu-IN': 'કેરી' },
  'orange': { 'hi-IN': 'संतरा', 'mr-IN': 'संत्री', 'gu-IN': 'સંતરા' },
  'oranges': { 'hi-IN': 'संतरे', 'mr-IN': 'संत्री', 'gu-IN': 'સંતરા' },
  'grapes': { 'hi-IN': 'अंगूर', 'mr-IN': 'द्राक्षे', 'gu-IN': 'દ્રાક્ષ' },
  'pineapple': { 'hi-IN': 'अनानास', 'mr-IN': 'अननस', 'gu-IN': 'અનાનસ' },
  'pomegranate': { 'hi-IN': 'अनार', 'mr-IN': 'डाळिंब', 'gu-IN': 'દાડમ' },
  'watermelon': { 'hi-IN': 'तरबूज', 'mr-IN': 'कलिंगड', 'gu-IN': 'તરબૂચ' },
  'potato': { 'hi-IN': 'आलू', 'mr-IN': 'बटाटा', 'gu-IN': 'બટાકા' },
  'onion': { 'hi-IN': 'प्याज', 'mr-IN': 'कांदा', 'gu-IN': 'ડુંગળી' },
  'tomato': { 'hi-IN': 'टमाटर', 'mr-IN': 'टोमॅटो', 'gu-IN': 'ટમેટા' },
  'rice': { 'hi-IN': 'चावल', 'mr-IN': 'तांदूळ', 'gu-IN': 'ચોખા' },
  'wheat': { 'hi-IN': 'गेहूं', 'mr-IN': 'गहू', 'gu-IN': 'ઘઉં' },
  'milk': { 'hi-IN': 'दूध', 'mr-IN': 'दूध', 'gu-IN': 'દૂધ' },
  'sugar': { 'hi-IN': 'चीनी', 'mr-IN': 'साखर', 'gu-IN': 'ખાંડ' },
  'oil': { 'hi-IN': 'तेल', 'mr-IN': 'तेल', 'gu-IN': 'તેલ' },
  'salt': { 'hi-IN': 'नमक', 'mr-IN': 'मीठ', 'gu-IN': 'મીઠું' },
};

/**
 * A mapping for business entities often used in client names.
 */
const ENTITY_MAP: Record<string, Partial<Record<Locale, string>>> = {
  'store': { 'hi-IN': 'स्टोर', 'mr-IN': 'स्टोर', 'gu-IN': 'સ્ટોર' },
  'stores': { 'hi-IN': 'स्टोर्स', 'mr-IN': 'स्टोर्स', 'gu-IN': 'સ્ટોર્સ' },
  'traders': { 'hi-IN': 'ट्रेडर्स', 'mr-IN': 'ट्रेडर्स', 'gu-IN': 'ટ્રેડર્સ' },
  'shop': { 'hi-IN': 'शॉप', 'mr-IN': 'शॉप', 'gu-IN': 'શોપ' },
  'agency': { 'hi-IN': 'एजेंसी', 'mr-IN': 'एजन्सी', 'gu-IN': 'એજન્સી' },
  'mart': { 'hi-IN': 'मार्ट', 'mr-IN': 'मार्ट', 'gu-IN': 'માર્ટ' },
  'enterprise': { 'hi-IN': 'एंटरप्राइज', 'mr-IN': 'एंटरप्राइझ', 'gu-IN': 'એન્ટરપ્રાઇઝ' },
  'super': { 'hi-IN': 'सुपर', 'mr-IN': 'सुपर', 'gu-IN': 'સુપર' },
  'provision': { 'hi-IN': 'प्रोविजन', 'mr-IN': 'प्रोविझन', 'gu-IN': 'પ્રોવિઝન' },
};

/**
 * Translates a given text (product or client name) based on the locale.
 * It's not a full AI translation, but covers most common wholesale items/entities.
 */
export function translateData(text: string, locale: Locale): string {
  if (locale === 'en' || locale === 'en-IN' || locale === 'en-US') return text;

  const targetLocale = locale as keyof typeof ITEM_MAP[string];
  const words = text.split(/\s+/);
  
  const translatedWords = words.map(word => {
    const lower = word.toLowerCase();
    
    // Check ITEM_MAP
    if (ITEM_MAP[lower] && ITEM_MAP[lower][targetLocale]) {
      return ITEM_MAP[lower][targetLocale];
    }
    
    // Check ENTITY_MAP
    if (ENTITY_MAP[lower] && ENTITY_MAP[lower][targetLocale]) {
      return ENTITY_MAP[lower][targetLocale];
    }
    
    // If it's a number (e.g. 5kg), keep it
    if (/^\d+/.test(word)) return word;

    return word; // Fallback to original word (e.g. for proper names like 'Raj')
  });

  return translatedWords.join(' ');
}
