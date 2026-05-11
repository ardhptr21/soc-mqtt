package publishers

import (
	"context"
	"log"
	"math/rand"

	"soc-mqtt-simulator/backend/models"
	socmqtt "soc-mqtt-simulator/backend/mqtt"
)

func StartIDS(ctx context.Context, brokerURL string) error {
	agent := Agent{
		Name:        "ids",
		ClientID:    "publisher-ids-agent",
		StatusTopic: socmqtt.TopicIDSStatus,
		BrokerURL:   brokerURL,
	}
	client, err := agent.connect()
	if err != nil {
		return err
	}
	go client.Wait(ctx)

	go func() {
		log.Printf("[publisher:ids] started")
		for randomInterval(ctx, 2, 5) {
			if rand.Intn(100) < 20 {
				threats := []struct {
					t           models.EventType
					description string
				}{
					{models.DDoS, "Critical DDoS pattern detected by IDS"},
					{models.ARPSpoof, "ARP spoofing anomaly detected"},
					{models.PortScan, "High volume port scan detected"},
				}
				threat := threats[rand.Intn(len(threats))]
				severity := models.High
				if threat.t == models.DDoS {
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
				BytesIn:     rand.Intn(20000) + 500,
				BytesOut:    rand.Intn(12000) + 300,
			})
		}
	}()

	return nil
}
