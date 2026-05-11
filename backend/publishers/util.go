package publishers

import (
	"fmt"
	"log"
	"math/rand"
	"sync"
	"time"

	"github.com/google/uuid"

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

func (a Agent) connect() (*socmqtt.Client, error) {
	client, err := socmqtt.NewAgentClient(a.BrokerURL, a.ClientID, a.StatusTopic)
	if err != nil {
		return nil, err
	}
	if err := client.Publish(a.StatusTopic, socmqtt.QoSAtLeastOnce, true, "online"); err != nil {
		return nil, err
	}
	return client, nil
}

func publishEvent(client *socmqtt.Client, topic string, qos byte, retained bool, payload EventPayload) {
	if payload.ID == "" {
		payload.ID = uuid.NewString()
	}
	if payload.Timestamp.IsZero() {
		payload.Timestamp = time.Now().UTC()
	}
	if err := client.Publish(topic, qos, retained, payload); err != nil {
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

func randomPrivateIP() string {
	return fmt.Sprintf("192.168.%d.%d", randIntn(5)+1, randIntn(250)+1)
}

func randomPort() int {
	ports := []int{22, 23, 53, 80, 443, 445, 1433, 3306, 3389, 5432, 6379, 8080}
	return ports[randIntn(len(ports))]
}
