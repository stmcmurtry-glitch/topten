export interface TopTenItem {
  id: string;
  rank: number;
  title: string;
  imageUrl?: string;
}

export interface TopTenList {
  id: string;
  category: string;
  title: string;
  icon: string;
  items: TopTenItem[];
  createdAt: string;
  isCustom: boolean;
  description?: string;
  customIcon?: string;
  coverImageUri?: string;   // hero/banner image at top of ListDetailScreen
  profileImageUri?: string; // thumbnail shown in My Lists rows
}
