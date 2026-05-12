package subscribers

import (
	"context"
	"log"

	"github.com/eclipse/paho.golang/paho"
	"github.com/google/uuid"

	"soc-mqtt-simulator/backend/api"
	"soc-mqtt-simulator/backend/models"
	socmqtt "soc-mqtt-simulator/backend/mqtt"
	"soc-mqtt-simulator/backend/store"
)

func StartIncidentBot(ctx context.Context, brokerURL string, sharedGroup string, store *store.Store, hub *api.Hub) error {
	client, err := socmqtt.NewClient(socmqtt.Options{
		BrokerURL:     brokerURL,
		ClientID:      "incident-response-bot",
		CleanSession:  true,
		AutoReconnect: true,
	})
	if err != nil {
		return err
	}

	handler := func(pr paho.PublishReceived) error {
		// Access the publish packet
		publish := pr.Packet

		event, ok := parseEvent(publish.Topic, publish.QoS, publish.Payload)
		if !ok {
			return nil
		}
		if event.SourceIP == "" || (event.Severity != models.Critical && event.Severity != models.High) {
			return nil
		}

		entry := store.AddBlacklist(models.BlacklistEntry{
			IP:        event.SourceIP,
			Reason:    event.Description,
			BlockedBy: "incident_bot",
		})
		hub.Broadcast(models.WSMessage{Type: "ip_blocked", Payload: entry})

		blockEvent := models.SecurityEvent{
			ID:          uuid.NewString(),
			Timestamp:   entry.BlockedAt,
			Type:        models.Response,
			Severity:    models.High,
			SourceIP:    event.SourceIP,
			Description: "Incident bot published block command",
			Topic:       socmqtt.TopicResponseBlock,
			QoS:         socmqtt.QoSExactlyOnce,
			Agent:       "incident_bot",
			Raw:         event.Raw,
		}
		store.AddEvent(blockEvent)
		hub.Broadcast(models.WSMessage{Type: "new_event", Payload: blockEvent})

		if err := client.Publish(socmqtt.TopicResponseBlock, socmqtt.QoSExactlyOnce, false, entry); err != nil {
			log.Printf("[incident_bot] failed publish block command: %v", err)
			return err
		}
		log.Printf("[incident_bot] blocked %s because %s", entry.IP, entry.Reason)
		return nil
	}
	/*
		SHARED SUBSCRIPTIONS
	*/topic := socmqtt.TopicAllAlerts
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
