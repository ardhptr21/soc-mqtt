package publishers

import (
	"context"
	"log"
	"math/rand"

	"soc-mqtt-simulator/backend/models"
	socmqtt "soc-mqtt-simulator/backend/mqtt"
)

func StartFirewall(ctx context.Context, brokerURL string) error {
	agent := Agent{
		Name:        "firewall",
		ClientID:    "publisher-firewall-agent",
		StatusTopic: socmqtt.TopicFirewallStatus,
		BrokerURL:   brokerURL,
	}
	client, err := agent.connect()
	if err != nil {
		return err
	}
	go client.Wait(ctx)

	go func() {
		log.Printf("[publisher:firewall] started")
		for randomInterval(ctx, 1, 3) {
			blocked := rand.Intn(100) < 25
			action := "ALLOW"
			severity := models.Low
			eventType := models.Firewall
			description := "Firewall allowed network connection"
			topic := socmqtt.TopicFirewallLogs
			qos := socmqtt.QoSAtMostOnce

			if blocked {
				action = "BLOCK"
				severity = models.High
				eventType = models.PortScan
				description = "Firewall blocked suspicious connection attempt"
				topic = socmqtt.TopicFirewallBlocked
				qos = socmqtt.QoSAtLeastOnce
			}

			publishEvent(client, topic, qos, false, EventPayload{
				Type:        eventType,
				Severity:    severity,
				SourceIP:    randomIP(),
				DestIP:      randomPrivateIP(),
				Port:        randomPort(),
				Description: description,
				Agent:       "firewall",
				Action:      action,
				Protocol:    []string{"TCP", "UDP"}[rand.Intn(2)],
			})
		}
	}()

	return nil
}
