import { supabase } from '@/lib/supabase'

const poolColors: Record<string, { bg: string; text: string }> = {
  A: { bg: '#4A7FB5', text: '#d4e6f7' },
  B: { bg: '#c97d3a', text: '#fde8cc' },
  C: { bg: '#4a8a78', text: '#c2e8df' },
  D: { bg: '#9e3e44', text: '#f5cdd0' },
}

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
    <div>
      <div className="mb-6">
        <div className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3" style={{ background: '#2e2e2e', color: '#aaa' }}>
          🏆 Live Tournament
        </div>
        <h1 className="text-3xl font-bold text-white mb-1">2026 D-I College Championships</h1>
        <p style={{ color: '#888' }}>Men's Division · Rockford, IL · May 22–25</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {pools.map(pool => {
          const teams = standings?.filter(s => s.pool === pool) ?? []
          const colors = poolColors[pool]
          return (
            <div key={pool} className="rounded-xl overflow-hidden" style={{ background: '#f9f6f0', border: '1px solid #e8e2d9' }}>
              <div style={{ background: colors.bg }} className="px-4 py-2.5">
                <h3 style={{ color: colors.text }} className="text-xs font-bold uppercase tracking-widest">Pool {pool}</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid #e8e2d9' }}>
                    <th className="text-left px-4 py-2 text-xs font-medium" style={{ color: '#999' }}>Team</th>
                    <th className="px-2 py-2 text-xs font-medium" style={{ color: '#999' }}>W</th>
                    <th className="px-2 py-2 text-xs font-medium" style={{ color: '#999' }}>L</th>
                    <th className="px-2 py-2 text-xs font-medium" style={{ color: '#999' }}>+/-</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((row: any, i: number) => (
                    <tr key={row.team.name} className="last:border-0" style={{ borderBottom: '1px solid #ede8e0' }}>
                      <td className="px-4 py-2.5">
                        <span className="text-xs mr-2" style={{ color: '#bbb' }}>{i + 1}</span>
                        <span className="font-medium" style={{ color: '#1a1a1a' }}>{row.team.name}</span>
                        <span className="text-xs ml-1" style={{ color: '#ccc' }}>#{row.team.seed}</span>
                      </td>
                      <td className="px-2 py-2.5 text-center" style={{ color: '#444' }}>{row.wins}</td>
                      <td className="px-2 py-2.5 text-center" style={{ color: '#444' }}>{row.losses}</td>
                      <td className="px-2 py-2.5 text-center font-medium">
                        <span style={{ color: row.point_diff > 0 ? '#2d7a4f' : row.point_diff < 0 ? '#c0392b' : '#999' }}>
                          {row.point_diff > 0 ? `+${row.point_diff}` : row.point_diff}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-center" style={{ color: '#555' }}>Standings updated after Friday pool play · Saturday games in progress</p>
    </div>
  )
}