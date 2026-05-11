package publishers

import (
	"context"
	"log"

	"soc-mqtt-simulator/backend/models"
	socmqtt "soc-mqtt-simulator/backend/mqtt"
)

func StartDNS(ctx context.Context, brokerURL string, sim *Simulator) error {
	agent := Agent{
		Name:        "dns",
		ClientID:    "publisher-dns-agent",
		StatusTopic: socmqtt.TopicDNSStatus,
		BrokerURL:   brokerURL,
	}
	client, err := agent.connect()
	if err != nil {
		return err
	}
	go client.Wait(ctx)

	go func() {
		log.Printf("[publisher:dns] started")
		profile := sim.Profile()
		domains := []string{
			"cdn.example.com",
			"login.example.com",
			"telemetry.example.net",
			"updates.example.org",
			"cloud-sync.example.com",
			"secure-mail.example.net",
		}
		suspicious := []string{
			"dga-axk92p.biz",
			"exfil.storage-example.ru",
			"fast-flux-02.info",
			"beacon-control.cn",
		}

		for sim.Delay(ctx, 1, 3) {
			isAnomaly := sim.Chance(profile.DNSAnomalyChance)
			domain := domains[randIntn(len(domains))]
			severity := models.Low
			description := "DNS query observed"
			eventType := models.Traffic
			if isAnomaly {
				domain = suspicious[randIntn(len(suspicious))]
				severity = models.Medium
				description = "DNS anomaly detected"
				eventType = models.DNSAnomaly
			}

			publishEvent(client, socmqtt.TopicDNSQuery, socmqtt.QoSAtMostOnce, false, EventPayload{
				Type:        eventType,
				Severity:    severity,
				SourceIP:    randomPrivateIP(),
				DestIP:      "8.8.8.8",
				Port:        53,
				Description: description,
				Agent:       "dns",
				Payload:     domain,
			})
		}
	}()

	return nil
}
