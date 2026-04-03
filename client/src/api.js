const BASE_URL = '/api'

function getToken() {
  return localStorage.getItem('la28_token')
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const options = { method, headers }
  if (body !== undefined) {
    options.body = JSON.stringify(body)
  }

  const res = await fetch(`${BASE_URL}${path}`, options)

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`
    try {
      const data = await res.json()
      if (data.error) message = data.error
    } catch (_) {
      // ignore parse errors
    }
    throw new Error(message)
  }

  // 204 No Content or empty body
  const text = await res.text()
  if (!text) return null
  return JSON.parse(text)
}

export const api = {
  // Auth
  login(username, password) {
    return request('POST', '/auth/login', { username, password })
  },

  register(username, password) {
    return request('POST', '/auth/register', { username, password })
  },

  // Reference data
  getSports() {
    return request('GET', '/sports')
  },

  getDates() {
    return request('GET', '/dates')
  },

  getZones() {
    return request('GET', '/zones')
  },

  // Events
  getEvents(params = {}) {
    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined || value === '') continue
      if (key === 'sports' && Array.isArray(value)) {
        if (value.length > 0) {
          searchParams.set('sports', value.join(','))
        }
      } else {
        searchParams.set(key, value)
      }
    }
    const qs = searchParams.toString()
    return request('GET', `/events${qs ? `?${qs}` : ''}`)
  },

  // Plans
  getPlans() {
    return request('GET', '/plans')
  },

  createPlan(name) {
    return request('POST', '/plans', { name })
  },

  updatePlan(id, name) {
    return request('PUT', `/plans/${id}`, { name })
  },

  deletePlan(id) {
    return request('DELETE', `/plans/${id}`)
  },

  // Plan events
  getPlanEvents(planId) {
    return request('GET', `/plans/${planId}/events`)
  },

  addEventToPlan(planId, eventId) {
    return request('POST', `/plans/${planId}/events`, { event_id: eventId })
  },

  removeEventFromPlan(planId, eventId) {
    return request('DELETE', `/plans/${planId}/events/${eventId}`)
  },

  updatePlanEvent(planId, eventId, updates) {
    return request('PATCH', `/plans/${planId}/events/${eventId}`, updates)
  },
}
