import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api } from '../api'
import { useAuth } from './AuthContext'

const PlansContext = createContext(null)

export function PlansProvider({ children }) {
  const { user } = useAuth()

  const [plans, setPlans]             = useState([])
  const [activePlanId, setActivePlanId] = useState(null)
  const [planEvents, setPlanEvents]   = useState({})   // { [planId]: events[] }
  const [loading, setLoading]         = useState(false)

  const fetchPlans = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await api.getPlans()
      setPlans(data)
      // Auto-select first plan on initial load if none is active
      setActivePlanId(prev => {
        if (prev) return prev
        return data.length > 0 ? data[0].id : null
      })
    } catch (err) {
      console.error('Failed to fetch plans:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  const fetchPlanEvents = useCallback(async (planId) => {
    if (!user || !planId) return
    try {
      const data = await api.getPlanEvents(planId)
      setPlanEvents(prev => ({ ...prev, [planId]: data }))
    } catch (err) {
      console.error(`Failed to fetch events for plan ${planId}:`, err)
    }
  }, [user])

  // Load plans when user logs in; clear when user logs out
  useEffect(() => {
    if (user) {
      fetchPlans()
    } else {
      setPlans([])
      setActivePlanId(null)
      setPlanEvents({})
    }
  }, [user, fetchPlans])

  // Fetch events for the active plan whenever it changes
  useEffect(() => {
    if (activePlanId) {
      fetchPlanEvents(activePlanId)
    }
  }, [activePlanId, fetchPlanEvents])

  async function createPlan(name) {
    try {
      const newPlan = await api.createPlan(name)
      await fetchPlans()
      setActivePlanId(newPlan.id)
      return newPlan
    } catch (err) {
      console.error('Failed to create plan:', err)
      throw err
    }
  }

  async function deletePlan(id) {
    try {
      await api.deletePlan(id)
      setActivePlanId(prev => (prev === id ? null : prev))
      setPlanEvents(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      await fetchPlans()
    } catch (err) {
      console.error('Failed to delete plan:', err)
      throw err
    }
  }

  async function updatePlan(id, name) {
    try {
      await api.updatePlan(id, name)
      await fetchPlans()
    } catch (err) {
      console.error('Failed to update plan:', err)
      throw err
    }
  }

  async function addEvent(planId, eventId) {
    try {
      await api.addEventToPlan(planId, eventId)
      await fetchPlanEvents(planId)
    } catch (err) {
      console.error('Failed to add event to plan:', err)
      throw err
    }
  }

  async function removeEvent(planId, eventId) {
    try {
      await api.removeEventFromPlan(planId, eventId)
      await fetchPlanEvents(planId)
    } catch (err) {
      console.error('Failed to remove event from plan:', err)
      throw err
    }
  }

  async function updatePlanEvent(planId, eventId, updates) {
    try {
      await api.updatePlanEvent(planId, eventId, updates)
    } catch (err) {
      console.error('Failed to update plan event:', err)
      throw err
    }
  }

  function isEventInPlan(planId, eventId) {
    const events = planEvents[planId]
    if (!Array.isArray(events)) return false
    return events.some(e => e.id === eventId)
  }

  const activePlan = plans.find(p => p.id === activePlanId) ?? null

  return (
    <PlansContext.Provider
      value={{
        plans,
        activePlanId,
        setActivePlanId,
        activePlan,
        planEvents,
        loading,
        fetchPlans,
        fetchPlanEvents,
        createPlan,
        deletePlan,
        updatePlan,
        addEvent,
        removeEvent,
        updatePlanEvent,
        isEventInPlan,
      }}
    >
      {children}
    </PlansContext.Provider>
  )
}

export function usePlans() {
  const ctx = useContext(PlansContext)
  if (!ctx) throw new Error('usePlans must be used within a PlansProvider')
  return ctx
}
