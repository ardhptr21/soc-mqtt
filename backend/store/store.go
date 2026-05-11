package store

import (
	"sort"
	"strings"
	"sync"
	"time"

	"soc-mqtt-simulator/backend/models"
)

type Store struct {
	mu        sync.RWMutex
	limit     int
	events    []models.SecurityEvent
	agents    map[string]models.AgentStatus
	blacklist map[string]models.BlacklistEntry
}

func New(limit int) *Store {
	return &Store{
		limit:     limit,
		events:    make([]models.SecurityEvent, 0, limit),
		agents:    map[string]models.AgentStatus{},
		blacklist: map[string]models.BlacklistEntry{},
	}
}

func (s *Store) AddEvent(event models.SecurityEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.events = append([]models.SecurityEvent{event}, s.events...)
	if len(s.events) > s.limit {
		s.events = s.events[:s.limit]
	}
}

func (s *Store) Events(severity string, limit int) []models.SecurityEvent {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if limit <= 0 || limit > len(s.events) {
		limit = len(s.events)
	}

	events := make([]models.SecurityEvent, 0, limit)
	for _, event := range s.events {
		if severity != "" && strings.ToLower(string(event.Severity)) != strings.ToLower(severity) {
			continue
		}
		events = append(events, event)
		if len(events) >= limit {
			break
		}
	}
	return events
}

func (s *Store) SetAgentStatus(name, status string) models.AgentStatus {
	s.mu.Lock()
	defer s.mu.Unlock()

	agent := models.AgentStatus{Name: name, Status: status, LastSeen: time.Now().UTC()}
	s.agents[name] = agent
	return agent
}

func (s *Store) GetAgent(name string) (models.AgentStatus, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	agent, ok := s.agents[name]
	return agent, ok
}

func (s *Store) Agents() []models.AgentStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()

	agents := make([]models.AgentStatus, 0, len(s.agents))
	for _, agent := range s.agents {
		agents = append(agents, agent)
	}
	sort.Slice(agents, func(i, j int) bool {
		return agents[i].Name < agents[j].Name
	})
	return agents
}

func (s *Store) AddBlacklist(entry models.BlacklistEntry) models.BlacklistEntry {
	s.mu.Lock()
	defer s.mu.Unlock()

	if entry.BlockedAt.IsZero() {
		entry.BlockedAt = time.Now().UTC()
	}
	if entry.BlockedBy == "" {
		entry.BlockedBy = "manual"
	}
	s.blacklist[entry.IP] = entry
	return entry
}

func (s *Store) RemoveBlacklist(ip string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.blacklist[ip]; !ok {
		return false
	}
	delete(s.blacklist, ip)
	return true
}

func (s *Store) Blacklist() []models.BlacklistEntry {
	s.mu.RLock()
	defer s.mu.RUnlock()

	entries := make([]models.BlacklistEntry, 0, len(s.blacklist))
	for _, entry := range s.blacklist {
		entries = append(entries, entry)
	}
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].BlockedAt.After(entries[j].BlockedAt)
	})
	return entries
}

func (s *Store) Stats() models.Stats {
	s.mu.RLock()
	defer s.mu.RUnlock()

	bySeverity := map[string]int{
		string(models.Low):      0,
		string(models.Medium):   0,
		string(models.High):     0,
		string(models.Critical): 0,
	}
	byType := map[string]int{}
	perMinute := map[time.Time]int{}

	for _, event := range s.events {
		bySeverity[string(event.Severity)]++
		byType[string(event.Type)]++
		minute := event.Timestamp.UTC().Truncate(time.Minute)
		perMinute[minute]++
	}

	points := make([]models.TimePoint, 0, len(perMinute))
	for t, count := range perMinute {
		points = append(points, models.TimePoint{Time: t, Count: count})
	}
	sort.Slice(points, func(i, j int) bool {
		return points[i].Time.Before(points[j].Time)
	})

	return models.Stats{
		TotalEvents:  len(s.events),
		BySeverity:   bySeverity,
		ByType:       byType,
		BlockedIPs:   len(s.blacklist),
		EventsPerMin: points,
	}
}
