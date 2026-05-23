import { supabase } from '@/lib/supabase'

async function getGames() {
  const { data } = await supabase
    .from('games')
    .select(`
      id,
      round,
      stage,
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

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago'
  })
}

export default async function SchedulePage() {
  const games = await getGames()

  const today = games?.filter(g => {
    const d = new Date(g.scheduled_time)
    return d.toDateString() === new Date('2026-05-23').toDateString()
  }) ?? []

  const rounds = [...new Set(today.map(g => g.round))]

  return (
    <div>
      <div className="mb-6">
        <div className="inline-block bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full mb-3">
          📅 Saturday — Day 2
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Today's Schedule</h1>
        <p className="text-gray-500">2026 D-I College Championships · Men's Division</p>
      </div>

      <div className="space-y-8">
        {rounds.map(round => {
          const roundGames = today.filter(g => g.round === round)
          const time = formatTime(roundGames[0].scheduled_time)
          return (
            <div key={round}>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{round}</h2>
                <span className="text-xs text-gray-300">{time}</span>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {roundGames.map((game: any, i: number) => (
                  <div key={game.id} className={`flex items-center px-4 py-2.5 ${i !== 0 ? 'border-t border-gray-100' : ''}`}>
                    <span className="text-xs text-gray-300 w-16 shrink-0">
                      <span className="text-emerald-500 font-semibold">{game.home_team.pool}</span>
                      <span className="mx-1">·</span>
                      {game.field}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium truncate ${game.status === 'final' && game.home_score > game.away_score ? 'text-gray-900' : 'text-gray-500'}`}>
                          {game.home_team.name}
                        </span>
                        <span className={`text-sm font-bold ml-3 w-6 text-right ${game.status === 'final' && game.home_score > game.away_score ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {game.status !== 'scheduled' ? game.home_score : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className={`text-sm font-medium truncate ${game.status === 'final' && game.away_score > game.home_score ? 'text-gray-900' : 'text-gray-500'}`}>
                          {game.away_team.name}
                        </span>
                        <span className={`text-sm font-bold ml-3 w-6 text-right ${game.status === 'final' && game.away_score > game.home_score ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {game.status !== 'scheduled' ? game.away_score : ''}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs ml-4 shrink-0 ${
                      game.status === 'final' ? 'text-gray-300' :
                      game.status === 'in_progress' ? 'text-emerald-600 font-semibold' :
                      'text-blue-400'
                    }`}>
                      {game.status === 'final' ? 'Final' : game.status === 'in_progress' ? 'Live' : 'Soon'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}