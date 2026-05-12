package subscribers

import (
	"context"
	"log"

	"github.com/eclipse/paho.golang/paho"

	"soc-mqtt-simulator/backend/api"
	"soc-mqtt-simulator/backend/models"
	socmqtt "soc-mqtt-simulator/backend/mqtt"
	"soc-mqtt-simulator/backend/store"
)

func StartSOCDashboard(ctx context.Context, brokerURL string, sharedGroup string, store *store.Store, hub *api.Hub) error {
	client, err := socmqtt.NewClient(socmqtt.Options{
		BrokerURL:     brokerURL,
		ClientID:      "soc-dashboard-subscriber",
		CleanSession:  false,
		AutoReconnect: true,
	})
	if err != nil {
		return err
	}

	handler := func(pr paho.PublishReceived) error {
		// Access the publish packet
		publish := pr.Packet
		topic := publish.Topic
		payload := publish.Payload

		if name, status, ok := parseAgentStatus(topic, payload); ok {
			agent := store.SetAgentStatus(name, status)
			hub.Broadcast(models.WSMessage{Type: "agent_status", Payload: agent})
			log.Printf("[subscriber:dashboard] agent %s %s", name, status)
			return nil
		}

		event, ok := parseEvent(topic, publish.QoS, payload)
		if !ok {
			log.Printf("[subscriber:dashboard] ignored non-event topic=%s payload=%s", topic, string(payload))
			return nil
		}

		// Chaos engineering: if agent is explicitly offline, drop the event
		if agent, exists := store.GetAgent(event.Agent); exists && agent.Status == "offline" {
			return nil
		}

		store.AddEvent(event)
		hub.Broadcast(models.WSMessage{Type: "new_event", Payload: event})
		log.Printf("[subscriber:dashboard] %s %s %s", event.Severity, event.Type, event.SourceIP)
		return nil
	}

	topic := socmqtt.TopicSecurityAll
	if sharedGroup != "" {
		topic = "$share/" + sharedGroup + "/" + topic
	}
	if err := client.Subscribe(topic, socmqtt.QoSExactlyOnce, handler); err != nil {
		client.Disconnect()
		return err
	}

	go client.Wait(ctx)
	return nil
}
