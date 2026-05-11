import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  addBlacklist,
  getAgents,
  getBlacklist,
  getEvents,
  getStats,
  removeBlacklist,
} from '../lib/api'
import type { AgentStatus, BlacklistEntry, SecurityEvent, Severity, Stats, WSMessage } from '../lib/types'
import { useWebSocket } from './useWebSocket'

const emptyStats: Stats = {
  total_events: 0,
  by_severity: {},
  by_type: {},
  blocked_ips: 0,
  events_per_min: [],
}

export function useEvents() {
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [stats, setStats] = useState<Stats>(emptyStats)
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([])
  const [filter, setFilter] = useState<Severity | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastCritical, setLastCritical] = useState<SecurityEvent | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError('')
      const [eventsData, statsData, agentsData, blacklistData] = await Promise.all([
        getEvents(filter === 'all' ? '' : filter),
        getStats(),
        getAgents(),
        getBlacklist(),
      ])
      setEvents(eventsData)
      setStats(statsData)
      setAgents(agentsData)
      setBlacklist(blacklistData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SOC data')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleMessage = useCallback(
    (message: WSMessage) => {
      if (message.type === 'new_event') {
        const event = message.payload
        setEvents((current) => {
          if (filter !== 'all' && event.severity !== filter) {
            return current
          }
          return [event, ...current.filter((item) => item.id !== event.id)].slice(0, 150)
        })
        setStats((current) => ({
          ...current,
          total_events: current.total_events + 1,
          by_severity: {
            ...current.by_severity,
            [event.severity]: (current.by_severity[event.severity] ?? 0) + 1,
          },
          by_type: {
            ...current.by_type,
            [event.type]: (current.by_type[event.type] ?? 0) + 1,
          },
        }))
        if (event.severity === 'critical') {
          setLastCritical(event)
        }
      }

      if (message.type === 'agent_status') {
        setAgents((current) => {
          const rest = current.filter((agent) => agent.name !== message.payload.name)
          return [...rest, message.payload].sort((a, b) => a.name.localeCompare(b.name))
        })
      }

      if (message.type === 'ip_blocked') {
        setBlacklist((current) => [
          message.payload,
          ...current.filter((entry) => entry.ip !== message.payload.ip),
        ])
        setStats((current) => ({
          ...current,
          blocked_ips: Math.max(current.blocked_ips, blacklist.length + 1),
        }))
      }
    },
    [blacklist.length, filter],
  )

  const socketStatus = useWebSocket(handleMessage)

  const onlineAgents = useMemo(
    () => agents.filter((agent) => agent.status === 'online').length,
    [agents],
  )

  const addManualBlock = useCallback(async (ip: string, reason: string) => {
    const entry = await addBlacklist(ip, reason)
    setBlacklist((current) => [entry, ...current.filter((item) => item.ip !== entry.ip)])
    setStats((current) => ({ ...current, blocked_ips: current.blocked_ips + 1 }))
  }, [])

  const deleteBlock = useCallback(async (ip: string) => {
    await removeBlacklist(ip)
    setBlacklist((current) => current.filter((entry) => entry.ip !== ip))
    setStats((current) => ({ ...current, blocked_ips: Math.max(0, current.blocked_ips - 1) }))
  }, [])

  return {
    events,
    stats,
    agents,
    blacklist,
    filter,
    loading,
    error,
    socketStatus,
    onlineAgents,
    lastCritical,
    setFilter,
    refresh,
    addManualBlock,
    deleteBlock,
  }
}
