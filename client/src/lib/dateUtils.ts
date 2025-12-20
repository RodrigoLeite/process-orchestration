export function formatDate(date: string | Date | null | undefined, locale: string = "pt-BR"): string {
  if (!date) return "-";
  
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime()) || dateObj.getTime() < 86400000) {
    return "-";
  }
  
  return dateObj.toLocaleDateString(locale);
}

export function formatDateTime(date: string | Date | null | undefined, locale: string = "pt-BR"): string {
  if (!date) return "-";
  
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime()) || dateObj.getTime() < 86400000) {
    return "-";
  }
  
  return dateObj.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit", 
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function isValidDate(date: string | Date | null | undefined): boolean {
  if (!date) return false;
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return !isNaN(dateObj.getTime()) && dateObj.getTime() > 86400000;
}
