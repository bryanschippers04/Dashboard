/**
 * Keyword-based transaction categorizer for Dutch personal finance.
 *
 * Pure function. Input is the raw merchant/description string from the bank
 * (e.g. "PAYPAL *NETFLIX EUR 9,99" or "AH 1234 AMSTERDAM"); output is one of
 * the broad categories below, or 'other' if nothing matches.
 *
 * Add merchants by appending to the relevant array. Matching is case-insensitive
 * substring. Keep the lists short and broad — fine-grained subcategorization
 * is out of scope for the MVP.
 */

export type Category =
  | 'groceries'
  | 'transport'
  | 'food-out'
  | 'subscriptions'
  | 'shopping'
  | 'entertainment'
  | 'health'
  | 'bills'
  | 'income'
  | 'transfer'
  | 'other'

const KEYWORDS: Record<Exclude<Category, 'other'>, string[]> = {
  groceries: [
    'albert heijn', 'ah to go', 'ah-to-go', 'ah ',
    'jumbo', 'lidl', 'aldi', 'dirk', 'plus ',
    'picnic', 'crisp', 'flink', 'gorillas',
    'spar', 'ekoplaza', 'marqt',
  ],
  transport: [
    'ns ', 'ns-international', 'ns groep', 'nederlandse spoorwegen',
    'ov-chipkaart', 'ov chipkaart', 'translink',
    'gvb', 'ret ', 'htm', 'connexxion', 'arriva',
    'anwb', 'shell', 'bp ', 'esso', 'tinq', 'tango',
    'uber', 'bolt.eu', 'felyx', 'check ', 'go sharing',
    'greenwheels', 'snappcar',
    'q-park', 'parkmobile', 'p+r',
  ],
  'food-out': [
    'thuisbezorgd', 'uber eats', 'uber*eats', 'deliveroo',
    'mcdonalds', "mcdonald's", 'mc donalds',
    'kfc', 'burger king', 'subway', 'dominos', "domino's",
    'starbucks', 'coffeecompany', 'coffee company', 'bagels & beans',
    'la place', 'vapiano', 'new york pizza',
    'restaurant', 'cafe', 'brasserie', 'bistro',
  ],
  subscriptions: [
    'netflix', 'spotify', 'apple.com/bill', 'itunes', 'apple music',
    'google *', 'google play', 'youtube premium',
    'openai', 'anthropic', 'github', 'vercel', 'aws ', 'amazon web services',
    'notion', 'figma', 'adobe', 'dropbox', 'icloud',
    'disney', 'disneyplus', 'hbo', 'videoland', 'viaplay',
    'linkedin premium', 'medium',
  ],
  shopping: [
    'bol.com', 'amazon', 'coolblue', 'mediamarkt', 'media markt',
    'ikea', 'action ', 'hema', 'blokker', 'kruidvat',
    'h&m', 'zara', 'zalando', 'wehkamp', 'about you',
    'decathlon', 'intersport', 'bever',
  ],
  entertainment: [
    'pathe', 'pathé', 'vue cinemas', 'kinepolis',
    'steam ', 'steampowered', 'playstation', 'nintendo',
    'spotify concerts', 'ticketmaster', 'eventim', 'paylogic',
  ],
  health: [
    'apotheek', 'drogist', 'etos', 'da drogist',
    'huisarts', 'tandarts', 'fysio', 'fysiotherapie',
    'cz ', 'vgz', 'menzis', 'zilveren kruis', 'fbto',
    'basic fit', 'sportschool', 'gym',
  ],
  bills: [
    'vodafone', 't-mobile', 'tele2', 'kpn ', 'simyo',
    'ziggo', 'xs4all', 'odido',
    'eneco', 'vattenfall', 'essent', 'greenchoice', 'budget energie',
    'vitens', 'evides', 'waternet',
    'belastingdienst', 'gemeente ', 'waterschap',
  ],
  income: [
    'salaris', 'salary', 'loon ', 'wage',
    'overboeking van', 'incoming transfer',
  ],
  transfer: [
    'tikkie', 'ideal', 'spaarrekening', 'savings',
    'overboeking naar', 'eigen rekening', 'eigen overboeking',
    'vrij spaargeld', 'naar spaargeld', 'van spaargeld', 'spaargeld',
    'vermogensbeheer',
  ],
}

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

/**
 * Categorize a raw bank transaction description.
 * Returns 'other' if no keyword matches.
 */
export function categorize(rawDescription: string): Category {
  if (!rawDescription) return 'other'
  const text = normalize(rawDescription)

  for (const [category, keywords] of Object.entries(KEYWORDS) as [
    Exclude<Category, 'other'>,
    string[],
  ][]) {
    if (keywords.some((kw) => text.includes(kw))) {
      return category
    }
  }
  return 'other'
}

/**
 * Convenience for the sync route — combine merchant + any extra description text
 * the provider gives us before categorizing, so partial fields don't miss matches.
 */
export function categorizeTransaction(parts: {
  merchant?: string | null
  description?: string | null
  remittance?: string | null
}): Category {
  const haystack = [parts.merchant, parts.description, parts.remittance]
    .filter(Boolean)
    .join(' ')
  return categorize(haystack)
}
