import { supabase } from '@/lib/supabase'

const poolColors: Record<string, { bg: string; text: string }> = {
  A: { bg: '#4A7FB5', text: '#d4e6f7' },
  B: { bg: '#c97d3a', text: '#fde8cc' },
  C: { bg: '#4a8a78', text: '#c2e8df' },
  D: { bg: '#9e3e44', text: '#f5cdd0' },
}

const DAYS = [
  { label: 'Friday',   date: 22, slug: 'fri' },
  { label: 'Saturday', date: 23, slug: 'sat' },
  { label: 'Sunday',   date: 24, slug: 'sun' },
  { label: 'Monday',   date: 25, slug: 'mon' },
]

async function getGames() {
  const { data } = await supabase
    .from('games')
    .select(`
      id,
      round,
      scheduled_time,
      field,
      status,
      home_score,
      away_score,
      home_team:tournament_teams!games_home_team_id_fkey(name, seed, pool),
      away_team:tournament_teams!games_away_team_id_fkey(name, seed, pool)
    `)
    .eq('tournament_id', 'a1b2c3d4-0000-0000-0000-000000000001')
    .order('scheduled_time')
  return data
}

async function getStandings() {
  const { data } = await supabase
    .from('pool_standings')
    .select('team_id, wins, losses, team:tournament_teams(name)')
    .eq('tournament_id', 'a1b2c3d4-0000-0000-0000-000000000001')
  return data
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago'
  })
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>
}) {
  const { day } = await searchParams
  const activeSlug = day ?? 'sat'
  const activeDay = DAYS.find(d => d.slug === activeSlug) ?? DAYS[1]

  const [games, standings] = await Promise.all([getGames(), getStandings()])

  const recordMap: Record<string, string> = {}
  standings?.forEach((s: any) => {
    recordMap[s.team.name] = s.wins + '-' + s.losses
  })

  const dayGames = games?.filter(g => {
    const d = new Date(g.scheduled_time)
    return d.getUTCDate() === activeDay.date && d.getUTCMonth() === 4
  }) ?? []

  const rounds = [...new Set(dayGames.map(g => g.round))]

  return (
    <div>
      <div className="mb-6">
        <div className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3" style={{ background: '#2e2e2e', color: '#aaa' }}>
          Tournament Schedule
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Schedule</h1>
        <div className="flex gap-2">
          {DAYS.map(d => (
            
              <a key={d.slug}
              href={'/schedule?day=' + d.slug}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={activeSlug === d.slug
                ? { background: '#f9f6f0', color: '#1a1a1a' }
                : { background: '#2e2e2e', color: '#888' }
              }
            >
              {d.label}
            </a>
          ))}
        </div>
      </div>

      {dayGames.length === 0 ? (
        <p style={{ color: '#555' }} className="text-sm">No games scheduled for this day yet.</p>
      ) : (
        <div className="space-y-6">
          {rounds.map(round => {
            const roundGames = dayGames.filter(g => g.round === round)
            const time = formatTime(roundGames[0].scheduled_time)
            return (
              <div key={round}>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#666' }}>{round}</h2>
                  <span className="text-xs" style={{ color: '#444' }}>{time}</span>
                </div>
                <div className="rounded-xl overflow-hidden" style={{ background: '#f9f6f0', border: '1px solid #e8e2d9' }}>
                  {roundGames.map((game: any, i: number) => {
                    const pool = game.home_team.pool
                    const poolColor = poolColors[pool]
                    const fieldNum = game.field.replace('Field ', '')
                    const homeWins = game.status === 'final' && game.home_score > game.away_score
                    const awayWins = game.status === 'final' && game.away_score > game.home_score
                    const homeRecord = recordMap[game.home_team.name]
                    const awayRecord = recordMap[game.away_team.name]
                    return (
                      <div key={game.id} className="flex items-center px-4 py-2.5" style={{ borderTop: i !== 0 ? '1px solid #ede8e0' : 'none' }}>
                        <div className="shrink-0 mr-2 w-6 h-6 rounded flex items-center justify-center" style={{ background: poolColor?.bg }}>
                          <span style={{ color: poolColor?.text, fontSize: '12px', fontWeight: 700 }}>{pool}</span>
                        </div>
                        <div className="shrink-0 mr-3 px-1.5 py-0.5 rounded" style={{ background: '#3a6b3a' }}>
                          <span className="font-bold text-white" style={{ fontSize: '11px' }}>{fieldNum}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium" style={{ color: homeWins ? '#1a1a1a' : '#555' }}>
                                {game.home_team.name}
                              </span>
                              {homeRecord && (
                                <span className="text-xs" style={{ color: '#bbb' }}>{homeRecord}</span>
                              )}
                            </div>
                            <span className="text-sm font-bold ml-3 w-6 text-right" style={{ color: homeWins ? '#2d7a4f' : '#999' }}>
                              {game.status !== 'scheduled' ? game.home_score : ''}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium" style={{ color: awayWins ? '#1a1a1a' : '#555' }}>
                                {game.away_team.name}
                              </span>
                              {awayRecord && (
                                <span className="text-xs" style={{ color: '#bbb' }}>{awayRecord}</span>
                              )}
                            </div>
                            <span className="text-sm font-bold ml-3 w-6 text-right" style={{ color: awayWins ? '#2d7a4f' : '#999' }}>
                              {game.status !== 'scheduled' ? game.away_score : ''}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs ml-4 shrink-0" style={{
                          color: game.status === 'final' ? '#bbb' :
                                 game.status === 'in_progress' ? '#2d7a4f' : '#4A7FB5'
                        }}>
                          {game.status === 'final' ? 'Final' :
                           game.status === 'in_progress' ? 'Live' :
                           formatTime(game.scheduled_time)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
