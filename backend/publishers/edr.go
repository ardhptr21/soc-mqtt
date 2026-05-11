package publishers

import (
	"context"
	"log"

	"soc-mqtt-simulator/backend/models"
	socmqtt "soc-mqtt-simulator/backend/mqtt"
)

func StartEDR(ctx context.Context, brokerURL string, sim *Simulator) error {
	agent := Agent{
		Name:        "edr",
		ClientID:    "publisher-edr-agent",
		StatusTopic: socmqtt.TopicEDRStatus,
		BrokerURL:   brokerURL,
	}
	client, err := agent.connect()
	if err != nil {
		return err
	}
	go client.Wait(ctx)

	go func() {
		log.Printf("[publisher:edr] started")
		profile := sim.Profile()
		hosts := []string{"server-01", "server-02", "workstation-01"}
		processes := []string{"powershell -enc ...", "cmd.exe /c whoami", "svchost.exe", "rundll32.exe"}
		actions := []string{"monitor", "quarantine", "terminate"}

		for sim.Delay(ctx, 3, 6) {
			host := hosts[randIntn(len(hosts))]
			process := processes[randIntn(len(processes))]
			action := actions[randIntn(len(actions))]
			severity := models.Medium
			description := "EDR detected suspicious activity"
			if sim.Chance(profile.MalwareChance) {
				severity = models.High
				description = "EDR blocked high-risk process"
			}

			publishEvent(client, socmqtt.TopicEDRAlert, socmqtt.QoSAtLeastOnce, false, EventPayload{
				Type:        models.EDRAlert,
				Severity:    severity,
				SourceIP:    randomPrivateIP(),
				DestIP:      randomIP(),
				Port:        0,
				Description: description,
				Agent:       "edr",
				Hostname:    host,
				Process:     process,
				Action:      action,
			})
		}
	}()

	return nil
}
