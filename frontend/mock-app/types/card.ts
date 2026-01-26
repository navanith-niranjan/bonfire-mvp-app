/**
 * Pokemon card type definitions
 * Simplified version for Supabase-backed search
 */
export type PokemonCard = {
  id: number;
  external_id: string;
  name: string;
  set_name: string | null;
  number: string | null;
  rarity: string | null;
  supertype: string | null;
  subtypes: string[] | null;
  image_small: string | null;
  image_large: string | null;
  language: string | null;
  name_jp: string | null;
  market_price: number | null;
  price_source: string | null;
  price_updated_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};
