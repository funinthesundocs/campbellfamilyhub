export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(date: string | Date): string {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    return localDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(date);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function formatDateOnly(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatCategoryLabel(category: string): string {
  const categoryMap: Record<string, string> = {
    'appetizers-small-bites': 'Appetizers & Small Bites',
    'soups-stews': 'Soups & Stews',
    'salads': 'Salads',
    'breakfast-brunch': 'Breakfast & Brunch',
    'main-poultry': 'Main Courses - Poultry',
    'main-beef-lamb': 'Main Courses - Beef & Lamb',
    'main-pork': 'Main Courses - Pork',
    'main-seafood': 'Main Courses - Seafood',
    'main-vegetarian': 'Main Courses - Vegetarian',
    'pasta-rice-grains': 'Pasta, Rice & Grains',
    'vegetables-sides': 'Vegetables & Side Dishes',
    'breads-rolls': 'Breads & Rolls',
    'sauces-gravies-condiments': 'Sauces, Gravies & Condiments',
    'dips-spreads': 'Dips & Spreads',
    'stocks-broths': 'Stocks & Broths',
    'desserts-cakes': 'Desserts & Cakes',
    'cookies-bars-pastries': 'Cookies, Bars & Pastries',
    'beverages-cocktails': 'Beverages & Cocktails',
    'preserves-jams-pickles': 'Preserves, Jams & Pickles',
    'other': 'Other',
  };
  return categoryMap[category] || category.replace(/-/g, ' ');
}
