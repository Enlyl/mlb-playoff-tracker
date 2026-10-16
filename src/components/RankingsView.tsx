import React, { useState, useEffect, useCallback } from 'react';
import {
  Trophy,
  Users,
  TrendingUp,
  Zap,
  Target,
  ChevronUp,
  ChevronDown,
  Minus,
  BarChart3,
  Flame,
  Shield,
  Wind,
  Star,
} from 'lucide-react';
import {
  getTeamSeasonRecords,
  getBattingLeaders,
  getPitchingLeaders,
  getTeamLogoUrl,
  getPlayerPhotoUrl,
  TeamSeasonRecord,
  PlayerStatLeader,
  MLBGame,
} from '../services/mlbApi';
import { PlayerDetailModal } from './PlayerDetailModal';

// ── Constants ─────────────────────────────────────────────────────────────────

const SEASONS = [2026, 2025, 2024, 2023] as const;
type Season = (typeof SEASONS)[number];

type MainTab = 'teams' | 'batting' | 'pitching';
type TeamSortKey = 'pct' | 'wins' | 'runsScored' | 'runsAllowed';
type BatSortKey = 'hr' | 'avg' | 'rbi' | 'ops' | 'sb' | 'hits';
type PitSortKey = 'era' | 'wins' | 'strikeouts' | 'whip' | 'saves';

// ── Small helpers ─────────────────────────────────────────────────────────────

function fmt(val: number | null | undefined, decimals = 0, fallback = '—') {
  if (val == null || isNaN(val)) return fallback;
  return decimals > 0 ? val.toFixed(decimals) : String(val);
}

function fmtAvg(val: number | null | undefined) {
  if (val == null || isNaN(val)) return '—';
  return val.toFixed(3).replace(/^0/, '');
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow({ cols = 7 }: { cols?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <div className="h-3 rounded-full bg-white/[0.04]" style={{ width: i === 1 ? '8rem' : '3rem' }} />
        </td>
      ))}
    </tr>
  );
}

// ── Season pill row ───────────────────────────────────────────────────────────

function SeasonPills({
  active,
  onChange,
}: {
  active: Season;
  onChange: (s: Season) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {SEASONS.map((s) => {
        const isCurrent = s === 2026;
        const isActive = s === active;
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            className="px-3 py-1 rounded-full text-xs font-bold transition-all"
            style={{
              background: isActive
                ? 'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)'
                : 'rgba(255,255,255,0.04)',
              color: isActive ? '#0f0f13' : isCurrent ? '#fcd34d' : 'rgba(148,163,184,0.9)',
              border: isActive ? 'none' : isCurrent ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.07)',
              boxShadow: isActive ? '0 2px 12px rgba(245,158,11,0.35)' : 'none',
            }}
          >
            {s}{isCurrent ? ' •' : ''}
          </button>
        );
      })}
    </div>
  );
}

// ── Sort header cell ──────────────────────────────────────────────────────────

function SortTh<K extends string>({
  label,
  sortKey,
  active,
  dir,
  onClick,
  right = true,
  hint,
}: {
  label: string;
  sortKey: K;
  active: K;
  dir: 'asc' | 'desc';
  onClick: (k: K) => void;
  right?: boolean;
  hint?: string;
}) {
  const isActive = sortKey === active;
  return (
    <th
      className="px-3 py-2.5 cursor-pointer select-none whitespace-nowrap group"
      style={{ textAlign: right ? 'right' : 'left' }}
      onClick={() => onClick(sortKey)}
      title={hint}
    >
      <span
        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors"
        style={{ color: isActive ? '#fcd34d' : 'rgba(100,116,139,0.8)' }}
      >
        {label}
        {isActive ? (
          dir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
        ) : (
          <Minus className="w-2.5 h-2.5 opacity-30 group-hover:opacity-60 transition-opacity" />
        )}
      </span>
    </th>
  );
}

// ── TEAM RANKINGS TABLE ───────────────────────────────────────────────────────

function TeamRankingsTable({
  season,
  favoriteTeamId,
  onSelectTeam,
}: {
  season: Season;
  favoriteTeamId?: number;
  onSelectTeam?: (teamId: number, teamName: string) => void;
}) {
  const [records, setRecords] = useState<TeamSeasonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<TeamSortKey>('pct');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [leagueFilter, setLeagueFilter] = useState<'all' | 'AL' | 'NL'>('all');

  useEffect(() => {
    setLoading(true);
    setRecords([]);
    getTeamSeasonRecords(season).then((r) => {
      setRecords(r);
      setLoading(false);
    });
  }, [season]);

  const handleSort = useCallback((key: TeamSortKey) => {
    setSortKey((prev) => {
      if (prev === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
      else setSortDir('desc');
      return key;
    });
  }, []);

  const sorted = [...records]
    .filter((r) => {
      if (leagueFilter === 'AL') return r.league.includes('American') || r.league === 'AL';
      if (leagueFilter === 'NL') return r.league.includes('National') || r.league === 'NL';
      return true;
    })
    .sort((a, b) => {
      let av = a[sortKey] ?? 0;
      let bv = b[sortKey] ?? 0;
      if (sortKey === 'runsAllowed') { av = -(av as number); bv = -(bv as number); }
      return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number);
    });

  return (
    <div className="space-y-3">
      {/* Filter pills */}
      <div className="flex items-center gap-2">
        {(['all', 'AL', 'NL'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setLeagueFilter(f)}
            className="px-3 py-1 rounded-full text-xs font-bold transition-all"
            style={{
              background: leagueFilter === f ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
              color: leagueFilter === f ? '#93c5fd' : 'rgba(100,116,139,0.8)',
              border: leagueFilter === f ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {f === 'all' ? 'Все лиги' : f === 'AL' ? 'Американская лига (AL)' : 'Национальная лига (NL)'}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-slate-500 font-mono">{sorted.length} команд • Нажмите на команду для открытия досье</span>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden border border-white/[0.06]">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-600 w-8">#</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-600">Команда</th>
                <SortTh label="W" sortKey="wins" active={sortKey} dir={sortDir} onClick={handleSort} hint="Победы" />
                <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-600">L</th>
                <SortTh label="PCT" sortKey="pct" active={sortKey} dir={sortDir} onClick={handleSort} hint="Процент побед" />
                <SortTh label="RS" sortKey="runsScored" active={sortKey} dir={sortDir} onClick={handleSort} hint="Раны набранные" />
                <SortTh label="RA" sortKey="runsAllowed" active={sortKey} dir={sortDir} onClick={handleSort} hint="Раны пропущенные" />
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 12 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
                : sorted.map((r, i) => {
                    const isFav = r.teamId === favoriteTeamId;
                    return (
                      <tr
                        key={r.teamId}
                        onClick={() => onSelectTeam && onSelectTeam(r.teamId, r.teamName)}
                        title={`Открыть полное досье ${r.teamName}`}
                        className="cursor-pointer transition-colors duration-150 group/row hover:bg-white/[0.06]"
                        style={{
                          background: isFav
                            ? 'linear-gradient(90deg, rgba(245,158,11,0.18) 0%, rgba(245,158,11,0.06) 100%)'
                            : i % 2 === 0
                            ? 'rgba(255,255,255,0.015)'
                            : 'transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          borderLeft: isFav ? '4px solid #f59e0b' : '4px solid transparent',
                        }}
                      >
                        <td className={`px-3 py-3 font-mono text-[11px] ${isFav ? 'font-bold text-amber-300' : 'text-slate-600'}`}>{i + 1}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-full overflow-hidden bg-slate-800 flex-shrink-0 transition-all ${
                              isFav ? 'ring-2 ring-amber-400 p-0.5 shadow-[0_0_12px_rgba(245,158,11,0.6)]' : 'ring-1 ring-white/[0.08]'
                            }`}>
                              <img
                                src={getTeamLogoUrl(r.teamId)}
                                alt=""
                                className="w-full h-full object-contain p-0.5"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`font-bold transition-colors group-hover/row:text-amber-300 ${isFav ? 'text-amber-300 text-sm font-extrabold' : 'text-white'}`}>
                                  {r.teamName}
                                </span>
                                {isFav && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400 text-slate-950 flex items-center gap-0.5 shadow-sm">
                                    <Star className="w-2.5 h-2.5 fill-current" />
                                    МОЯ
                                  </span>
                                )}
                                <span className="opacity-0 group-hover/row:opacity-100 transition-opacity text-[10px] text-amber-400 font-medium">
                                  → Досье
                                </span>
                              </div>
                              <div className={`text-[10px] mt-0.5 ${isFav ? 'text-amber-200/80 font-medium' : 'text-slate-500'}`}>
                                {r.divisionName || (r.league.includes('American') ? 'AL' : 'NL')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-emerald-400 font-mono">{r.wins}</td>
                        <td className="px-3 py-3 text-right text-red-400/80 font-mono">{r.losses}</td>
                        <td className="px-3 py-3 text-right font-mono font-bold"
                          style={{ color: r.pct >= 0.6 ? '#fcd34d' : r.pct >= 0.5 ? '#86efac' : 'rgba(148,163,184,0.7)' }}>
                          {fmt(r.pct, 3)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-slate-300">{fmt(r.runsScored)}</td>
                        <td className="px-3 py-3 text-right font-mono text-slate-500">{fmt(r.runsAllowed)}</td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── BATTING LEADERS TABLE ─────────────────────────────────────────────────────

function BattingLeadersTable({
  season,
  favoriteTeamId,
  onSelectTeam,
  onSelectPlayer,
}: {
  season: Season;
  favoriteTeamId?: number;
  onSelectTeam?: (teamId: number, teamName: string) => void;
  onSelectPlayer?: (playerId: number, playerName: string) => void;
}) {
  const [players, setPlayers] = useState<PlayerStatLeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<BatSortKey>('hr');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [leagueFilter, setLeagueFilter] = useState<'all' | 'AL' | 'NL'>('all');

  useEffect(() => {
    setLoading(true);
    setPlayers([]);
    getBattingLeaders(season, 35).then((p) => {
      setPlayers(p);
      setLoading(false);
    });
  }, [season]);

  const handleSort = useCallback((key: BatSortKey) => {
    setSortKey((prev) => {
      if (prev === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
      else setSortDir(key === 'avg' || key === 'ops' ? 'desc' : 'desc');
      return key;
    });
  }, []);

  const sorted = [...players]
    .filter((p) => {
      if (leagueFilter === 'AL') return p.league === 'AL';
      if (leagueFilter === 'NL') return p.league === 'NL';
      return true;
    })
    .sort((a, b) => {
      const av = (a[sortKey] as number) ?? 0;
      const bv = (b[sortKey] as number) ?? 0;
      return sortDir === 'desc' ? bv - av : av - bv;
    });

  return (
    <div className="space-y-3">
      {/* Filter pills */}
      <div className="flex items-center gap-2">
        {(['all', 'AL', 'NL'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setLeagueFilter(f)}
            className="px-3 py-1 rounded-full text-xs font-bold transition-all"
            style={{
              background: leagueFilter === f ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.04)',
              color: leagueFilter === f ? '#fcd34d' : 'rgba(100,116,139,0.8)',
              border: leagueFilter === f ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {f === 'all' ? 'Все лиги' : f === 'AL' ? 'Американская лига (AL)' : 'Национальная лига (NL)'}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-slate-500 font-mono">{sorted.length} игроков</span>
      </div>

      <div className="rounded-xl overflow-hidden border border-white/[0.06]">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-600 w-8">#</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-600">Игрок</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-600">Команда</th>
                <SortTh label="HR" sortKey="hr" active={sortKey} dir={sortDir} onClick={handleSort} hint="Хоум-раны" />
                <SortTh label="AVG" sortKey="avg" active={sortKey} dir={sortDir} onClick={handleSort} hint="Средний показатель" />
                <SortTh label="RBI" sortKey="rbi" active={sortKey} dir={sortDir} onClick={handleSort} hint="Раны набитые с бит" />
                <SortTh label="OPS" sortKey="ops" active={sortKey} dir={sortDir} onClick={handleSort} hint="OPS = OBP + SLG" />
                <SortTh label="SB" sortKey="sb" active={sortKey} dir={sortDir} onClick={handleSort} hint="Ворованные базы" />
                <SortTh label="H" sortKey="hits" active={sortKey} dir={sortDir} onClick={handleSort} hint="Хиты" />
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 15 }).map((_, i) => <SkeletonRow key={i} cols={9} />)
                : sorted.map((p, i) => {
                    const isFavTeam = p.teamId === favoriteTeamId;
                    return (
                      <tr
                        key={p.playerId}
                        style={{
                          background: isFavTeam
                            ? 'linear-gradient(90deg, rgba(245,158,11,0.18) 0%, rgba(245,158,11,0.05) 100%)'
                            : i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          borderLeft: isFavTeam ? '4px solid #f59e0b' : '4px solid transparent',
                        }}
                      >
                        <td className={`px-3 py-2.5 font-mono text-[11px] ${isFavTeam ? 'font-bold text-amber-300' : 'text-slate-600'}`}>{i + 1}</td>
                        <td className="px-3 py-2.5">
                          <div
                            className="flex items-center gap-2 cursor-pointer group/player"
                            onClick={() => onSelectPlayer && onSelectPlayer(p.playerId, p.playerName)}
                            title={`Открыть карточку ${p.playerName}`}
                          >
                            <div className={`w-7 h-7 rounded-full overflow-hidden bg-slate-800 flex-shrink-0 transition-all ${
                              isFavTeam ? 'ring-2 ring-amber-400 p-0.5 shadow-[0_0_12px_rgba(245,158,11,0.6)]' : 'ring-1 ring-white/[0.07]'
                            }`}>
                              <img
                                src={getPlayerPhotoUrl(p.playerId)}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const el = e.target as HTMLImageElement;
                                  el.style.display = 'none';
                                  (el.parentElement as HTMLElement).style.display = 'flex';
                                  (el.parentElement as HTMLElement).style.alignItems = 'center';
                                  (el.parentElement as HTMLElement).style.justifyContent = 'center';
                                  (el.parentElement as HTMLElement).innerHTML = `<span style="font-size:10px;color:#94a3b8;font-weight:700">${p.playerName.charAt(0)}</span>`;
                                }}
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`font-semibold transition-colors group-hover/player:text-amber-300 ${isFavTeam ? 'text-amber-300 font-extrabold' : 'text-white'}`}>
                                {p.playerName}
                              </span>
                              {isFavTeam && (
                                <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black bg-amber-400 text-slate-950 flex items-center gap-0.5 shadow-sm">
                                  <Star className="w-2 h-2 fill-current" />
                                  МОЯ
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div
                            className="flex items-center gap-1.5 cursor-pointer group/team hover:opacity-80 transition"
                            onClick={() => onSelectTeam && onSelectTeam(p.teamId, p.teamName)}
                            title={`Открыть досье ${p.teamName}`}
                          >
                            <div className={`w-4 h-4 rounded overflow-hidden bg-slate-800 flex-shrink-0 ${isFavTeam ? 'ring-1 ring-amber-400' : ''}`}>
                              <img
                                src={getTeamLogoUrl(p.teamId)}
                                alt=""
                                className="w-full h-full object-contain"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            </div>
                            <span className={`text-[10px] group-hover/team:text-amber-300 transition-colors ${isFavTeam ? 'text-amber-300 font-bold' : 'text-slate-400'}`}>
                              {p.teamName.split(' ').pop()}
                            </span>
                            {p.league && (
                              <span
                                className="px-1 py-0.5 rounded text-[9px] font-bold font-mono"
                                style={{
                                  background: p.league === 'AL' ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)',
                                  color: p.league === 'AL' ? '#93c5fd' : '#fca5a5',
                                  border: `1px solid ${p.league === 'AL' ? 'rgba(59,130,246,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                }}
                              >
                                {p.league}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold font-mono"
                          style={{ color: (p.hr ?? 0) >= 30 ? '#fcd34d' : (p.hr ?? 0) >= 20 ? '#86efac' : 'rgba(203,213,225,0.8)' }}>
                          {fmt(p.hr)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-200">{fmtAvg(p.avg)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-200">{fmt(p.rbi)}</td>
                        <td className="px-3 py-2.5 text-right font-mono"
                          style={{ color: (p.ops ?? 0) >= 0.9 ? '#a78bfa' : 'rgba(203,213,225,0.8)' }}>
                          {fmt(p.ops, 3)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-400">{fmt(p.sb)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-400">{fmt(p.hits)}</td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── PITCHING LEADERS TABLE ────────────────────────────────────────────────────

function PitchingLeadersTable({
  season,
  favoriteTeamId,
  onSelectTeam,
  onSelectPlayer,
}: {
  season: Season;
  favoriteTeamId?: number;
  onSelectTeam?: (teamId: number, teamName: string) => void;
  onSelectPlayer?: (playerId: number, playerName: string) => void;
}) {
  const [players, setPlayers] = useState<PlayerStatLeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<PitSortKey>('era');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [leagueFilter, setLeagueFilter] = useState<'all' | 'AL' | 'NL'>('all');

  useEffect(() => {
    setLoading(true);
    setPlayers([]);
    getPitchingLeaders(season, 35).then((p) => {
      setPlayers(p);
      setLoading(false);
    });
  }, [season]);

  const handleSort = useCallback((key: PitSortKey) => {
    setSortKey((prev) => {
      const defaultDesc = key === 'wins' || key === 'strikeouts' || key === 'saves';
      if (prev === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
      else setSortDir(defaultDesc ? 'desc' : 'asc');
      return key;
    });
  }, []);

  const sorted = [...players]
    .filter((p) => {
      if (leagueFilter === 'AL') return p.league === 'AL';
      if (leagueFilter === 'NL') return p.league === 'NL';
      return true;
    })
    .sort((a, b) => {
      const av = (a[sortKey] as number) ?? (sortDir === 'asc' ? 99 : 0);
      const bv = (b[sortKey] as number) ?? (sortDir === 'asc' ? 99 : 0);
      return sortDir === 'desc' ? bv - av : av - bv;
    });

  return (
    <div className="space-y-3">
      {/* Filter pills */}
      <div className="flex items-center gap-2">
        {(['all', 'AL', 'NL'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setLeagueFilter(f)}
            className="px-3 py-1 rounded-full text-xs font-bold transition-all"
            style={{
              background: leagueFilter === f ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.04)',
              color: leagueFilter === f ? '#c4b5fd' : 'rgba(100,116,139,0.8)',
              border: leagueFilter === f ? '1px solid rgba(167,139,250,0.4)' : '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {f === 'all' ? 'Все лиги' : f === 'AL' ? 'Американская лига (AL)' : 'Национальная лига (NL)'}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-slate-500 font-mono">{sorted.length} питчеров</span>
      </div>

      <div className="rounded-xl overflow-hidden border border-white/[0.06]">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-600 w-8">#</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-600">Питчер</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-600">Команда</th>
                <SortTh label="ERA" sortKey="era" active={sortKey} dir={sortDir} onClick={handleSort} hint="Earned Run Average (меньше = лучше)" />
                <SortTh label="W" sortKey="wins" active={sortKey} dir={sortDir} onClick={handleSort} hint="Победы" />
                <SortTh label="K" sortKey="strikeouts" active={sortKey} dir={sortDir} onClick={handleSort} hint="Страйкауты" />
                <SortTh label="WHIP" sortKey="whip" active={sortKey} dir={sortDir} onClick={handleSort} hint="Walks+Hits per Inning Pitched" />
                <SortTh label="SV" sortKey="saves" active={sortKey} dir={sortDir} onClick={handleSort} hint="Сейвы (для клоузеров)" />
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 15 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
                : sorted.map((p, i) => {
                    const isFavTeam = p.teamId === favoriteTeamId;
                    return (
                      <tr
                        key={p.playerId}
                        style={{
                          background: isFavTeam
                            ? 'linear-gradient(90deg, rgba(245,158,11,0.18) 0%, rgba(245,158,11,0.05) 100%)'
                            : i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          borderLeft: isFavTeam ? '4px solid #f59e0b' : '4px solid transparent',
                        }}
                      >
                        <td className={`px-3 py-2.5 font-mono text-[11px] ${isFavTeam ? 'font-bold text-amber-300' : 'text-slate-600'}`}>{i + 1}</td>
                        <td className="px-3 py-2.5">
                          <div
                            className="flex items-center gap-2 cursor-pointer group/player"
                            onClick={() => onSelectPlayer && onSelectPlayer(p.playerId, p.playerName)}
                            title={`Открыть карточку ${p.playerName}`}
                          >
                            <div className={`w-7 h-7 rounded-full overflow-hidden bg-slate-800 flex-shrink-0 transition-all ${
                              isFavTeam ? 'ring-2 ring-amber-400 p-0.5 shadow-[0_0_12px_rgba(245,158,11,0.6)]' : 'ring-1 ring-white/[0.07]'
                            }`}>
                              <img
                                src={getPlayerPhotoUrl(p.playerId)}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const el = e.target as HTMLImageElement;
                                  el.style.display = 'none';
                                  (el.parentElement as HTMLElement).innerHTML = `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:10px;color:#94a3b8;font-weight:700">${p.playerName.charAt(0)}</span>`;
                                }}
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`font-semibold transition-colors group-hover/player:text-amber-300 ${isFavTeam ? 'text-amber-300 font-extrabold' : 'text-white'}`}>
                                {p.playerName}
                              </span>
                              {isFavTeam && (
                                <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black bg-amber-400 text-slate-950 flex items-center gap-0.5 shadow-sm">
                                  <Star className="w-2 h-2 fill-current" />
                                  МОЯ
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div
                            className="flex items-center gap-1.5 cursor-pointer group/team hover:opacity-80 transition"
                            onClick={() => onSelectTeam && onSelectTeam(p.teamId, p.teamName)}
                            title={`Открыть досье ${p.teamName}`}
                          >
                            <div className={`w-4 h-4 rounded overflow-hidden bg-slate-800 flex-shrink-0 ${isFavTeam ? 'ring-1 ring-amber-400' : ''}`}>
                              <img
                                src={getTeamLogoUrl(p.teamId)}
                                alt=""
                                className="w-full h-full object-contain"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            </div>
                            <span className={`text-[10px] group-hover/team:text-amber-300 transition-colors ${isFavTeam ? 'text-amber-300 font-bold' : 'text-slate-400'}`}>
                              {p.teamName.split(' ').pop()}
                            </span>
                            {p.league && (
                              <span
                                className="px-1 py-0.5 rounded text-[9px] font-bold font-mono"
                                style={{
                                  background: p.league === 'AL' ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)',
                                  color: p.league === 'AL' ? '#93c5fd' : '#fca5a5',
                                  border: `1px solid ${p.league === 'AL' ? 'rgba(59,130,246,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                }}
                              >
                                {p.league}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold font-mono"
                        style={{ color: (p.era ?? 99) <= 2.5 ? '#34d399' : (p.era ?? 99) <= 3.5 ? '#86efac' : (p.era ?? 99) >= 5 ? '#f87171' : 'rgba(203,213,225,0.8)' }}>
                        {fmt(p.era, 2)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-200">{fmt(p.wins)}</td>
                      <td className="px-3 py-2.5 text-right font-bold font-mono"
                        style={{ color: (p.strikeouts ?? 0) >= 200 ? '#c4b5fd' : 'rgba(203,213,225,0.8)' }}>
                        {fmt(p.strikeouts)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono"
                        style={{ color: (p.whip ?? 99) <= 1.0 ? '#34d399' : (p.whip ?? 99) <= 1.2 ? '#86efac' : 'rgba(203,213,225,0.8)' }}>
                        {fmt(p.whip, 2)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-sky-400">{fmt(p.saves)}</td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  );
}

// ── MAIN VIEW ─────────────────────────────────────────────────────────────────

interface RankingsViewProps {
  onSelectTeam?: (teamId: number, teamName: string) => void;
  favoriteTeamId?: number;
}

export const RankingsView: React.FC<RankingsViewProps> = ({
  onSelectTeam, favoriteTeamId }) => {
  const [mainTab, setMainTab] = useState<MainTab>('teams');
  const [season, setSeason] = useState<Season>(2026);

  // Modal state
    const [selectedPlayerModal, setSelectedPlayerModal] = useState<{ id: number; name: string } | null>(null);

  const handleSelectTeam = useCallback((teamId: number, teamName: string) => {
    onSelectTeam?.(teamId, teamName );
  }, []);

  const handleSelectPlayer = useCallback((playerId: number, playerName: string) => {
    setSelectedPlayerModal({ id: playerId, name: playerName });
  }, []);

  const MAIN_TABS: { id: MainTab; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
    {
      id: 'teams',
      label: 'Команды',
      icon: <Shield className="w-3.5 h-3.5" />,
      color: '#3b82f6',
      desc: 'Рейтинг по победам, PCT, результативности',
    },
    {
      id: 'batting',
      label: 'Бэттеры',
      icon: <Flame className="w-3.5 h-3.5" />,
      color: '#f59e0b',
      desc: 'HR, AVG, RBI, OPS, SB лидеры сезона',
    },
    {
      id: 'pitching',
      label: 'Питчеры',
      icon: <Wind className="w-3.5 h-3.5" />,
      color: '#a78bfa',
      desc: 'ERA, страйкауты, WHIP, сейвы',
    },
  ];

  const activeTabData = MAIN_TABS.find((t) => t.id === mainTab)!;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)' }}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Рейтинги</h2>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed max-w-lg">
            Статистика команд и игроков за 2023–2026 · данные MLB Stats API
          </p>
        </div>

        {/* Season selector */}
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-[10px] text-slate-600 uppercase tracking-wider">Сезон</span>
          <SeasonPills active={season} onChange={setSeason} />
        </div>
      </div>

      {/* ── Main tab switcher ── */}
      <div className="grid grid-cols-3 gap-2">
        {MAIN_TABS.map((t) => {
          const isActive = t.id === mainTab;
          return (
            <button
              key={t.id}
              onClick={() => setMainTab(t.id)}
              className="relative rounded-xl p-3 sm:p-4 text-left transition-all group overflow-hidden"
              style={{
                background: isActive ? `${t.color}15` : 'rgba(255,255,255,0.025)',
                border: isActive ? `1px solid ${t.color}40` : '1px solid rgba(255,255,255,0.06)',
                boxShadow: isActive ? `0 0 20px ${t.color}18` : 'none',
              }}
            >
              {isActive && (
                <div
                  className="absolute inset-0 opacity-[0.04] pointer-events-none"
                  style={{ background: `radial-gradient(ellipse at 30% 50%, ${t.color} 0%, transparent 70%)` }}
                />
              )}
              <div className="flex items-center gap-2 mb-1.5">
                <span style={{ color: isActive ? t.color : 'rgba(100,116,139,0.7)' }}>{t.icon}</span>
                <span
                  className="text-xs font-bold"
                  style={{ color: isActive ? '#fff' : 'rgba(148,163,184,0.8)' }}
                >
                  {t.label}
                </span>
              </div>
              <p className="text-[10px] leading-relaxed hidden sm:block"
                style={{ color: isActive ? 'rgba(203,213,225,0.6)' : 'rgba(71,85,105,0.8)' }}>
                {t.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}
      >
        {/* Sub-header */}
        <div
          className="px-4 py-3 flex items-center gap-3 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
        >
          <span style={{ color: activeTabData.color }}>{activeTabData.icon}</span>
          <span className="text-xs font-bold text-white">{activeTabData.label}</span>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono"
            style={{
              background: `${activeTabData.color}15`,
              border: `1px solid ${activeTabData.color}35`,
              color: activeTabData.color,
            }}
          >
            {season}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <BarChart3 className="w-3 h-3 text-slate-600" />
            <span className="text-[10px] text-slate-600">statsapi.mlb.com</span>
          </div>
        </div>

        {/* Table content */}
        <div className="p-3 sm:p-4">
          {mainTab === 'teams' && (
            <TeamRankingsTable
              season={season}
              favoriteTeamId={favoriteTeamId}
              onSelectTeam={handleSelectTeam}
            />
          )}
          {mainTab === 'batting' && (
            <BattingLeadersTable
              season={season}
              favoriteTeamId={favoriteTeamId}
              onSelectTeam={handleSelectTeam}
              onSelectPlayer={handleSelectPlayer}
            />
          )}
          {mainTab === 'pitching' && (
            <PitchingLeadersTable
              season={season}
              favoriteTeamId={favoriteTeamId}
              onSelectTeam={handleSelectTeam}
              onSelectPlayer={handleSelectPlayer}
            />
          )}
        </div>
      </div>

      {/* ── Stat legend ── */}
      <div
        className="rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        {mainTab === 'teams' && ([
          ['PCT', 'Процент побед (W / G)'],
          ['RS', 'Раны набранные за сезон'],
          ['RA', 'Раны пропущенные за сезон'],
          ['W/L', 'Победы и поражения'],
        ] as [string, string][]).map(([abbr, desc]) => (
          <div key={abbr}>
            <span className="block text-[10px] font-bold text-amber-400/70 mb-0.5">{abbr}</span>
            <span className="text-[10px] text-slate-600">{desc}</span>
          </div>
        ))}
        {mainTab === 'batting' && ([
          ['HR', 'Хоум-раны — мяч за забор'],
          ['AVG', 'Batting Average (хиты / AB)'],
          ['RBI', 'Раны, занесённые с бита'],
          ['OPS', 'On-base % + Slugging %'],
          ['SB', 'Ворованные базы'],
          ['H', 'Хиты (все типы)'],
          ['—', 'Золото ≥ топ уровень'],
          ['Фиолет', 'OPS ≥ 0.900 — элита'],
        ] as [string, string][]).map(([abbr, desc]) => (
          <div key={abbr}>
            <span className="block text-[10px] font-bold text-amber-400/70 mb-0.5">{abbr}</span>
            <span className="text-[10px] text-slate-600">{desc}</span>
          </div>
        ))}
        {mainTab === 'pitching' && ([
          ['ERA', 'Earned Run Average — меньше лучше'],
          ['K', 'Страйкауты питчера'],
          ['WHIP', 'Walks+Hits per IP — эффективность'],
          ['SV', 'Сейвы — клоузер закрыл матч'],
        ] as [string, string][]).map(([abbr, desc]) => (
          <div key={abbr}>
            <span className="block text-[10px] font-bold text-amber-400/70 mb-0.5">{abbr}</span>
            <span className="text-[10px] text-slate-600">{desc}</span>
          </div>
        ))}
      </div>


      {/* ── PLAYER DETAIL MODAL ── */}
      {selectedPlayerModal && (
        <PlayerDetailModal
          playerId={selectedPlayerModal.id}
          playerName={selectedPlayerModal.name}
          onClose={() => setSelectedPlayerModal(null)}
        />
      )}

    </div>
  );
};
