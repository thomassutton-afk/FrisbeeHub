import { supabase } from '@/lib/supabase'

async function getStandings() {
  const { data } = await supabase
    .from('pool_standings')
    .select(`
      pool,
      pool_rank,
      wins,
      losses,
      point_diff,
      team:tournament_teams(name, seed)
    `)
    .eq('tournament_id', 'a1b2c3d4-0000-0000-0000-000000000001')
    .order('pool')
    .order('pool_rank')
  return data
}

export default async function Home() {
  const standings = await getStandings()

  const pools = ['A', 'B', 'C', 'D']

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">2026 D-I College Championships</h1>
      <p className="text-gray-500 mb-8">Men's Division · Rockford, IL · May 22–25</p>

      <h2 className="text-lg font-semibold mb-4">Pool Standings</h2>

      <div className="space-y-6">
        {pools.map(pool => {
          const teams = standings?.filter(s => s.pool === pool) ?? []
          return (
            <div key={pool}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Pool {pool}
              </h3>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">Team</th>
                      <th className="px-4 py-2 font-medium">W</th>
                      <th className="px-4 py-2 font-medium">L</th>
                      <th className="px-4 py-2 font-medium">+/-</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {teams.map((row: any) => (
                      <tr key={row.team.name} className="bg-white">
                        <td className="px-4 py-3">
                          <span className="font-medium">{row.team.name}</span>
                          <span className="text-gray-400 text-xs ml-2">#{row.team.seed}</span>
                        </td>
                        <td className="px-4 py-3 text-center">{row.wins}</td>
                        <td className="px-4 py-3 text-center">{row.losses}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={row.point_diff > 0 ? 'text-green-600' : row.point_diff < 0 ? 'text-red-500' : ''}>
                            {row.point_diff > 0 ? `+${row.point_diff}` : row.point_diff}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}