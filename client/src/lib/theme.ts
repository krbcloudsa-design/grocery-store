import type { CategoryId } from '@shared/types.ts';

/** Per-aisle tile colours, so the grid reads like a market without photography. */
export const CATEGORY_TILE: Record<CategoryId, { from: string; to: string }> = {
  produce: { from: '#f0fdf4', to: '#bbf7d0' },
  bakery: { from: '#fffbeb', to: '#fde68a' },
  'dairy-eggs': { from: '#eff6ff', to: '#bfdbfe' },
  'meat-seafood': { from: '#fff1f2', to: '#fecdd3' },
  pantry: { from: '#fdf4ff', to: '#e9d5ff' },
  beverages: { from: '#ecfeff', to: '#a5f3fc' },
  snacks: { from: '#fff7ed', to: '#fed7aa' },
  frozen: { from: '#f0f9ff', to: '#bae6fd' },
  household: { from: '#f8fafc', to: '#e2e8f0' },
};

export function tileStyle(category: CategoryId) {
  const tile = CATEGORY_TILE[category] ?? CATEGORY_TILE.pantry;
  return { '--tile-from': tile.from, '--tile-to': tile.to } as React.CSSProperties;
}
