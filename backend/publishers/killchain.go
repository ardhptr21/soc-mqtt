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

// KillChainStage represents a MITRE ATT&CK stage.
type KillChainStage struct {
	Name        string
	Description string
	Agent       string
	Type        models.EventType
	Severity    models.Severity
	Topic       string
	QoS         byte
	Port        int
	DelayAfter  time.Duration
}

var killChainStages = []KillChainStage{
	{
		Name:        "reconnaissance",
		Description: "External port scan targeting perimeter hosts",
		Agent:       "ids",
		Type:        models.PortScan,
		Severity:    models.Low,
		Topic:       socmqtt.TopicIDSTraffic,
		QoS:         socmqtt.QoSAtMostOnce,
		Port:        0,
		DelayAfter:  3 * time.Second,
	},
	{
		Name:        "initial_access",
		Description: "SSH brute-force succeeded from external host",
		Agent:       "host",
		Type:        models.BruteForce,
		Severity:    models.High,
		Topic:       socmqtt.TopicIDSAlert,
		QoS:         socmqtt.QoSAtLeastOnce,
		Port:        22,
		DelayAfter:  2 * time.Second,
	},
	{
		Name:        "execution",
		Description: "Malicious payload dropped and executed via reverse shell",
		Agent:       "edr",
		Type:        models.Malware,
		Severity:    models.High,
		Topic:       socmqtt.TopicEDRAlert,
		QoS:         socmqtt.QoSAtLeastOnce,
		Port:        4444,
		DelayAfter:  2 * time.Second,
	},
	{
		Name:        "persistence",
		Description: "Crontab modified with backdoor persistence mechanism",
		Agent:       "host",
		Type:        models.EDRAlert,
		Severity:    models.High,
		Topic:       socmqtt.TopicEDRAlert,
		QoS:         socmqtt.QoSAtLeastOnce,
		Port:        0,
		DelayAfter:  2 * time.Second,
	},
	{
		Name:        "lateral_movement",
		Description: "Internal ARP spoofing detected — lateral movement attempt",
		Agent:       "ids",
		Type:        models.ARPSpoof,
		Severity:    models.High,
		Topic:       socmqtt.TopicIDSAlert,
		QoS:         socmqtt.QoSExactlyOnce,
		Port:        445,
		DelayAfter:  3 * time.Second,
	},
	{
		Name:        "command_and_control",
		Description: "DNS tunneling C2 beacon to external domain",
		Agent:       "dns",
		Type:        models.DNSAnomaly,
		Severity:    models.Critical,
		Topic:       socmqtt.TopicDNSQuery,
		QoS:         socmqtt.QoSAtLeastOnce,
		Port:        53,
		DelayAfter:  2 * time.Second,
	},
	{
		Name:        "exfiltration",
		Description: "Large outbound data transfer to suspicious external IP",
		Agent:       "firewall",
		Type:        models.Traffic,
		Severity:    models.Critical,
		Topic:       socmqtt.TopicFirewallBlocked,
		QoS:         socmqtt.QoSExactlyOnce,
		Port:        443,
		DelayAfter:  0,
	},
}

// StartKillChain runs a single kill-chain attack sequence, then stops.
// It can be triggered via API on demand.
func StartKillChain(ctx context.Context, brokerURL string, sim *Simulator, cfg config.Config) error {
	client, err := socmqtt.NewClient(socmqtt.Options{
		BrokerURL:                brokerURL,
		ClientID:                 "publisher-killchain",
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

	chainID := uuid.NewString()
	attackerIP := randomIP()
	targetIP := randomPrivateIP()

	go func() {
		log.Printf("[publisher:killchain] started chain=%s", chainID[:8])

		for i, stage := range killChainStages {
			select {
			case <-ctx.Done():
				return
			default:
			}

			destIP := targetIP
			sourceIP := attackerIP
			if stage.Name == "lateral_movement" {
				sourceIP = targetIP
				destIP = randomPrivateIP()
			}
			if stage.Name == "exfiltration" {
				sourceIP = targetIP
				destIP = randomIP()
			}

			hostname := fmt.Sprintf("target-%02d", randIntn(5)+1)

			publishEvent(client, stage.Topic, stage.QoS, false, EventPayload{
				ID:          fmt.Sprintf("%s-stage-%d", chainID, i),
				Type:        stage.Type,
				Severity:    stage.Severity,
				SourceIP:    sourceIP,
				DestIP:      destIP,
				Port:        stage.Port,
				Description: fmt.Sprintf("[%s] %s", stage.Name, stage.Description),
				Agent:       stage.Agent,
				Hostname:    hostname,
			})

			if stage.DelayAfter > 0 {
				if !sleepCtx(ctx, stage.DelayAfter) {
					return
				}
			}
		}
		log.Printf("[publisher:killchain] completed chain=%s", chainID[:8])
	}()

	return nil
}
