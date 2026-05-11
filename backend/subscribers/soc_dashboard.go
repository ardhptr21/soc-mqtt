package subscribers

import (
	"context"
	"log"

	paho "github.com/eclipse/paho.mqtt.golang"

	"soc-mqtt-simulator/backend/api"
	"soc-mqtt-simulator/backend/models"
	socmqtt "soc-mqtt-simulator/backend/mqtt"
	"soc-mqtt-simulator/backend/store"
)

func StartSOCDashboard(ctx context.Context, brokerURL string, store *store.Store, hub *api.Hub) error {
	client, err := socmqtt.NewClient(socmqtt.Options{
		BrokerURL:     brokerURL,
		ClientID:      "soc-dashboard-subscriber",
		CleanSession:  false,
		AutoReconnect: true,
	})
	if err != nil {
		return err
	}

	handler := func(_ paho.Client, msg paho.Message) {
		topic := msg.Topic()
		payload := msg.Payload()

		if name, status, ok := parseAgentStatus(topic, payload); ok {
			agent := store.SetAgentStatus(name, status)
			hub.Broadcast(models.WSMessage{Type: "agent_status", Payload: agent})
			log.Printf("[subscriber:dashboard] agent %s %s", name, status)
			return
		}

		event, ok := parseEvent(topic, msg.Qos(), payload)
		if !ok {
			log.Printf("[subscriber:dashboard] ignored non-event topic=%s payload=%s", topic, string(payload))
			return
		}

		// Chaos engineering: if agent is explicitly offline, drop the event
		if agent, exists := store.GetAgent(event.Agent); exists && agent.Status == "offline" {
			return
		}

		store.AddEvent(event)
		hub.Broadcast(models.WSMessage{Type: "new_event", Payload: event})
		log.Printf("[subscriber:dashboard] %s %s %s", event.Severity, event.Type, event.SourceIP)
	}

	if err := client.Subscribe(socmqtt.TopicSecurityAll, socmqtt.QoSExactlyOnce, handler); err != nil {
		client.Disconnect()
		return err
	}

	go client.Wait(ctx)
	return nil
}
