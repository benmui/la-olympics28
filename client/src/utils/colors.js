const COLOR_PALETTE = [
  { bg: 'bg-blue-100 text-blue-800',    border: 'border-blue-400'    },
  { bg: 'bg-green-100 text-green-800',  border: 'border-green-400'   },
  { bg: 'bg-purple-100 text-purple-800',border: 'border-purple-400'  },
  { bg: 'bg-amber-100 text-amber-800',  border: 'border-amber-400'   },
  { bg: 'bg-rose-100 text-rose-800',    border: 'border-rose-400'    },
  { bg: 'bg-cyan-100 text-cyan-800',    border: 'border-cyan-400'    },
  { bg: 'bg-indigo-100 text-indigo-800',border: 'border-indigo-400'  },
  { bg: 'bg-teal-100 text-teal-800',    border: 'border-teal-400'    },
  { bg: 'bg-orange-100 text-orange-800',border: 'border-orange-400'  },
  { bg: 'bg-pink-100 text-pink-800',    border: 'border-pink-400'    },
  { bg: 'bg-emerald-100 text-emerald-800', border: 'border-emerald-400' },
  { bg: 'bg-violet-100 text-violet-800',border: 'border-violet-400'  },
]

function hashSport(sport) {
  if (!sport) return 0
  let hash = 0
  for (let i = 0; i < sport.length; i++) {
    hash = (hash * 31 + sport.charCodeAt(i)) >>> 0
  }
  return hash % COLOR_PALETTE.length
}

export function sportColor(sport) {
  return COLOR_PALETTE[hashSport(sport)].bg
}

export function sportBorderColor(sport) {
  return COLOR_PALETTE[hashSport(sport)].border
}

const SOLID_COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b',
  '#ef4444', '#06b6d4', '#6366f1', '#14b8a6',
  '#f97316', '#ec4899', '#22c55e', '#a855f7',
]

export function sportSolidColor(sport) {
  if (!sport) return SOLID_COLORS[0]
  let hash = 0
  for (let i = 0; i < sport.length; i++) {
    hash = (hash * 31 + sport.charCodeAt(i)) >>> 0
  }
  return SOLID_COLORS[hash % SOLID_COLORS.length]
}

export const SESSION_TYPE_COLORS = {
  'Final':      'bg-amber-100 text-amber-800 border border-amber-300',
  'Semifinal':  'bg-orange-100 text-orange-800 border border-orange-300',
  'Preliminary':'bg-slate-100 text-slate-700',
  default:      'bg-slate-100 text-slate-700',
}
