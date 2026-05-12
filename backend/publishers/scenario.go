package publishers

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"

	"soc-mqtt-simulator/backend/config"
	"soc-mqtt-simulator/backend/models"
	socmqtt "soc-mqtt-simulator/backend/mqtt"
)

func StartScenarioCoordinator(ctx context.Context, brokerURL string, sim *Simulator, cfg config.Config) error {
	client, err := socmqtt.NewClient(socmqtt.Options{
		BrokerURL:                brokerURL,
		ClientID:                 "publisher-scenario-coordinator",
		CleanSession:             true,
		AutoReconnect:            true,
		PublishRatePerS:          cfg.PublishRatePerSecond,
		PublishTimeoutMs:         cfg.PublishTimeoutMs,
		DefaultMessageExpirySecs: cfg.MessageExpirySecs,
		DefaultTopicAlias: func() int {
			if cfg.EnableTopicAlias {
				return cfg.TopicAlias
			}
			return 0
		}(),
	})
	if err != nil {
		return err
	}
	go client.Wait(ctx)

	go func() {
		log.Printf("[publisher:scenario] started")
		profile := sim.Profile()

		for sim.Delay(ctx, 12, 22) {
			if !sim.Chance(profile.AlertChance) {
				continue
			}

			source := randomIP()
			host := fmt.Sprintf("workstation-%02d", randIntn(10)+1)
			incidentID := uuid.NewString()

			publishEvent(client, socmqtt.TopicDNSQuery, socmqtt.QoSAtMostOnce, false, EventPayload{
				ID:          incidentID,
				Type:        models.DNSAnomaly,
				Severity:    models.Medium,
				SourceIP:    source,
				DestIP:      "8.8.8.8",
				Port:        53,
				Description: "Suspicious DNS beacon detected",
				Agent:       "dns",
				Hostname:    host,
				Payload:     "beacon-control.cn",
			})
			if !sleepCtx(ctx, 700*time.Millisecond) {
				return
			}

			publishEvent(client, fmt.Sprintf(socmqtt.TopicHostAuthPattern, host), socmqtt.QoSAtLeastOnce, false, EventPayload{
				ID:          incidentID,
				Type:        models.BruteForce,
				Severity:    models.Medium,
				SourceIP:    source,
				DestIP:      randomPrivateIP(),
				Port:        22,
				Description: "Credential stuffing detected on host",
				Agent:       "host",
				Hostname:    host,
			})
			if !sleepCtx(ctx, 800*time.Millisecond) {
				return
			}

			publishEvent(client, socmqtt.TopicEDRAlert, socmqtt.QoSAtLeastOnce, false, EventPayload{
				ID:          incidentID,
				Type:        models.EDRAlert,
				Severity:    models.High,
				SourceIP:    randomPrivateIP(),
				DestIP:      source,
				Port:        0,
				Description: "EDR flagged malicious execution chain",
				Agent:       "edr",
				Hostname:    host,
				Process:     "powershell -enc ...",
				Action:      "quarantine",
			})
			if !sleepCtx(ctx, 900*time.Millisecond) {
				return
			}

			severity := models.High
			if sim.Chance(profile.CriticalThreatChance) {
				severity = models.Critical
			}
			publishEvent(client, socmqtt.TopicIDSAlert, socmqtt.QoSExactlyOnce, true, EventPayload{
				ID:          incidentID,
				Type:        models.DDoS,
				Severity:    severity,
				SourceIP:    source,
				DestIP:      randomPrivateIP(),
				Port:        randomPort(),
				Description: "Coordinated attack pattern detected",
				Agent:       "ids",
			})
		}
	}()

	return nil
}

func sleepCtx(ctx context.Context, delay time.Duration) bool {
	timer := time.NewTimer(delay)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-timer.C:
		return true
	}
}
