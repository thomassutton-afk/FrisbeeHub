import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MEN_ID = 'a1b2c3d4-0000-0000-0000-000000000001'
const WOMEN_ID = 'a1b2c3d4-0000-0000-0000-000000000002'

async function fetchAndParse() {
  const res = await fetch('https://usaultimate.org/2026-d-i-college-championships/', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    next: { revalidate: 0 },
  })
  const html = await res.text()
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0)

  return text
}

function extractGames(lines: string[]) {
  const games: Array<{
    home_name: string
    away_name: string
    home_score: number
    away_score: number
    status: string
  }> = []

  for (let i = 0; i < lines.length - 6; i++) {
    const line = lines[i]

    // Status indicators
    let status = ''
    if (line === 'Scheduled') status = 'scheduled'
    else if (line === 'Live') status = 'in_progress'
    else if (/^Round \d+$/.test(line)) status = 'final'

    if (!status) continue

    // After status, look for field line, then two team blocks
    // Pattern: [status], [time?], [field], [poolpos], [teamname], [(seed)], [score], [poolpos], [teamname], [(seed)], [score]
    // Collect next ~10 lines and find the pattern
    const chunk = lines.slice(i + 1, i + 12)

    // Find two score lines (pure integers)
    const scoreIndices: number[] = []
    for (let j = 0; j < chunk.length; j++) {
      if (/^\d+$/.test(chunk[j])) scoreIndices.push(j)
      if (scoreIndices.length === 2) break
    }

    if (scoreIndices.length < 2) continue

    const score1 = parseInt(chunk[scoreIndices[0]])
    const score2 = parseInt(chunk[scoreIndices[1]])

    // Team names are the lines just before each score, skipping seed lines like "(1)"
    // Work backwards from score to find team name
    function findTeamName(chunkSlice: string[]): string {
      for (let k = chunkSlice.length - 1; k >= 0; k--) {
        const l = chunkSlice[k]
        if (/^\(\d+\)$/.test(l)) continue // seed
        if (/^\d+$/.test(l)) continue // score
        if (/^[A-D]\d$/.test(l)) continue // pool position like A1
        if (/^Field \d+$/.test(l)) continue
        if (l === 'Watch') continue
        if (l.length > 1) return l
      }
      return ''
    }

    const team1Chunk = chunk.slice(0, scoreIndices[0])
    const team2Chunk = chunk.slice(scoreIndices[0] + 1, scoreIndices[1])

    const home_name = findTeamName(team1Chunk)
    const away_name = findTeamName(team2Chunk)

    if (!home_name || !away_name) continue
    if (home_name === away_name) continue

    games.push({ home_name, away_name, home_score: score1, away_score: score2, status })
    i += scoreIndices[1] + 1
  }

  return games
}

function extractStandings(lines: string[]) {
  const standings: Array<{
    name: string; wins: number; losses: number; point_diff: number; pool: string; pool_rank: number
  }> = []

  let currentPool = ''
  let rank = 1

  for (let i = 0; i < lines.length; i++) {
    const poolMatch = lines[i].match(/^Pool ([A-D])$/)
    if (poolMatch) {
      currentPool = poolMatch[1]
      rank = 1
      continue
    }

    // W-L pattern like "3-0"
    const wlMatch = lines[i].match(/^(\d+)-(\d+)$/)
    if (wlMatch && currentPool) {
      const wins = parseInt(wlMatch[1])
      const losses = parseInt(wlMatch[2])

      // Point diff is next line like "+22" or "-5"
      const pdLine = lines[i + 1] || ''
      const pdMatch = pdLine.match(/^([+-]\d+)$/)
      if (!pdMatch) continue
      const point_diff = parseInt(pdMatch[1])

      // Team name is a few lines back — find it
      let name = ''
      for (let k = i - 1; k >= Math.max(0, i - 5); k--) {
        const l = lines[k]
        if (/^[A-D]\d$/.test(l)) continue
        if (/^\d+$/.test(l)) continue
        if (l === currentPool || l.startsWith('Pool')) continue
        if (l.length > 1 && !/^\d+-\d+$/.test(l)) { name = l; break }
      }

      if (name) {
        standings.push({ name, wins, losses, point_diff, pool: currentPool, pool_rank: rank })
        rank++
      }
    }
  }

  return standings
}

async function syncTournament(lines: string[], tournamentId: string, label: string) {
  const log: string[] = []

  const { data: teams } = await supabase
    .from('tournament_teams').select('id, name').eq('tournament_id', tournamentId)
  const { data: games } = await supabase
    .from('games').select('id, home_team_id, away_team_id').eq('tournament_id', tournamentId)

  if (!teams || !games) return ['DB fetch failed']

  const teamMap: Record<string, string> = {}
  for (const t of teams) teamMap[t.name.toLowerCase()] = t.id

  // Update standings
  const standings = extractStandings(lines)
  log.push('Standings found: ' + standings.length)
  for (const s of standings) {
    const teamId = teamMap[s.name.toLowerCase()]
    if (!teamId) { log.push('Team not found: ' + s.name); continue }
    await supabase.from('pool_standings')
      .update({ wins: s.wins, losses: s.losses, point_diff: s.point_diff, pool_rank: s.pool_rank })
      .eq('tournament_id', tournamentId).eq('team_id', teamId)
    log.push(label + ' standing: ' + s.name + ' ' + s.wins + '-' + s.losses + ' ' + s.point_diff)
  }

  // Update game scores
  const parsedGames = extractGames(lines)
  log.push('Games found: ' + parsedGames.length)
  for (const pg of parsedGames) {
    if (pg.status === 'scheduled') continue
    const homeId = teamMap[pg.home_name.toLowerCase()]
    const awayId = teamMap[pg.away_name.toLowerCase()]
    if (!homeId || !awayId) { log.push('Teams not found: ' + pg.home_name + ' / ' + pg.away_name); continue }
    const game = games.find(g => g.home_team_id === homeId && g.away_team_id === awayId)
    if (!game) { log.push('Game not in DB: ' + pg.home_name + ' vs ' + pg.away_name); continue }
    await supabase.from('games')
      .update({ home_score: pg.home_score, away_score: pg.away_score, status: pg.status })
      .eq('id', game.id)
    log.push(label + ': ' + pg.home_name + ' ' + pg.home_score + '-' + pg.away_score + ' ' + pg.away_name + ' (' + pg.status + ')')
  }

  return log
}

export async function GET() {
  try {
    const lines = await fetchAndParse()

    // Split men/women sections
    const menIdx = lines.findIndex(l => l === 'Men')
    const womenIdx = lines.findIndex(l => l === "Women's" || l === 'Women')

    const menLines = lines.slice(menIdx >= 0 ? menIdx : 0, womenIdx > 0 ? womenIdx : undefined)
    const womenLines = womenIdx >= 0 ? lines.slice(womenIdx) : []

    const [menLog, womenLog] = await Promise.all([
      syncTournament(menLines, MEN_ID, 'M'),
      syncTournament(womenLines, WOMEN_ID, 'W'),
    ])

    return NextResponse.json({ success: true, men: menLog, women: womenLog })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

