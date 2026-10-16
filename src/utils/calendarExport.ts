import { MLBGame } from '../services/mlbApi';

// Helper to format date for .ics (YYYYMMDDTHHmmssZ)
function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function generateGameIcs(game: MLBGame): string {
  const startDate = new Date(game.gameDate);
  // Default MLB game duration: ~3 hours
  const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);

  const title = `⚾ MLB: ${game.teams.away.team.name} @ ${game.teams.home.team.name}`;
  const location = game.venue?.name || 'MLB Ballpark';
  const description = `${game.seriesDescription || 'Матч MLB'}\\nСтадион: ${location}\\nПитчеры: ${game.teams.away.probablePitcher?.fullName || 'TBD'} vs ${game.teams.home.probablePitcher?.fullName || 'TBD'}`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MLB Playoff Tracker//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:mlb-game-${game.gamePk}@mlbtracker.app`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(startDate)}`,
    `DTEND:${formatIcsDate(endDate)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadGameIcs(game: MLBGame): void {
  const icsContent = generateGameIcs(game);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `mlb_${game.teams.away.team.abbreviation}_vs_${game.teams.home.team.abbreviation}_${game.gamePk}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getGoogleCalendarUrl(game: MLBGame): string {
  const startDate = new Date(game.gameDate);
  const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);

  const startIso = formatIcsDate(startDate);
  const endIso = formatIcsDate(endDate);

  const text = encodeURIComponent(`⚾ MLB: ${game.teams.away.team.name} vs ${game.teams.home.team.name}`);
  const details = encodeURIComponent(
    `${game.seriesDescription || 'Матч MLB'}\nСтадион: ${game.venue?.name || 'MLB Ballpark'}\nСтартовые питчеры: ${game.teams.away.probablePitcher?.fullName || 'TBD'} vs ${game.teams.home.probablePitcher?.fullName || 'TBD'}`
  );
  const location = encodeURIComponent(game.venue?.name || 'MLB Ballpark');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
}

export function generateTeamScheduleIcs(teamId: number, teamName: string, games: MLBGame[]): string {
  const teamGames = games.filter(
    (g) => g.teams.away.team.id === teamId || g.teams.home.team.id === teamId
  );
  if (!teamGames.length) return '';

  const nowStr = formatIcsDate(new Date());
  const events = teamGames.map((g) => {
    const start = new Date(g.gameDate);
    const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
    const isHome = g.teams.home.team.id === teamId;
    const opp = isHome ? g.teams.away.team.name : `@ ${g.teams.home.team.name}`;
    const title = `⚾ MLB: ${teamName} ${opp}`;
    const loc = g.venue?.name || 'MLB Ballpark';
    return [
      'BEGIN:VEVENT',
      `UID:mlb-team-${teamId}-game-${g.gamePk}@mlbtracker.app`,
      `DTSTAMP:${nowStr}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${g.seriesDescription || 'Матч MLB'}\\nСтадион: ${loc}`,
      `LOCATION:${loc}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Матч начинается через 30 минут',
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MLB Playoff Tracker//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Расписание ${teamName} MLB`,
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

export async function downloadTeamScheduleIcs(teamId: number, teamName: string, games?: MLBGame[]): Promise<boolean> {
  let list = Array.isArray(games) ? games : [];

  // If no games provided or empty, attempt to fetch schedule on the fly
  if (!list.length) {
    try {
      const res = await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&season=2026&teamId=${teamId}&hydrate=team,linescore`);
      if (res.ok) {
        const data = await res.json();
        const fetched: MLBGame[] = [];
        (data.dates || []).forEach((d: any) => {
          if (d.games) fetched.push(...d.games);
        });
        if (fetched.length) list = fetched;
      }
    } catch (e) {
      console.warn('Could not fetch schedule for export, using fallback:', e);
    }
  }

  let ics = generateTeamScheduleIcs(teamId, teamName, list);

  // If still empty (e.g. no schedule available), create a season calendar entry
  if (!ics) {
    const nowStr = formatIcsDate(new Date());
    const seasonStart = formatIcsDate(new Date('2026-03-26T17:00:00Z'));
    const seasonEnd = formatIcsDate(new Date('2026-03-26T20:00:00Z'));
    ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MLB Playoff Tracker//RU',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:MLB 2026 - ${teamName}`,
      'BEGIN:VEVENT',
      `UID:mlb-season-2026-${teamId}@mlbtracker.app`,
      `DTSTAMP:${nowStr}`,
      `DTSTART:${seasonStart}`,
      `DTEND:${seasonEnd}`,
      `SUMMARY:⚾ Открытие сезона MLB 2026: ${teamName}`,
      `DESCRIPTION:Старт регулярного сезона MLB 2026 для команды ${teamName}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  }

  try {
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${teamName.replace(/\s+/g, '_')}_schedule_2026.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Failed to trigger download:', err);
    return false;
  }
}

