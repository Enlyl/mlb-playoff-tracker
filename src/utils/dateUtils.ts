// Date and time formatter with dynamic reference date and countdown helper

export function formatKyivGameTime(gameDateStr: string, referenceDateStr?: string): string {
  if (!gameDateStr) return '';
  const d = new Date(gameDateStr);
  if (isNaN(d.getTime())) return '';

  const refDate = referenceDateStr || new Date().toISOString().slice(0, 10);

  // Time in local / Europe/Kyiv (HH:mm)
  const time = d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const gameDateFormatted = d.toLocaleDateString('en-CA');

  // Tomorrow calculation
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  if (gameDateFormatted === refDate) {
    return `сегодня в ${time}`;
  } else if (gameDateFormatted === tomorrowStr) {
    return `завтра в ${time}`;
  } else {
    const dayMonthYear = d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
    });
    return `${dayMonthYear} в ${time}`;
  }
}

export function getCountdownText(isoDate: string): string {
  if (!isoDate) return '';
  const diff = new Date(isoDate).getTime() - Date.now();
  if (diff <= 0) return 'скоро начнётся';
  const totalMin = Math.floor(diff / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d} дн`);
  if (h > 0) parts.push(`${h} ч`);
  if (d === 0) parts.push(`${m} мин`);
  return `через ${parts.join(' ')}`;
}
