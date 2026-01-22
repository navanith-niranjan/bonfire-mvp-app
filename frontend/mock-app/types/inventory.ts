export type UserCard = {
  id: number; // Database ID
  user_id: string;
  name: string;
  image_url: string | null;
  status: 'pending' | 'authenticating' | 'authenticated' | 'vaulted' | 'rejected' | 'trading';
  collectible_type: string;
  external_id: string | null;
  external_api: string | null;
  item_data: {
    condition?: string;
    set?: string;
    [key: string]: any;
  } | null;
  submitted_at: string | null; // ISO date string
  vaulted_at: string | null; // ISO date string
  created_at: string | null; // ISO date string
};

