export function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)} млн. ₽`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)} тыс. ₽`;
  }
  return `${amount.toLocaleString("ru-RU")} ₽`;
}

export function formatFullCurrency(amount: number): string {
  return `${amount.toLocaleString("ru-RU")} ₽`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("ru-RU");
}

export function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 0) {
    const days = Math.abs(Math.floor(seconds / 86400));
    if (days === 0) return "сегодня";
    if (days === 1) return "завтра";
    if (days < 7) return `через ${days} дн.`;
    if (days < 30) return `через ${Math.floor(days / 7)} нед.`;
    return `через ${Math.floor(days / 30)} мес.`;
  }

  if (seconds < 60) return "только что";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн назад`;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function formatPercentage(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

export function calculateProfit(revenue: number): number {
  const afterFee = revenue * 0.94;
  return Math.round(afterFee * 0.87);
}

export function formatMonthYear(date: Date): string {
  const monthNames = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
  ];
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}
