export interface Category {
  label: string;
  icon: string;
  color: string;
}

export const CATEGORIES: Category[] = [
  { label: 'Movies',       icon: 'film-outline',             color: '#FF6B6B' },
  { label: 'TV',           icon: 'tv-outline',               color: '#5B8DEF' },
  { label: 'Music',        icon: 'musical-notes-outline',    color: '#A29BFE' },
  { label: 'Sports',       icon: 'trophy-outline',           color: '#FF9F43' },
  { label: 'Food',         icon: 'restaurant-outline',       color: '#FFB347' },
  { label: 'Drinks',       icon: 'wine-outline',             color: '#00CEC9' },
  { label: 'Books',        icon: 'book-outline',             color: '#4ECDC4' },
  { label: 'Travel',       icon: 'airplane-outline',         color: '#0984E3' },
  { label: 'Gaming',       icon: 'game-controller-outline',  color: '#6C5CE7' },
  { label: 'People',       icon: 'people-outline',           color: '#FD79A8' },
  { label: 'Fashion',      icon: 'shirt-outline',            color: '#FDCB6E' },
  { label: 'Health',       icon: 'fitness-outline',          color: '#00B894' },
  { label: 'Tech',         icon: 'laptop-outline',           color: '#45AAF2' },
  { label: 'Nature',       icon: 'leaf-outline',             color: '#6BCB77' },
  { label: 'Arts',         icon: 'color-palette-outline',    color: '#E17055' },
  { label: 'Miscellaneous', icon: 'grid-outline',            color: '#636E72' },
];

export const CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.label, c.color])
);

export const CATEGORY_ICONS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.label, c.icon])
);
