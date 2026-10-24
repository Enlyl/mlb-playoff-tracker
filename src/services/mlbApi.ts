// MLB Stats API service

export interface PitcherStats {
  era?: string;
  wins?: number;
  losses?: number;
  k9?: string;
  whip?: string;
  inningsPitched?: string;
  strikeouts?: number;
}

export interface ProbablePitcher {
  id: number;
  fullName: string;
  link?: string;
  stats?: PitcherStats;
}

export interface MLBTeam {
  id: number;
  name: string;
  teamName: string;
  abbreviation: string;
  league?: { id: number; name: string };
  division?: { id: number; name: string };
  color?: string;
  accentColor?: string;
}

export interface InningScore {
  num: number;
  ordinalNum: string;
  home?: { runs?: number; hits?: number; errors?: number };
  away?: { runs?: number; hits?: number; errors?: number };
}

export interface LineScore {
  currentInning?: number;
  currentInningOrdinal?: string;
  inningState?: string; // 'Top', 'Bottom', 'Middle', 'End'
  inningHalf?: string;
  isTopInning?: boolean;
  balls?: number;
  strikes?: number;
  outs?: number;
  innings?: InningScore[];
  teams?: {
    home?: { runs?: number; hits?: number; errors?: number };
    away?: { runs?: number; hits?: number; errors?: number };
  };
  offense?: {
    first?: { id: number; fullName: string };
    second?: { id: number; fullName: string };
    third?: { id: number; fullName: string };
    batter?: { id: number; fullName: string };
    pitcher?: { id: number; fullName: string };
  };
}

export interface GameTeam {
  team: MLBTeam;
  score?: number;
  isWinner?: boolean;
  probablePitcher?: ProbablePitcher;
  leagueRecord?: { wins: number; losses: number; pct?: string };
}

export interface SeriesStatus {
  gameNumber?: number;
  totalGames?: number;
  isTied?: boolean;
  isOver?: boolean;
  wins?: number;
  losses?: number;
  result?: string;
  shortDescription?: string;
  description?: string;
}

export interface MLBGame {
  gamePk: number;
  gameDate: string;
  status: {
    abstractGameState: string; // 'Live', 'Final', 'Preview'
    detailedState: string; // 'In Progress', 'Final', 'Scheduled'
    statusCode: string;
    isOver?: boolean;
  };
  teams: {
    away: GameTeam;
    home: GameTeam;
  };
  linescore?: LineScore;
  venue?: { name: string };
  description?: string;
  seriesDescription?: string;
  gamesInSeries?: number;
  seriesGameNumber?: number;
  seriesStatus?: SeriesStatus;
  recap?: {
    headline?: string;
    blurb?: string;
  };
}

export interface PlayEvent {
  details?: {
    description?: string;
    event?: string;
    eventType?: string;
    isStrike?: boolean;
    isBall?: boolean;
    isInPlay?: boolean;
    isScoringPlay?: boolean;
    call?: { description: string };
  };
  pitchData?: {
    startSpeed?: number;
    endSpeed?: number;
    zone?: number;
    type?: { code: string; description: string };
  };
}

export interface PlayItem {
  result: {
    type: string;
    event?: string;
    eventType?: string;
    description: string;
    rbi?: number;
    awayScore?: number;
    homeScore?: number;
    isOut?: boolean;
  };
  about: {
    atBatIndex: number;
    halfInning: string;
    isTopInning: boolean;
    inning: number;
    isScoringPlay?: boolean;
    isComplete?: boolean;
  };
  count?: {
    balls: number;
    strikes: number;
    outs: number;
  };
  matchup?: {
    batter?: { id: number; fullName: string };
    pitcher?: { id: number; fullName: string };
  };
  playEvents?: PlayEvent[];
}

export interface WinProbabilityItem {
  atBatIndex: number;
  homeTeamWinProbability: number;
  awayTeamWinProbability: number;
  homeTeamWinProbabilityAdded?: number;
  result?: {
    description: string;
    event: string;
    homeScore: number;
    awayScore: number;
    rbi?: number;
  };
  about?: {
    inning: number;
    halfInning: string;
  };
}

export interface BoxscorePlayer {
  person: { id: number; fullName: string };
  position: { abbreviation: string; name: string };
  battingOrder?: string;
  stats?: {
    batting?: {
      summary?: string;
      avg?: string;
      homeRuns?: number;
      rbi?: number;
      hits?: number;
      atBats?: number;
    };
    pitching?: {
      summary?: string;
      era?: string;
      inningsPitched?: string;
      strikeOuts?: number;
      runs?: number;
    };
  };
  seasonStats?: {
    batting?: { avg?: string; homeRuns?: number; rbi?: number; ops?: string };
    pitching?: { era?: string; wins?: number; losses?: number; whip?: string };
  };
}

export interface LiveGameFeed {
  gamePk: number;
  gameData: {
    teams: { away: MLBTeam; home: MLBTeam };
    probablePitchers?: { away?: ProbablePitcher; home?: ProbablePitcher };
    venue?: { name: string };
    status: { abstractGameState: string; detailedState: string };
  };
  liveData: {
    plays: {
      allPlays: PlayItem[];
      currentPlay?: PlayItem;
    };
    linescore: LineScore;
    boxscore: {
      teams: {
        away: { players: Record<string, BoxscorePlayer>; team: MLBTeam };
        home: { players: Record<string, BoxscorePlayer>; team: MLBTeam };
      };
    };
  };
}

export interface StandingsSplitRecord {
  wins: number;
  losses: number;
  type: string;
  pct: string;
}

export interface StandingsTeamRecord {
  team: MLBTeam & { venue?: { id: number; name: string } };
  season: string;
  wins: number;
  losses: number;
  winningPercentage: string;
  gamesBack: string;
  wildCardGamesBack?: string;
  wildCardRank?: string;
  divisionRank: string;
  leagueRank?: string;
  sportRank?: string;
  magicNumber?: string;
  eliminationNumber?: string;
  streak?: { streakCode: string };
  runDifferential?: number;
  runsScored?: number;
  runsAllowed?: number;
  splitRecords?: StandingsSplitRecord[];
}

export interface DivisionStandings {
  id: number;
  name: string;
  league: { id: number; name: string };
  teamRecords: StandingsTeamRecord[];
}

export interface WildCardStandings {
  league: { id: number; name: string };
  teamRecords: StandingsTeamRecord[];
}

export interface PostseasonSeries {
  series: { id: string; gameType: string; sortNumber: number };
  seriesDescription: string;
  games: MLBGame[];
  totalGames: number;
  summary?: string;
}

const BASE_URL = 'https://statsapi.mlb.com/api';

export const MLB_TEAMS = [
  { id: 119, name: 'Los Angeles Dodgers', teamName: 'Dodgers', abbr: 'LAD', division: 'NL West', color: '#005A9C', accentColor: '#1d4ed8' },
  { id: 147, name: 'New York Yankees', teamName: 'Yankees', abbr: 'NYY', division: 'AL East', color: '#0C2340', accentColor: '#38bdf8' },
  { id: 111, name: 'Boston Red Sox', teamName: 'Red Sox', abbr: 'BOS', division: 'AL East', color: '#BD3039', accentColor: '#ef4444' },
  { id: 110, name: 'Baltimore Orioles', teamName: 'Orioles', abbr: 'BAL', division: 'AL East', color: '#DF4601', accentColor: '#f97316' },
  { id: 139, name: 'Tampa Bay Rays', teamName: 'Rays', abbr: 'TB', division: 'AL East', color: '#092C5C', accentColor: '#0ea5e9' },
  { id: 141, name: 'Toronto Blue Jays', teamName: 'Blue Jays', abbr: 'TOR', division: 'AL East', color: '#134A8E', accentColor: '#3b82f6' },
  { id: 114, name: 'Cleveland Guardians', teamName: 'Guardians', abbr: 'CLE', division: 'AL Central', color: '#002B5C', accentColor: '#e11d48' },
  { id: 118, name: 'Kansas City Royals', teamName: 'Royals', abbr: 'KC', division: 'AL Central', color: '#004687', accentColor: '#60a5fa' },
  { id: 116, name: 'Detroit Tigers', teamName: 'Tigers', abbr: 'DET', division: 'AL Central', color: '#0C2340', accentColor: '#ea580c' },
  { id: 142, name: 'Minnesota Twins', teamName: 'Twins', abbr: 'MIN', division: 'AL Central', color: '#002B5C', accentColor: '#dc2626' },
  { id: 145, name: 'Chicago White Sox', teamName: 'White Sox', abbr: 'CWS', division: 'AL Central', color: '#27251F', accentColor: '#94a3b8' },
  { id: 117, name: 'Houston Astros', teamName: 'Astros', abbr: 'HOU', division: 'AL West', color: '#002D62', accentColor: '#f97316' },
  { id: 136, name: 'Seattle Mariners', teamName: 'Mariners', abbr: 'SEA', division: 'AL West', color: '#0C2C56', accentColor: '#10b981' },
  { id: 140, name: 'Texas Rangers', teamName: 'Rangers', abbr: 'TEX', division: 'AL West', color: '#003278', accentColor: '#ef4444' },
  { id: 133, name: 'Oakland Athletics', teamName: 'Athletics', abbr: 'OAK', division: 'AL West', color: '#003831', accentColor: '#22c55e' },
  { id: 108, name: 'Los Angeles Angels', teamName: 'Angels', abbr: 'LAA', division: 'AL West', color: '#BA0021', accentColor: '#f43f5e' },
  { id: 143, name: 'Philadelphia Phillies', teamName: 'Phillies', abbr: 'PHI', division: 'NL East', color: '#E81828', accentColor: '#ef4444' },
  { id: 144, name: 'Atlanta Braves', teamName: 'Braves', abbr: 'ATL', division: 'NL East', color: '#CE1141', accentColor: '#f43f5e' },
  { id: 121, name: 'New York Mets', teamName: 'Mets', abbr: 'NYM', division: 'NL East', color: '#002D72', accentColor: '#ea580c' },
  { id: 120, name: 'Washington Nationals', teamName: 'Nationals', abbr: 'WSH', division: 'NL East', color: '#AB0003', accentColor: '#dc2626' },
  { id: 146, name: 'Miami Marlins', teamName: 'Marlins', abbr: 'MIA', division: 'NL East', color: '#00A3E0', accentColor: '#06b6d4' },
  { id: 158, name: 'Milwaukee Brewers', teamName: 'Brewers', abbr: 'MIL', division: 'NL Central', color: '#12284C', accentColor: '#facc15' },
  { id: 112, name: 'Chicago Cubs', teamName: 'Cubs', abbr: 'CHC', division: 'NL Central', color: '#0E3386', accentColor: '#ef4444' },
  { id: 138, name: 'St. Louis Cardinals', teamName: 'Cardinals', abbr: 'STL', division: 'NL Central', color: '#C41E3A', accentColor: '#dc2626' },
  { id: 113, name: 'Cincinnati Reds', teamName: 'Reds', abbr: 'CIN', division: 'NL Central', color: '#C6011F', accentColor: '#e11d48' },
  { id: 134, name: 'Pittsburgh Pirates', teamName: 'Pirates', abbr: 'PIT', division: 'NL Central', color: '#FDB827', accentColor: '#eab308' },
  { id: 135, name: 'San Diego Padres', teamName: 'Padres', abbr: 'SD', division: 'NL West', color: '#2F241D', accentColor: '#eab308' },
  { id: 109, name: 'Arizona Diamondbacks', teamName: 'D-backs', abbr: 'ARI', division: 'NL West', color: '#A71930', accentColor: '#f43f5e' },
  { id: 137, name: 'San Francisco Giants', teamName: 'Giants', abbr: 'SF', division: 'NL West', color: '#FD5A1E', accentColor: '#f97316' },
  { id: 115, name: 'Colorado Rockies', teamName: 'Rockies', abbr: 'COL', division: 'NL West', color: '#33006F', accentColor: '#a855f7' },
];

export function getTeamLogoUrl(teamId: number): string {
  return `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
}

export function getPlayerPhotoUrl(playerId: number): string {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${playerId}/headshot/67/current`;
}

// Memory cache for pitcher stats
const pitcherStatsCache = new Map<number, PitcherStats>();

export async function getPitcherStats(personId: number): Promise<PitcherStats | null> {
  if (pitcherStatsCache.has(personId)) {
    return pitcherStatsCache.get(personId)!;
  }
  try {
    const url = `${BASE_URL}/v1/people/${personId}?hydrate=stats(group=[pitching],type=[season])`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const stat = data.people?.[0]?.stats?.[0]?.splits?.[0]?.stat;
    if (stat) {
      const statsObj: PitcherStats = {
        era: stat.era,
        wins: stat.wins,
        losses: stat.losses,
        k9: stat.strikeoutsPer9Inn,
        whip: stat.whip,
        inningsPitched: stat.inningsPitched,
        strikeouts: stat.strikeOuts,
      };
      pitcherStatsCache.set(personId, statsObj);
      return statsObj;
    }
  } catch {
    // ignore
  }
  return null;
}

// Fetch games for a date with probable pitcher stats & seriesStatus
export async function getSchedule(dateStr: string): Promise<MLBGame[]> {
  try {
    const url = `${BASE_URL}/v1/schedule?sportId=1&date=${dateStr}&hydrate=team,linescore,game(content(summary,media(epg))),decisions,scoringplays,probablePitcher,seriesStatus(useOverride=true)`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    const games: MLBGame[] = data.dates?.[0]?.games || [];

    // Hydrate pitcher stats for the games in parallel (up to 15 games)
    await Promise.all(
      games.map(async (game) => {
        const awayPitcherId = game.teams.away.probablePitcher?.id;
        const homePitcherId = game.teams.home.probablePitcher?.id;

        const [awayStats, homeStats] = await Promise.all([
          awayPitcherId ? getPitcherStats(awayPitcherId) : Promise.resolve(null),
          homePitcherId ? getPitcherStats(homePitcherId) : Promise.resolve(null),
        ]);

        if (awayStats && game.teams.away.probablePitcher) {
          game.teams.away.probablePitcher.stats = awayStats;
        }
        if (homeStats && game.teams.home.probablePitcher) {
          game.teams.home.probablePitcher.stats = homeStats;
        }

        // Also fetch short recaps for final games if available
        if (game.status?.abstractGameState === 'Final') {
          try {
            const contentUrl = `${BASE_URL}/v1/game/${game.gamePk}/content`;
            const cRes = await fetch(contentUrl);
            if (cRes.ok) {
              const cData = await cRes.json();
              const mlbRecap = cData.editorial?.recap?.mlb;
              if (mlbRecap) {
                game.recap = {
                  headline: mlbRecap.headline,
                  blurb: mlbRecap.blurb,
                };
              }
            }
          } catch {
            // ignore
          }
        }
      })
    );

    return games;
  } catch (err) {
    console.error('Failed to fetch schedule:', err);
    return [];
  }
}

/**
 * Fetch all past games of the 2026 season (from season start up to yesterday), newest first.
 * Uses pagination — returns up to 500 most recent games.
 */
export async function getSeasonPastGames(season = 2026, limit = 500): Promise<MLBGame[]> {
  try {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const isoEnd = yesterday.toISOString().slice(0, 10);
    const isoStart = `${season}-03-01`;

    const url = `${BASE_URL}/v1/schedule?sportId=1&season=${season}&gameType=R,F,D,L,W&startDate=${isoStart}&endDate=${isoEnd}&hydrate=team,linescore,seriesStatus(useOverride=true)`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    const allGames: MLBGame[] = (data.dates || []).flatMap((d: any) => d.games || []);
    // Sort newest first
    allGames.sort((a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime());
    return allGames.slice(0, limit);
  } catch (err) {
    console.error('Failed to fetch past season games:', err);
    return [];
  }
}

/**
 * Fetch upcoming games within next 48 hours (2 days) — for homepage widget
 */
export async function getUpcoming48HoursGames(): Promise<MLBGame[]> {
  try {
    const now = new Date();
    const in2days = new Date(now.getTime() + 52 * 60 * 60 * 1000); // 52h to cover full day+2
    const isoStart = now.toISOString().slice(0, 10);
    const isoEnd = in2days.toISOString().slice(0, 10);

    const url = `${BASE_URL}/v1/schedule?sportId=1&season=2026&gameType=R,F,D,L,W&startDate=${isoStart}&endDate=${isoEnd}&hydrate=team,linescore,probablePitcher,seriesStatus(useOverride=true)`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const allGames: MLBGame[] = (data.dates || []).flatMap((d: any) => d.games || []);
    return allGames.filter((g) => {
      const gTime = new Date(g.gameDate).getTime();
      return g.status?.abstractGameState !== 'Final' && gTime >= now.getTime() - 2 * 3600 * 1000;
    });
  } catch {
    return [];
  }
}

/**
 * Fetch games in the next 48 hours (2 days) + any currently active Live game
 */
export async function getUpcoming24HoursGames(): Promise<{ liveGame: MLBGame | null; next24HoursGames: MLBGame[] }> {
  try {
    const now = new Date();
    const in48h = new Date(now.getTime() + 52 * 60 * 60 * 1000); // 52h to cover full day+2
    const yesterday = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const isoStart = yesterday.toISOString().slice(0, 10);
    const isoEnd = in48h.toISOString().slice(0, 10);

    const url = `${BASE_URL}/v1/schedule?sportId=1&season=2026&gameType=R,F,D,L,W&startDate=${isoStart}&endDate=${isoEnd}&hydrate=team,linescore,probablePitcher,broadcasts,seriesStatus(useOverride=true)`;
    const res = await fetch(url);
    if (!res.ok) return { liveGame: null, next24HoursGames: [] };
    const data = await res.json();
    const allGames: MLBGame[] = (data.dates || []).flatMap((d: any) => d.games || []);

    const live = allGames.find((g) => g.status?.abstractGameState === 'Live') || null;
    const nowMs = now.getTime();
    const end48h = nowMs + 48 * 60 * 60 * 1000;

    const upcoming = allGames
      .filter((g) => {
        const gTime = new Date(g.gameDate).getTime();
        return (
          g.status?.abstractGameState !== 'Final' &&
          (g.status?.abstractGameState === 'Live' || (gTime >= nowMs - 2 * 60 * 60 * 1000 && gTime <= end48h + 4 * 60 * 60 * 1000))
        );
      })
      .sort((a, b) => new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime());

    return { liveGame: live, next24HoursGames: upcoming };
  } catch (err) {
    console.error('Error fetching next 48h games:', err);
    return { liveGame: null, next24HoursGames: [] };
  }
}

// Fetch full live game feed (pitch-by-pitch, boxscore, linescore)
export async function getLiveGameFeed(gamePk: number | string): Promise<LiveGameFeed | null> {
  try {
    const url = `${BASE_URL}/v1.1/game/${gamePk}/feed/live`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch live feed:', err);
    return null;
  }
}

// Fetch win probability progression for game
export async function getGameWinProbability(gamePk: number | string): Promise<WinProbabilityItem[]> {
  try {
    const url = `${BASE_URL}/v1/game/${gamePk}/winProbability`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data)) return data;
    return [];
  } catch (err) {
    console.error('Failed to fetch win probability:', err);
    return [];
  }
}

// Fetch divisional standings (defaults to 2026)
export async function getStandings(season = 2026): Promise<DivisionStandings[]> {
  try {
    const url = `${BASE_URL}/v1/standings?leagueId=103,104&season=${season}&standingsTypes=regularSeason&hydrate=division,team(venue)`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return (data.records || []).map((rec: any) => ({
      id: rec.division?.id,
      name: rec.division?.name || 'Дивизион',
      league: rec.league || { id: 0, name: '' },
      teamRecords: (rec.teamRecords || []).map((tr: any) => ({
        ...tr,
        splitRecords: tr.records?.splitRecords || [],
      })),
    }));
  } catch (err) {
    console.error('Failed to fetch standings:', err);
    return [];
  }
}

// Fetch Wild Card Race standings (defaults to 2026)
export async function getWildCardStandings(season = 2026): Promise<WildCardStandings[]> {
  try {
    const url = `${BASE_URL}/v1/standings?leagueId=103,104&season=${season}&standingsTypes=wildCard`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return (data.records || []).map((rec: any) => ({
      league: rec.league || { id: 0, name: rec.league?.id === 103 ? 'American League' : 'National League' },
      teamRecords: rec.teamRecords || [],
    }));
  } catch (err) {
    console.error('Failed to fetch wild card standings:', err);
    return [];
  }
}

// Fetch postseason series (defaults to 2026)
export async function getPostseasonSeries(season = 2026): Promise<PostseasonSeries[]> {
  try {
    const url = `${BASE_URL}/v1/schedule/postseason/series?season=${season}&sportId=1&hydrate=team,linescore`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return (data.series || []).map((s: any) => {
      const firstGame = s.games?.[0];
      return {
        series: s.series,
        seriesDescription: firstGame?.seriesDescription || 'Серия плей-офф',
        games: s.games || [],
        totalGames: s.totalGames || s.games?.length || 0,
        summary: s.summary,
      };
    });
  } catch (err) {
    console.error('Failed to fetch postseason series:', err);
    return [];
  }
}

// Fetch Head to Head matches (defaults to 2026)
export async function getHeadToHead(team1Id: number, team2Id: number, season = 2026): Promise<MLBGame[]> {
  try {
    const url = `${BASE_URL}/v1/schedule?sportId=1&season=${season}&teamId=${team1Id}&opponentId=${team2Id}&hydrate=team,linescore`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    const games: MLBGame[] = [];
    (data.dates || []).forEach((d: any) => {
      if (d.games) games.push(...d.games);
    });
    return games;
  } catch (err) {
    console.error('Failed to fetch H2H:', err);
    return [];
  }
}

// ── RANKINGS API ─────────────────────────────────────────────────────────────

export interface TeamSeasonRecord {
  teamId: number;
  teamName: string;
  teamAbbr: string;
  season: number;
  wins: number;
  losses: number;
  pct: number;
  era: number | null;
  runsScored: number | null;
  runsAllowed: number | null;
  hr: number | null;
  sb: number | null;
  divisionRank: number;
  league: string;
  divisionName?: string;
}

export interface PlayerStatLeader {
  rank: number;
  playerId: number;
  playerName: string;
  teamId: number;
  teamName: string;
  season: number;
  league?: string;
  // batting
  avg?: number;
  hr?: number;
  rbi?: number;
  ops?: number;
  sb?: number;
  hits?: number;
  // pitching
  era?: number;
  wins?: number;
  strikeouts?: number;
  whip?: number;
  saves?: number;
  inningsPitched?: number;
  type: 'batting' | 'pitching';
}

// Fetch team season records for given season (from standings)
export async function getTeamSeasonRecords(season: number): Promise<TeamSeasonRecord[]> {
  try {
    const url = `${BASE_URL}/v1/standings?leagueId=103,104&season=${season}&standingsTypes=regularSeason&hydrate=division,team`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    const records: TeamSeasonRecord[] = [];
    (data.records || []).forEach((div: any) => {
      const leagueName =
        div.league?.id === 103
          ? 'American League'
          : div.league?.id === 104
          ? 'National League'
          : div.division?.name?.includes('American')
          ? 'American League'
          : 'National League';
      const divName = div.division?.name || '';
      (div.teamRecords || []).forEach((tr: any) => {
        records.push({
          teamId: tr.team?.id,
          teamName: tr.team?.name || '',
          teamAbbr: tr.team?.abbreviation || '',
          season,
          wins: tr.wins || 0,
          losses: tr.losses || 0,
          pct: Number(tr.winningPercentage) || 0,
          era: null,
          runsScored: tr.runsScored || null,
          runsAllowed: tr.runsAllowed || null,
          hr: null,
          sb: null,
          divisionRank: Number(tr.divisionRank) || 0,
          league: leagueName,
          divisionName: divName,
        });
      });
    });
    return records;
  } catch (err) {
    console.error('Failed to fetch team season records:', err);
    return [];
  }
}

// Fetch batting stat leaders for a season
export async function getBattingLeaders(season: number, limit = 30): Promise<PlayerStatLeader[]> {
  try {
    const stats = 'avg,homeRuns,rbi,ops,stolenBases,hits';
    const url = `${BASE_URL}/v1/stats/leaders?leaderCategories=${stats}&season=${season}&sportId=1&limit=${limit}&statGroup=hitting&hydrate=person,team`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    // MLB API returns leaderCategories array; merge them into per-player map
    const playerMap = new Map<number, PlayerStatLeader>();
    (data.leagueLeaders || []).forEach((cat: any) => {
      (cat.leaders || []).forEach((l: any, idx: number) => {
        const pid = l.person?.id;
        if (!pid) return;
        if (!playerMap.has(pid)) {
          const teamId = l.team?.id || 0;
          const matchedTeam = MLB_TEAMS.find((t) => t.id === teamId);
          const leagueStr =
            l.team?.league?.id === 103
              ? 'AL'
              : l.team?.league?.id === 104
              ? 'NL'
              : matchedTeam?.division?.slice(0, 2) ||
                (l.team?.league?.name?.includes('American') ? 'AL' : 'NL');
          playerMap.set(pid, {
            rank: idx + 1,
            playerId: pid,
            playerName: l.person?.fullName || '',
            teamId,
            teamName: l.team?.name || '',
            season,
            type: 'batting',
            league: leagueStr,
          });
        }
        const p = playerMap.get(pid)!;
        const cat_name: string = cat.leaderCategory || '';
        const val = Number(l.value);
        if (cat_name === 'battingAverage' || cat_name === 'avg') p.avg = val;
        else if (cat_name === 'homeRuns' || cat_name === 'hr') p.hr = val;
        else if (cat_name === 'runsBattedIn' || cat_name === 'rbi') p.rbi = val;
        else if (cat_name === 'onBasePlusSlugging' || cat_name === 'ops') p.ops = val;
        else if (cat_name === 'stolenBases' || cat_name === 'sb') p.sb = val;
        else if (cat_name === 'hits') p.hits = val;
      });
    });
    return Array.from(playerMap.values()).sort((a, b) => (b.hr || 0) - (a.hr || 0));
  } catch (err) {
    console.error('Failed to fetch batting leaders:', err);
    return [];
  }
}

// Fetch pitching stat leaders for a season
export async function getPitchingLeaders(season: number, limit = 30): Promise<PlayerStatLeader[]> {
  try {
    const stats = 'era,wins,strikeouts,whip,saves';
    const url = `${BASE_URL}/v1/stats/leaders?leaderCategories=${stats}&season=${season}&sportId=1&limit=${limit}&statGroup=pitching&hydrate=person,team`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    const playerMap = new Map<number, PlayerStatLeader>();
    (data.leagueLeaders || []).forEach((cat: any) => {
      (cat.leaders || []).forEach((l: any, idx: number) => {
        const pid = l.person?.id;
        if (!pid) return;
        if (!playerMap.has(pid)) {
          const teamId = l.team?.id || 0;
          const matchedTeam = MLB_TEAMS.find((t) => t.id === teamId);
          const leagueStr =
            l.team?.league?.id === 103
              ? 'AL'
              : l.team?.league?.id === 104
              ? 'NL'
              : matchedTeam?.division?.slice(0, 2) ||
                (l.team?.league?.name?.includes('American') ? 'AL' : 'NL');
          playerMap.set(pid, {
            rank: idx + 1,
            playerId: pid,
            playerName: l.person?.fullName || '',
            teamId,
            teamName: l.team?.name || '',
            season,
            type: 'pitching',
            league: leagueStr,
          });
        }
        const p = playerMap.get(pid)!;
        const cat_name: string = cat.leaderCategory || '';
        const val = Number(l.value);
        if (cat_name === 'earnedRunAverage' || cat_name === 'era') p.era = val;
        else if (cat_name === 'wins') p.wins = val;
        else if (cat_name === 'strikeouts') p.strikeouts = val;
        else if (cat_name === 'walksAndHitsPerInningPitched' || cat_name === 'whip') p.whip = val;
        else if (cat_name === 'saves') p.saves = val;
      });
    });
    return Array.from(playerMap.values()).sort((a, b) => (a.era ?? 99) - (b.era ?? 99));
  } catch (err) {
    console.error('Failed to fetch pitching leaders:', err);
    return [];
  }
}

// ── HIGHLIGHTS, PLAYER & VENUE DETAILS, ROSTERS ──────────────────────────────

export interface HighlightItem {
  id?: string;
  headline?: string;
  title?: string;
  blurb?: string;
  description?: string;
  duration?: string;
  slug?: string;
  image?: {
    cuts?: Array<{ aspectRatio?: string; width?: number; height?: number; src?: string }>;
  };
  playbacks?: Array<{ name?: string; url?: string }>;
}

export async function getGameHighlights(gamePk: number | string): Promise<HighlightItem[]> {
  try {
    const url = `${BASE_URL}/v1/game/${gamePk}/content`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const a: HighlightItem[] = data.highlights?.highlights?.items || [];
    if (a.length) return a;
    const b: HighlightItem[] = [];
    (data.media?.epgAlternate || []).forEach((g: any) =>
      (g.items || []).forEach((it: any) => {
        if (it.type === 'video' || it.playbacks) b.push(it);
      })
    );
    if (b.length) return b;
    return (data.highlights?.gameCenter?.items || []).concat(data.highlights?.scoreboard?.items || []);
  } catch (err) {
    console.error('Failed to fetch game highlights:', err);
    return [];
  }
}

export interface PlayerYearByYearSplit {
  season: string;
  team?: { id: number; name: string };
  stat: Record<string, any>;
  league?: { id: number; name: string };
}

export interface PlayerGameLogItem {
  season: string;
  date: string;
  isHome: boolean;
  isWin: boolean;
  opponent: { id: number; name: string };
  game: { gamePk: number };
  stat: Record<string, any>;
}

export interface PlayerDetails {
  person: {
    id: number;
    fullName: string;
    primaryNumber?: string;
    currentAge?: number;
    birthDate?: string;
    birthCity?: string;
    birthStateProvince?: string;
    birthCountry?: string;
    height?: string;
    weight?: number;
    primaryPosition?: { code: string; name: string; abbreviation: string };
    currentTeam?: { id: number; name: string };
    batSide?: { code: string; description: string };
    pitchHand?: { code: string; description: string };
    mlbDebutDate?: string;
  };
  isPitcher: boolean;
  seasonStats: Record<string, any>;
  careerStats: Record<string, any>;
  yearByYearStats: PlayerYearByYearSplit[];
  gameLogs: PlayerGameLogItem[];
  awards: Array<{ name: string; season?: string; date?: string }>;
}

export async function getPlayerDetails(personId: number, season = 2026): Promise<PlayerDetails | null> {
  try {
    const pRes = await fetch(`${BASE_URL}/v1/people/${personId}?hydrate=currentTeam,team,awards`);
    if (!pRes.ok) return null;
    const pData = await pRes.json();
    const person = pData.people?.[0];
    if (!person) return null;
    const isPitcher = person.primaryPosition?.code === '1';
    const group = isPitcher ? 'pitching' : 'hitting';

    const [seasonRes, careerRes, yearByYearRes, gameLogRes, awardsRes] = await Promise.all([
      fetch(`${BASE_URL}/v1/people/${personId}/stats?stats=season&group=${group}&season=${season}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${BASE_URL}/v1/people/${personId}/stats?stats=career&group=${group}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${BASE_URL}/v1/people/${personId}/stats?stats=yearByYear&group=${group}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${BASE_URL}/v1/people/${personId}/stats?stats=gameLog&group=${group}&season=${season}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${BASE_URL}/v1/people/${personId}/awards`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);

    const awardsList = (awardsRes?.awards && awardsRes.awards.length > 0)
      ? awardsRes.awards
      : (person.awards || []);

    return {
      person,
      isPitcher,
      seasonStats: seasonRes?.stats?.[0]?.splits?.[0]?.stat || {},
      careerStats: careerRes?.stats?.[0]?.splits?.[0]?.stat || {},
      yearByYearStats: yearByYearRes?.stats?.[0]?.splits || [],
      gameLogs: gameLogRes?.stats?.[0]?.splits || [],
      awards: awardsList,
    };
  } catch (err) {
    console.error('Failed to fetch player details:', err);
    return null;
  }
}

export interface VenueFieldInfo {
  capacity?: number;
  turfType?: string;
  roofType?: string;
  leftLine?: number;
  leftCenter?: number;
  center?: number;
  rightCenter?: number;
  rightLine?: number;
}

export interface VenueDetails {
  id: number;
  name: string;
  location?: {
    city?: string;
    state?: string;
    stateAbbrev?: string;
    address1?: string;
    elevation?: number;
    phone?: string;
  };
  fieldInfo?: VenueFieldInfo;
}

export async function getVenueDetails(venueId: number): Promise<VenueDetails | null> {
  try {
    const url = `${BASE_URL}/v1/venues/${venueId}?hydrate=location,fieldInfo`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.venues?.[0] || null;
  } catch (err) {
    console.error('Failed to fetch venue details:', err);
    return null;
  }
}

export interface RosterPlayerItem {
  jerseyNumber?: string;
  person: {
    id: number;
    fullName: string;
    link?: string;
  };
  position: {
    code: string;
    name: string;
    type: string;
    abbreviation: string;
  };
  status?: {
    code: string;
    description: string;
  };
}

export async function getTeamRoster(teamId: number): Promise<RosterPlayerItem[]> {
  try {
    const url = `${BASE_URL}/v1/teams/${teamId}/roster?rosterType=active`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.roster || [];
  } catch (err) {
    console.error('Failed to fetch team roster:', err);
    return [];
  }
}

// ── TRANSLATION & REFERENCE DICTIONARIES ──────────────────────────────────────

export const PITCH_NAMES_RU: Record<string, string> = {
  'Four-Seam Fastball': 'Фастбол (4-seam)',
  'Two-Seam Fastball': 'Фастбол (2-seam)',
  'Fastball': 'Фастбол',
  'Sinker': 'Синкер',
  'Cutter': 'Каттер',
  'Slider': 'Слайдер',
  'Sweeper': 'Суипер',
  'Curveball': 'Кервбол',
  'Knuckle Curve': 'Кнукл-кервбол',
  'Slurve': 'Слерв',
  'Changeup': 'Чейнджап',
  'Splitter': 'Сплиттер',
  'Split-Finger': 'Сплиттер',
  'Forkball': 'Форкбол',
  'Knuckleball': 'Кнуклбол',
  'Screwball': 'Скрюбол',
  'Eephus': 'Эфус',
  'Slow Curve': 'Медленный кервбол',
  'Pitch Out': 'Питчаут',
  'Intentional Ball': 'Преднамеренный болл',
};

export const CALL_NAMES_RU: Record<string, string> = {
  'Ball': 'Болл',
  'Ball In Dirt': 'Болл в землю',
  'Called Strike': 'Страйк (без замаха)',
  'Swinging Strike': 'Страйк (промах)',
  'Swinging Strike (Blocked)': 'Страйк (промах)',
  'Foul': 'Фол',
  'Foul Tip': 'Фол-тип',
  'Foul Bunt': 'Фол (бант)',
  'Missed Bunt': 'Промах на банте',
  'Hit By Pitch': 'Попадание мячом',
  'In play, out(s)': 'В игре — аут',
  'In play, no out': 'В игре — без аута',
  'In play, run(s)': 'В игре — очко',
  'Automatic Ball': 'Автоматический болл',
  'Automatic Strike': 'Автоматический страйк',
  'Intent Ball': 'Преднамеренный болл',
  'Pitchout': 'Питчаут',
};

export const ROOF_TYPES_RU: Record<string, string> = {
  OPEN: 'Открытый стадион (без крыши)',
  CLOSED: 'Закрытая крыша',
  RETRACTABLE: 'Раздвижная крыша',
  DOME: 'Купол',
  OUTDOOR: 'Открытый стадион',
};

export const TURF_TYPES_RU: Record<string, string> = {
  Grass: 'Натуральный газон',
  Artificial: 'Искусственное покрытие',
};

export const BEGINNER_NOTES_RU: Record<string, string> = {
  single: 'Сингл: бьющий отбил мяч и успел добежать до 1-й базы.',
  double: 'Дабл: сильный удар — бьющий успел добежать сразу до 2-й базы.',
  triple: 'Трипл: редкий дальний удар — бьющий добежал сразу до 3-й базы.',
  home_run: 'Хоум-ран: мяч улетел за забор. Бьющий спокойно обегает все базы, очки получают он сам и все раннеры на базах.',
  walk: 'Уок: питчер бросил 4 болла (мимо зоны). Бьющий бесплатно занимает 1-ю базу.',
  intent_walk: 'Преднамеренный уок: защита сознательно отправила бьющего на 1-ю базу без борьбы.',
  hit_by_pitch: 'Мяч попал в бьющего — бесплатный переход на 1-ю базу.',
  strikeout: 'Страйкаут: бьющий получил 3 страйка — это аут.',
  strikeout_double_play: 'Страйкаут и дабл-плей: бьющий выбыл на 3 страйках, а защита выбросила бегущего.',
  force_out: 'Форс-аут: бегущий обязан был бежать, а защитник коснулся базы с мячом раньше него.',
  double_play: 'Дабл-плей: защита вывела в аут сразу двоих игроков за один розыгрыш.',
  grounded_into_double_play: 'Дабл-плей: граундбол привел к выводу в аут сразу двоих соперников.',
  triple_play: 'Трипл-плей: три аута за один розыгрыш — чрезвычайно редкое событие.',
  sac_fly: 'Сакрифайс-флай: мяч пойман в воздухе (аут бьющему), но раннер с 3-й базы успел забежать в дом за очком.',
  sac_fly_double_play: 'Сакрифайс-флай с дабл-плеем: мяч пойман, раннер забежал, но другого бегущего поймали в аут.',
  sac_bunt: 'Жертвенный бант: бьющий подставил биту для продвижения раннеров ценой собственного аута.',
  sac_bunt_double_play: 'Жертвенный бант завершился дабл-плеем защиты.',
  fielders_choice: 'Выбор защитника: защита выбросила другого раннера вместо бьющего.',
  fielders_choice_out: 'Выбор защитника: аут другому раннеру на базе.',
  field_error: 'Ошибка защитника (Error): защита не справилась с мячом, бьющий вышел на базу без хита.',
  catcher_interf: 'Помеха кэтчера: задел биту при замахе — свободная 1-я база.',
  wild_pitch: 'Дикая подача: кэтчер не достал плохой бросок питчера, раннеры продвинулись.',
  passed_ball: 'Пропущенный мяч: кэтчер упустил подачу, раннеры продвинулись.',
  balk: 'Балк: питчер нарушил регламент движения — всем раннерам по +1 базе.',
  pitching_substitution: 'Замена питчера: на горку выходит свежий реливер.',
  offensive_substitution: 'Замена в атаке: выходит пинч-хиттер или пинч-раннер.',
  defensive_substitution: 'Замена в защите: перестановка полевых игроков.',
  mound_visit: 'Визит на горку: тренер или кэтчер обсуждает тактику с питчером.',
};

export interface TeamCoachItem {
  person: {
    id: number;
    fullName: string;
  };
  jerseyNumber?: string;
  job?: string;
  jobId?: string;
  title?: string;
}

export interface TeamLeaderItem {
  leaderCategory: string;
  season: string;
  gameType?: string;
  leaders?: Array<{
    rank: number;
    value: string;
    person: {
      id: number;
      fullName: string;
    };
    team?: {
      id: number;
      name: string;
    };
  }>;
}

export interface TeamSeasonStatsSummary {
  hitting?: {
    avg?: string;
    ops?: string;
    homeRuns?: number;
    runs?: number;
    stolenBases?: number;
    hits?: number;
    atBats?: number;
  };
  pitching?: {
    era?: string;
    whip?: string;
    strikeOuts?: number;
    saves?: number;
    wins?: number;
    losses?: number;
  };
}

/**
 * Fetch team coaches roster
 */
export async function getTeamCoaches(teamId: number): Promise<TeamCoachItem[]> {
  try {
    const res = await fetch(`${BASE_URL}/v1/teams/${teamId}/coaches`);
    if (!res.ok) return [];
    const data = await res.json();
    return data?.roster || [];
  } catch (err) {
    console.error(`Error loading coaches for team ${teamId}:`, err);
    return [];
  }
}

/**
 * Fetch team statistical leaders
 */
export async function getTeamLeaders(teamId: number, season: number = 2026): Promise<Record<string, any[]>> {
  const cats = ['homeRuns', 'runsBattedIn', 'battingAverage', 'hits', 'stolenBases', 'wins', 'earnedRunAverage', 'strikeouts', 'saves'];
  try {
    const res = await fetch(`${BASE_URL}/v1/teams/${teamId}/leaders?leaderCategories=${cats.join(',')}&season=${season}&limit=3&leaderGameTypes=R`);
    if (!res.ok) return {};
    const data = await res.json();
    const result: Record<string, any[]> = {};
    (data.teamLeaders || []).forEach((tl: TeamLeaderItem) => {
      if (tl.leaders && tl.leaders.length > 0) {
        result[tl.leaderCategory.toLowerCase()] = tl.leaders;
      }
    });
    return result;
  } catch (err) {
    console.error(`Error loading leaders for team ${teamId}:`, err);
    return {};
  }
}

/**
 * Fetch team season hitting & pitching summary
 */
export async function getTeamSeasonStats(teamId: number, season: number = 2026): Promise<TeamSeasonStatsSummary> {
  try {
    const [hitRes, pitRes] = await Promise.all([
      fetch(`${BASE_URL}/v1/teams/${teamId}/stats?stats=season&season=${season}&group=hitting`),
      fetch(`${BASE_URL}/v1/teams/${teamId}/stats?stats=season&season=${season}&group=pitching`),
    ]);
    const hitData = hitRes.ok ? await hitRes.json() : null;
    const pitData = pitRes.ok ? await pitRes.json() : null;
    return {
      hitting: hitData?.stats?.[0]?.splits?.[0]?.stat,
      pitching: pitData?.stats?.[0]?.splits?.[0]?.stat,
    };
  } catch (err) {
    console.error(`Error loading season stats for team ${teamId}:`, err);
    return {};
  }
}

/**
 * Fetch team games schedule for a season
 */
export async function getTeamSeasonSchedule(teamId: number, season: number = 2026): Promise<MLBGame[]> {
  try {
    const res = await fetch(`${BASE_URL}/v1/schedule?sportId=1&teamId=${teamId}&season=${season}&gameType=R,F,D,L,W&hydrate=team,linescore`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.dates || []).flatMap((d: any) => d.games || []);
  } catch (err) {
    console.error(`Error loading schedule for team ${teamId}:`, err);
    return [];
  }
}

/**
 * Fetch Wikipedia summary for a team in Russian
 */
export async function getTeamWikiExtract(title: string): Promise<{ extract: string; url?: string } | null> {
  try {
    const res = await fetch(`https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      extract: data.extract || '',
      url: data.content_urls?.desktop?.page,
    };
  } catch {
    return null;
  }
}

/**
 * Search players by name
 */
export async function searchPlayers(query: string): Promise<Array<{ id: number; fullName: string }>> {
  try {
    const res = await fetch(`${BASE_URL}/v1/people/search?names=${encodeURIComponent(query.trim())}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.people || []).map((p: any) => ({
      id: p.id,
      fullName: p.fullName || p.nameFirstLast,
    }));
  } catch (err) {
    console.error('Error searching players:', err);
    return [];
  }
}

export interface TeamTransactionItem {
  id: number;
  person?: {
    id: number;
    fullName: string;
  };
  fromTeam?: { id: number; name: string };
  toTeam?: { id: number; name: string };
  date: string;
  effectiveDate?: string;
  typeCode?: string;
  typeDesc?: string;
  description: string;
}

/**
 * Fetch latest team transactions (roster moves, injuries, call-ups)
 */
export async function getTeamTransactions(teamId: number, limit = 20): Promise<TeamTransactionItem[]> {
  try {
    const res = await fetch(`${BASE_URL}/v1/transactions?teamId=${teamId}`);
    if (!res.ok) return [];
    const data = await res.json();
    const sorted = (data.transactions || []).sort((a: any, b: any) =>
      (b.date || '').localeCompare(a.date || '')
    );
    return sorted.slice(0, limit);
  } catch (err) {
    console.error(`Error loading transactions for team ${teamId}:`, err);
    return [];
  }
}
