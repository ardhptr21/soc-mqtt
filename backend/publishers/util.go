package publishers

import (
	"fmt"
	"log"
	"math/rand"
	"strconv"
	"sync"
	"time"

	"github.com/google/uuid"

	"soc-mqtt-simulator/backend/config"
	"soc-mqtt-simulator/backend/models"
	socmqtt "soc-mqtt-simulator/backend/mqtt"
)

var (
	rngMu sync.Mutex
	rng   = rand.New(rand.NewSource(time.Now().UnixNano()))
)

type EventPayload struct {
	ID          string           `json:"id"`
	Timestamp   time.Time        `json:"timestamp"`
	Type        models.EventType `json:"type"`
	Severity    models.Severity  `json:"severity"`
	SourceIP    string           `json:"source_ip"`
	DestIP      string           `json:"dest_ip"`
	Port        int              `json:"port"`
	Description string           `json:"description"`
	Agent       string           `json:"agent"`
	Action      string           `json:"action,omitempty"`
	Protocol    string           `json:"protocol,omitempty"`
	Hostname    string           `json:"hostname,omitempty"`
	Process     string           `json:"process,omitempty"`
	Payload     string           `json:"payload,omitempty"`
	BytesIn     int              `json:"bytes_in,omitempty"`
	BytesOut    int              `json:"bytes_out,omitempty"`
}

type Agent struct {
	Name        string
	ClientID    string
	StatusTopic string
	BrokerURL   string
}

/*
AGENT MQTT CLIENT SETUP
*/
func (a Agent) connect(cfg config.Config) (*socmqtt.Client, error) {
	alias := 0
	if cfg.EnableTopicAlias {
		alias = cfg.TopicAlias
	}
	client, err := socmqtt.NewClient(socmqtt.Options{
		BrokerURL:    a.BrokerURL,
		ClientID:     a.ClientID,
		CleanSession: true,
		/*
			LAST WILL TESTAMENT
		*/
		WillTopic:     a.StatusTopic,
		WillPayload:   "offline",
		WillQoS:       socmqtt.QoSAtLeastOnce,
		WillRetained:  true, // Keep status persisted
		AutoReconnect: true,
		/*
			FLOW CONTROL (Rate Limiting)
		*/
		PublishRatePerS: cfg.PublishRatePerSecond,
		/*
			FLOW CONTROL (Timeout)
		*/
		PublishTimeoutMs: cfg.PublishTimeoutMs,
		/*
			MESSAGE EXPIRY
		*/
		DefaultMessageExpirySecs: cfg.MessageExpirySecs,
		/*
			TOPIC ALIAS
		*/
		DefaultTopicAlias: alias,
	})
	if err != nil {
		return nil, err
	}
	if err := client.Publish(a.StatusTopic, socmqtt.QoSAtLeastOnce, true, "online"); err != nil {
		return nil, err
	}
	return client, nil
}

/*
EVENT PUBLISHING WITH METADATA
*/
func publishEvent(client *socmqtt.Client, topic string, qos byte, retained bool, payload EventPayload) {
	if payload.ID == "" {
		payload.ID = uuid.NewString()
	}
	if payload.Timestamp.IsZero() {
		payload.Timestamp = time.Now().UTC()
	}

	/*
		USER PROPERTIES (Metadata Key-Value Pairs)
	*/
	props := socmqtt.PublishProps{
		UserProperties: map[string]string{
			"agent":       payload.Agent,
			"event_type":  string(payload.Type),
			"severity":    string(payload.Severity),
			"source_ip":   payload.SourceIP,
			"dest_ip":     payload.DestIP,
			"description": payload.Description,
		},
	}
	if payload.Action != "" {
		props.UserProperties["action"] = payload.Action
	}
	if payload.Protocol != "" {
		props.UserProperties["protocol"] = payload.Protocol
	}
	if payload.Hostname != "" {
		props.UserProperties["hostname"] = payload.Hostname
	}
	if payload.Process != "" {
		props.UserProperties["process"] = payload.Process
	}
	if payload.Payload != "" {
		props.UserProperties["payload"] = payload.Payload
	}
	if payload.BytesIn > 0 {
		props.UserProperties["bytes_in"] = strconv.Itoa(payload.BytesIn)
	}
	if payload.BytesOut > 0 {
		props.UserProperties["bytes_out"] = strconv.Itoa(payload.BytesOut)
	}
	if payload.Port > 0 {
		props.UserProperties["port"] = strconv.Itoa(payload.Port)
	}

	/*
		RETAINED MESSAGES
	*/
	if err := client.PublishEx(topic, qos, retained, payload, props); err != nil {
		log.Printf("[publisher] failed publish %s: %v", topic, err)
	}
}

func randIntn(n int) int {
	rngMu.Lock()
	value := rng.Intn(n)
	rngMu.Unlock()
	return value
}

func randomIP() string {
	ranges := []string{"10.0", "172.16", "192.168", "203.0"}
	return fmt.Sprintf("%s.%d.%d", ranges[randIntn(len(ranges))], randIntn(255), randIntn(255))
}

// ExportRandomIP is the exported version for use by other packages.
func ExportRandomIP() string {
	return randomIP()
}

func randomPrivateIP() string {
	return fmt.Sprintf("192.168.%d.%d", randIntn(5)+1, randIntn(250)+1)
}

func randomPort() int {
	ports := []int{22, 23, 53, 80, 443, 445, 1433, 3306, 3389, 5432, 6379, 8080}
	return ports[randIntn(len(ports))]
}
