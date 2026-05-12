package publishers

import (
	"context"
	"fmt"
	"log"

	"soc-mqtt-simulator/backend/config"
	"soc-mqtt-simulator/backend/models"
	socmqtt "soc-mqtt-simulator/backend/mqtt"
)

// StartInsiderThreat generates events that mimic legitimate user activity with
// subtle anomalies — off-hours access, unusual data volumes, privilege escalation.
func StartInsiderThreat(ctx context.Context, brokerURL string, sim *Simulator, cfg config.Config) error {
	client, err := socmqtt.NewClient(socmqtt.Options{
		BrokerURL:     brokerURL,
		ClientID:      "publisher-insider",
		CleanSession:  true,
		AutoReconnect: true,
	})
	if err != nil {
		return err
	}
	go client.Wait(ctx)

	go func() {
		log.Printf("[publisher:insider] started")
		profile := sim.Profile()
		insiderIP := fmt.Sprintf("192.168.1.%d", randIntn(50)+100)
		username := []string{"jsmith", "admin.backup", "svc_report", "m.chen"}[randIntn(4)]

		for sim.Delay(ctx, 8, 18) {
			if !sim.Chance(profile.AlertChance * 0.6) {
				continue
			}

			anomalies := []struct {
				description string
				eventType   models.EventType
				severity    models.Severity
				port        int
				bytesOut    int
			}{
				{
					description: fmt.Sprintf("User '%s' accessed file share outside business hours", username),
					eventType:   models.Traffic,
					severity:    models.Low,
					port:        445,
					bytesOut:    randIntn(5000) + 200,
				},
				{
					description: fmt.Sprintf("User '%s' bulk downloaded 2.3GB from document server", username),
					eventType:   models.Traffic,
					severity:    models.Medium,
					port:        443,
					bytesOut:    randIntn(500000) + 100000,
				},
				{
					description: fmt.Sprintf("Privilege escalation — '%s' added to Domain Admins group", username),
					eventType:   models.EDRAlert,
					severity:    models.High,
					port:        389,
					bytesOut:    0,
				},
				{
					description: fmt.Sprintf("DNS tunneling from user '%s' workstation to personal domain", username),
					eventType:   models.DNSAnomaly,
					severity:    models.Medium,
					port:        53,
					bytesOut:    randIntn(8000) + 1000,
				},
				{
					description: fmt.Sprintf("User '%s' accessed database backup outside maintenance window", username),
					eventType:   models.Traffic,
					severity:    models.Medium,
					port:        3306,
					bytesOut:    randIntn(200000) + 50000,
				},
			}

			pick := anomalies[randIntn(len(anomalies))]

			topic := socmqtt.TopicIDSTraffic
			if pick.severity == models.High {
				topic = socmqtt.TopicEDRAlert
			} else if pick.eventType == models.DNSAnomaly {
				topic = socmqtt.TopicDNSQuery
			}

			publishEvent(client, topic, socmqtt.QoSAtLeastOnce, false, EventPayload{
				Type:        pick.eventType,
				Severity:    pick.severity,
				SourceIP:    insiderIP,
				DestIP:      randomPrivateIP(),
				Port:        pick.port,
				Description: pick.description,
				Agent:       "host",
				Hostname:    fmt.Sprintf("ws-%s", username),
				BytesOut:    pick.bytesOut,
			})
		}
	}()

	return nil
}
