package publishers

import (
	"context"
	"log"

	"soc-mqtt-simulator/backend/config"
	"soc-mqtt-simulator/backend/models"
	socmqtt "soc-mqtt-simulator/backend/mqtt"
)

func StartIDS(ctx context.Context, brokerURL string, sim *Simulator, cfg config.Config) error {
	agent := Agent{
		Name:        "ids",
		ClientID:    "publisher-ids-agent",
		StatusTopic: socmqtt.TopicIDSStatus,
		BrokerURL:   brokerURL,
	}
	client, err := agent.connect(cfg)
	if err != nil {
		return err
	}
	go client.Wait(ctx)

	go func() {
		log.Printf("[publisher:ids] started")
		profile := sim.Profile()
		for sim.Delay(ctx, 2, 5) {
			if sim.Chance(profile.AlertChance) {
				threats := []struct {
					t           models.EventType
					description string
				}{
					{models.DDoS, "Critical DDoS pattern detected by IDS"},
					{models.ARPSpoof, "ARP spoofing anomaly detected"},
					{models.PortScan, "High volume port scan detected"},
				}
				threat := threats[randIntn(len(threats))]
				severity := models.High
				if threat.t == models.DDoS && sim.Chance(profile.CriticalThreatChance) {
					severity = models.Critical
				}
				publishEvent(client, socmqtt.TopicIDSAlert, socmqtt.QoSExactlyOnce, true, EventPayload{
					Type:        threat.t,
					Severity:    severity,
					SourceIP:    randomIP(),
					DestIP:      randomPrivateIP(),
					Port:        randomPort(),
					Description: threat.description,
					Agent:       "ids",
				})
				continue
			}

			publishEvent(client, socmqtt.TopicIDSTraffic, socmqtt.QoSAtMostOnce, false, EventPayload{
				Type:        models.Traffic,
				Severity:    models.Low,
				SourceIP:    randomIP(),
				DestIP:      randomPrivateIP(),
				Port:        randomPort(),
				Description: "IDS observed normal traffic flow",
				Agent:       "ids",
				BytesIn:     randIntn(20000) + 500,
				BytesOut:    randIntn(12000) + 300,
			})
		}
	}()

	return nil
}
