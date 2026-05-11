package mqtt

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	paho "github.com/eclipse/paho.mqtt.golang"
)

type Client struct {
	client paho.Client
	id     string
}

type Options struct {
	BrokerURL     string
	ClientID      string
	CleanSession  bool
	WillTopic     string
	WillPayload   string
	WillQoS       byte
	WillRetained  bool
	AutoReconnect bool
}

func NewClient(opts Options) (*Client, error) {
	pahoOpts := paho.NewClientOptions().
		AddBroker(opts.BrokerURL).
		SetClientID(opts.ClientID).
		SetCleanSession(opts.CleanSession).
		SetAutoReconnect(opts.AutoReconnect).
		SetConnectRetry(true).
		SetConnectRetryInterval(2 * time.Second).
		SetOrderMatters(false)

	if opts.WillTopic != "" {
		pahoOpts.SetWill(opts.WillTopic, opts.WillPayload, opts.WillQoS, opts.WillRetained)
	}

	pahoOpts.OnConnectionLost = func(_ paho.Client, err error) {
		log.Printf("[mqtt:%s] connection lost: %v", opts.ClientID, err)
	}
	pahoOpts.OnReconnecting = func(_ paho.Client, _ *paho.ClientOptions) {
		log.Printf("[mqtt:%s] reconnecting", opts.ClientID)
	}

	client := paho.NewClient(pahoOpts)
	token := client.Connect()
	if !token.WaitTimeout(15 * time.Second) {
		return nil, fmt.Errorf("timeout connecting mqtt client %s", opts.ClientID)
	}
	if err := token.Error(); err != nil {
		return nil, err
	}

	log.Printf("[mqtt:%s] connected to %s", opts.ClientID, opts.BrokerURL)
	return &Client{client: client, id: opts.ClientID}, nil
}

func NewAgentClient(brokerURL, clientID, statusTopic string) (*Client, error) {
	return NewClient(Options{
		BrokerURL:     brokerURL,
		ClientID:      clientID,
		CleanSession:  true,
		WillTopic:     statusTopic,
		WillPayload:   "offline",
		WillQoS:       QoSAtLeastOnce,
		WillRetained:  true,
		AutoReconnect: true,
	})
}

func (c *Client) Publish(topic string, qos byte, retained bool, payload any) error {
	var body []byte
	switch value := payload.(type) {
	case []byte:
		body = value
	case string:
		body = []byte(value)
	default:
		encoded, err := json.Marshal(value)
		if err != nil {
			return err
		}
		body = encoded
	}

	token := c.client.Publish(topic, qos, retained, body)
	if !token.WaitTimeout(10 * time.Second) {
		return fmt.Errorf("timeout publishing to %s", topic)
	}
	return token.Error()
}

func (c *Client) Subscribe(topic string, qos byte, handler paho.MessageHandler) error {
	token := c.client.Subscribe(topic, qos, handler)
	if !token.WaitTimeout(10 * time.Second) {
		return fmt.Errorf("timeout subscribing to %s", topic)
	}
	return token.Error()
}

func (c *Client) Disconnect() {
	if c != nil && c.client.IsConnected() {
		c.client.Disconnect(250)
	}
}

func (c *Client) Wait(ctx context.Context) {
	<-ctx.Done()
	c.Disconnect()
}
