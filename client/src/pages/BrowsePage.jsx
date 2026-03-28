import React, { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { api } from '../api'
import { usePlans } from '../context/PlansContext'
import { sportColor } from '../utils/colors'
import EventCard from '../components/EventCard'

const LA_ZONES = [
  'DTLA', 'Exposition', 'Port of Los Angeles', 'Riviera', 'Universal City',
  'Valley', 'Venice', 'Carson', 'Inglewood', 'Long Beach', 'Pasadena',
  'Anaheim', 'Arcadia', 'City of Industry', 'Pomona',
]
const LA_ZONES_SET = new Set(LA_ZONES)
const LA_ALL_VALUE = LA_ZONES.join(',')

export default function BrowsePage() {
  const { activePlan } = usePlans()

  // Reference data
  const [sports, setSports] = useState([])
  const [dates, setDates]   = useState([])
  const [zones, setZones]   = useState([])

  // Events
  const [events, setEvents]   = useState([])
  const [loading, setLoading] = useState(false)

  // Filters
  const [filters, setFilters] = useState({
    selectedSports: [],
    date: '',
    zone: '',
    search: '',
  })

  // Sports sub-filter
  const [sportsSearch, setSportsSearch]   = useState('')
  const [showAllSports, setShowAllSports] = useState(false)

  // Debounce refs
  const fetchDebounceRef = useRef(null)

  // Load reference data on mount
  useEffect(() => {
    Promise.all([api.getSports(), api.getDates(), api.getZones()])
      .then(([s, d, z]) => {
        setSports(s ?? [])
        setDates(d ?? [])
        setZones(z ?? [])
      })
      .catch(err => console.error('Failed to load reference data:', err))
  }, [])

  // Initial event fetch after reference data is ready (also handles filter changes)
  useEffect(() => {
    if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current)

    fetchDebounceRef.current = setTimeout(() => {
      fetchEvents(filters)
    }, 300)

    return () => clearTimeout(fetchDebounceRef.current)
  }, [filters]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchEvents(f) {
    setLoading(true)
    try {
      const params = {
        sports: f.selectedSports,
        date: f.date,
        zone: f.zone,
        search: f.search,
      }
      const data = await api.getEvents(params)
      setEvents(data ?? [])
    } catch (err) {
      console.error('Failed to fetch events:', err)
    } finally {
      setLoading(false)
    }
  }

  function clearFilters() {
    setFilters({ selectedSports: [], date: '', zone: '', search: '' })
    setSportsSearch('')
  }

  function toggleSport(sport) {
    setFilters(prev => ({
      ...prev,
      selectedSports: prev.selectedSports.includes(sport)
        ? prev.selectedSports.filter(s => s !== sport)
        : [...prev.selectedSports, sport],
    }))
  }

  // Derive the visible sports list
  const filteredSports = sports.filter(s =>
    s.toLowerCase().includes(sportsSearch.toLowerCase())
  )
  const visibleSports = showAllSports ? filteredSports : filteredSports.slice(0, 15)

  // Partition fetched zones into LA and non-LA groups
  const laZones   = LA_ZONES.filter(z => zones.includes(z))
  const otherZones = zones.filter(z => !LA_ZONES_SET.has(z))

  return (
    <div className="flex gap-6 items-start">
      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-72 shrink-0 bg-white rounded-xl shadow-sm border border-slate-200 p-4 self-start sticky top-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Filters</h2>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search events…"
            value={filters.search}
            onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
          />
        </div>

        <div className="border-t border-slate-100 mb-4" />

        {/* Date */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
          <select
            value={filters.date}
            onChange={e => setFilters(prev => ({ ...prev, date: e.target.value }))}
            className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 bg-white"
          >
            <option value="">All dates</option>
            {dates.map(d => (
              <option key={d.date} value={d.date}>
                Day {d.games_day} · {d.date}
              </option>
            ))}
          </select>
        </div>

        {/* Zone */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1">Zone</label>
          <select
            value={filters.zone}
            onChange={e => setFilters(prev => ({ ...prev, zone: e.target.value }))}
            className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 bg-white"
          >
            <option value="">All zones</option>
            <option value={LA_ALL_VALUE}>Los Angeles (All Zones)</option>
            <optgroup label="Los Angeles">
              {laZones.map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </optgroup>
            {otherZones.length > 0 && (
              <optgroup label="Other Venues">
                {otherZones.map(z => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        <div className="border-t border-slate-100 mb-4" />

        {/* Sports */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              Sports
              {filters.selectedSports.length > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-1.5 py-0.5 rounded-full leading-none">
                  {filters.selectedSports.length}
                </span>
              )}
            </span>
            {filters.selectedSports.length > 0 && (
              <button
                onClick={() => setFilters(prev => ({ ...prev, selectedSports: [] }))}
                className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sports search */}
          <input
            type="text"
            placeholder="Search sports…"
            value={sportsSearch}
            onChange={e => setSportsSearch(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
          />

          {/* Scrollable sports list */}
          <div className="max-h-64 overflow-y-auto space-y-0.5">
            {visibleSports.length === 0 ? (
              <p className="text-xs text-slate-400 px-1 py-1">No sports match your search.</p>
            ) : (
              visibleSports.map(sport => (
                <label
                  key={sport}
                  className="flex items-center gap-2 py-1 cursor-pointer hover:bg-slate-50 px-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={filters.selectedSports.includes(sport)}
                    onChange={() => toggleSport(sport)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-300 focus:ring-offset-0 cursor-pointer"
                  />
                  <span
                    className={`w-2 h-2 rounded-full inline-block shrink-0 ${sportColor(sport).split(' ')[0]}`}
                  />
                  <span className="text-sm text-slate-700 truncate">{sport}</span>
                </label>
              ))
            )}
          </div>

          {/* Show more / less toggle */}
          {filteredSports.length > 15 && (
            <button
              onClick={() => setShowAllSports(prev => !prev)}
              className="mt-2 text-xs text-blue-500 hover:text-blue-700 transition-colors"
            >
              {showAllSports
                ? 'Show fewer'
                : `Show all ${filteredSports.length} sports`}
            </button>
          )}
        </div>
      </aside>

      {/* ── RIGHT CONTENT ── */}
      <div className="flex-1 min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">
            Showing <span className="font-medium text-slate-700">{events.length}</span> event{events.length !== 1 ? 's' : ''}
          </p>
          {activePlan ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
              Adding to: {activePlan.name}
            </span>
          ) : (
            <span className="text-xs text-slate-400">
              No plan selected — go to the Plans tab to create or select one
            </span>
          )}
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-slate-200 rounded-xl h-48" />
            ))}
          </div>
        ) : events.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-slate-500 text-sm mb-3">No events found for the current filters.</p>
            <button
              onClick={clearFilters}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-4 py-2 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          /* Events grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
