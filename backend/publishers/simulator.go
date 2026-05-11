package publishers

import (
	"context"
	"math"
	"math/rand"
	"strings"
	"sync"
	"time"
)

type ScenarioProfile struct {
	Name                 string
	AlertChance          float64
	BlockChance          float64
	AuthBurstChance      float64
	MalwareChance        float64
	DNSAnomalyChance     float64
	CriticalThreatChance float64
}

type Simulator struct {
	mu             sync.Mutex
	rand           *rand.Rand
	profile        ScenarioProfile
	rateMultiplier float64
	burstChance    float64
	burstMin       time.Duration
	burstMax       time.Duration
	burstUntil     time.Time
}

func NewSimulator(seed int64, scenario string, rateMultiplier, burstChance float64, burstMinSec, burstMaxSec int) *Simulator {
	return &Simulator{
		rand:           rand.New(rand.NewSource(seed)),
		profile:        scenarioProfile(scenario),
		rateMultiplier: clampFloat(rateMultiplier, 0.2, 5.0),
		burstChance:    clampFloat(burstChance, 0.0, 0.8),
		burstMin:       time.Duration(maxInt(5, burstMinSec)) * time.Second,
		burstMax:       time.Duration(maxInt(burstMinSec, burstMaxSec)) * time.Second,
	}
}

func (s *Simulator) Delay(ctx context.Context, minSeconds, maxSeconds int) bool {
	minSeconds = maxInt(1, minSeconds)
	maxSeconds = maxInt(minSeconds, maxSeconds)

	now := time.Now()
	if now.After(s.burstUntil) && s.float64() < s.burstChance {
		burstWindow := s.burstMin + time.Duration(s.int63n(int64(s.burstMax-s.burstMin)+1))
		s.burstUntil = now.Add(burstWindow)
	}

	multiplier := 1.0 / s.rateMultiplier
	if now.Before(s.burstUntil) {
		multiplier *= 0.35
	}

	minDelay := time.Duration(math.Round(float64(minSeconds)*multiplier)) * time.Second
	maxDelay := time.Duration(math.Round(float64(maxSeconds)*multiplier)) * time.Second
	if minDelay < time.Second {
		minDelay = time.Second
	}
	if maxDelay < minDelay {
		maxDelay = minDelay
	}

	delta := maxDelay - minDelay
	var wait time.Duration
	if delta == 0 {
		wait = minDelay
	} else {
		wait = minDelay + time.Duration(s.int63n(int64(delta)+1))
	}

	timer := time.NewTimer(wait)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-timer.C:
		return true
	}
}

func (s *Simulator) Chance(threshold float64) bool {
	return s.float64() < threshold
}

func (s *Simulator) Profile() ScenarioProfile {
	return s.profile
}

// SimSettings represents the tunable runtime parameters.
type SimSettings struct {
	Scenario       string  `json:"scenario"`
	RateMultiplier float64 `json:"rate_multiplier"`
	BurstChance    float64 `json:"burst_chance"`
}

func (s *Simulator) Settings() SimSettings {
	s.mu.Lock()
	defer s.mu.Unlock()
	return SimSettings{
		Scenario:       s.profile.Name,
		RateMultiplier: s.rateMultiplier,
		BurstChance:    s.burstChance,
	}
}

func (s *Simulator) SetSettings(settings SimSettings) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if settings.Scenario != "" {
		s.profile = scenarioProfile(settings.Scenario)
	}
	if settings.RateMultiplier > 0 {
		s.rateMultiplier = clampFloat(settings.RateMultiplier, 0.1, 10.0)
	}
	if settings.BurstChance >= 0 {
		s.burstChance = clampFloat(settings.BurstChance, 0.0, 0.8)
	}
}

func (s *Simulator) float64() float64 {
	s.mu.Lock()
	value := s.rand.Float64()
	s.mu.Unlock()
	return value
}

func (s *Simulator) int63n(n int64) int64 {
	s.mu.Lock()
	value := s.rand.Int63n(n)
	s.mu.Unlock()
	return value
}

func scenarioProfile(name string) ScenarioProfile {
	switch strings.ToLower(strings.TrimSpace(name)) {
	case "quiet":
		return ScenarioProfile{
			Name:                 "quiet",
			AlertChance:          0.08,
			BlockChance:          0.12,
			AuthBurstChance:      0.35,
			MalwareChance:        0.18,
			DNSAnomalyChance:     0.08,
			CriticalThreatChance: 0.1,
		}
	case "storm":
		return ScenarioProfile{
			Name:                 "storm",
			AlertChance:          0.35,
			BlockChance:          0.45,
			AuthBurstChance:      0.7,
			MalwareChance:        0.45,
			DNSAnomalyChance:     0.3,
			CriticalThreatChance: 0.35,
		}
	case "breach":
		return ScenarioProfile{
			Name:                 "breach",
			AlertChance:          0.28,
			BlockChance:          0.4,
			AuthBurstChance:      0.6,
			MalwareChance:        0.55,
			DNSAnomalyChance:     0.25,
			CriticalThreatChance: 0.45,
		}
	default:
		return ScenarioProfile{
			Name:                 "baseline",
			AlertChance:          0.2,
			BlockChance:          0.25,
			AuthBurstChance:      0.55,
			MalwareChance:        0.4,
			DNSAnomalyChance:     0.18,
			CriticalThreatChance: 0.2,
		}
	}
}

func clampFloat(value, min, max float64) float64 {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
