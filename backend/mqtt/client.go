package mqtt

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/url"
	"sync"
	"time"

	"github.com/eclipse/paho.golang/paho"
)

type PublishProps struct {
	MessageExpirySeconds uint32
	TopicAlias           uint16
}

type MessageHandler func(pr paho.PublishReceived) error

type Client struct {
	client         *paho.Client
	id             string
	publishTokens  chan struct{}
	publishTimeout time.Duration
	defaultExpiry  uint32
	defaultAlias   uint16
	connection     net.Conn
	mu             sync.Mutex
}

type Options struct {
	BrokerURL                string
	ClientID                 string
	CleanSession             bool
	WillTopic                string
	WillPayload              string
	WillQoS                  byte
	WillRetained             bool
	AutoReconnect            bool
	PublishRatePerS          int
	PublishTimeoutMs         int
	DefaultMessageExpirySecs int
	DefaultTopicAlias        int
}

func NewClient(opts Options) (*Client, error) {
	brokerURL := opts.BrokerURL

	brokerAddr := brokerURL
	if parsed, parseErr := url.Parse(brokerURL); parseErr == nil {
		if parsed.Host != "" {
			brokerAddr = parsed.Host
		} else if parsed.Scheme == "" && parsed.Path != "" {
			brokerAddr = parsed.Path
		}
	}

	conn, err := net.Dial("tcp", brokerAddr)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to broker %s: %w", brokerAddr, err)
	}

	config := paho.ClientConfig{
		Conn:     conn,
		ClientID: opts.ClientID,
	}

	client := paho.NewClient(config)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	cp := &paho.Connect{
		KeepAlive:  30,
		ClientID:   opts.ClientID,
		CleanStart: opts.CleanSession,
	}

	if opts.WillTopic != "" {
		cp.WillMessage = &paho.WillMessage{
			Topic:   opts.WillTopic,
			QoS:     opts.WillQoS,
			Retain:  opts.WillRetained,
			Payload: []byte(opts.WillPayload),
		}
	}

	ca, err := client.Connect(ctx, cp)
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to connect mqtt client %s: %w", opts.ClientID, err)
	}

	if ca.ReasonCode != 0 {
		conn.Close()
		return nil, fmt.Errorf("mqtt connection failed with reason code %d", ca.ReasonCode)
	}

	log.Printf("[mqtt:%s] connected to %s", opts.ClientID, opts.BrokerURL)

	c := &Client{
		client:     client,
		id:         opts.ClientID,
		connection: conn,
	}

	if opts.DefaultMessageExpirySecs > 0 {
		c.defaultExpiry = uint32(opts.DefaultMessageExpirySecs)
	}
	if opts.DefaultTopicAlias > 0 {
		c.defaultAlias = uint16(opts.DefaultTopicAlias)
	}

	if opts.PublishRatePerS > 0 {
		c.publishTokens = make(chan struct{}, opts.PublishRatePerS)
		for i := 0; i < opts.PublishRatePerS; i++ {
			c.publishTokens <- struct{}{}
		}
		go func(tokens chan struct{}, rate int) {
			ticker := time.NewTicker(time.Second / time.Duration(rate))
			defer ticker.Stop()
			for range ticker.C {
				select {
				case tokens <- struct{}{}:
				default:
				}
			}
		}(c.publishTokens, opts.PublishRatePerS)
	}

	if opts.PublishTimeoutMs > 0 {
		c.publishTimeout = time.Duration(opts.PublishTimeoutMs) * time.Millisecond
	} else {
		c.publishTimeout = 10 * time.Second
	}

	return c, nil
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
	return c.PublishEx(topic, qos, retained, payload, PublishProps{})
}

func (c *Client) PublishEx(topic string, qos byte, retained bool, payload any, props PublishProps) error {
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

	if c.publishTokens != nil {
		select {
		case <-c.publishTokens:
		case <-time.After(c.publishTimeout):
			return fmt.Errorf("publish rate limit timeout for %s", topic)
		}
	}

	if props.MessageExpirySeconds == 0 && c.defaultExpiry != 0 {
		props.MessageExpirySeconds = c.defaultExpiry
	}
	if props.TopicAlias == 0 && c.defaultAlias != 0 {
		props.TopicAlias = c.defaultAlias
	}

	publish := &paho.Publish{
		Topic:   topic,
		QoS:     qos,
		Retain:  retained,
		Payload: body,
	}

	if props.MessageExpirySeconds != 0 || props.TopicAlias != 0 {
		publish.Properties = &paho.PublishProperties{}

		if props.MessageExpirySeconds != 0 {
			expiryInterval := props.MessageExpirySeconds
			publish.Properties.MessageExpiry = &expiryInterval
			log.Printf("[mqtt:%s] publish to %s with message expiry=%d seconds", c.id, topic, expiryInterval)
		}

		if props.TopicAlias != 0 {
			alias := props.TopicAlias
			publish.Properties.TopicAlias = &alias
			log.Printf("[mqtt:%s] publish to %s with topic alias=%d", c.id, topic, alias)
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), c.publishTimeout)
	defer cancel()

	pr, err := c.client.Publish(ctx, publish)
	if err != nil {
		return fmt.Errorf("error publishing to %s: %w", topic, err)
	}

	if pr != nil && pr.ReasonCode != 0 {
		return fmt.Errorf("publish to %s failed with reason code %d", topic, pr.ReasonCode)
	}

	return nil
}

func (c *Client) Subscribe(topic string, qos byte, handler MessageHandler) error {
	sub := &paho.Subscribe{
		Subscriptions: []paho.SubscribeOptions{
			{
				Topic: topic,
				QoS:   qos,
			},
		},
	}

	callbackHandler := func(pr paho.PublishReceived) (bool, error) {
		err := handler(pr)
		return true, err
	}

	c.client.AddOnPublishReceived(callbackHandler)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	sr, err := c.client.Subscribe(ctx, sub)
	if err != nil {
		return fmt.Errorf("error subscribing to %s: %w", topic, err)
	}

	if len(sr.Reasons) > 0 && sr.Reasons[0] >= 128 {
		return fmt.Errorf("subscription to %s failed with reason code %d", topic, sr.Reasons[0])
	}

	log.Printf("[mqtt:%s] subscribed to %s with QoS %d", c.id, topic, qos)
	return nil
}

func (c *Client) Disconnect() {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c != nil && c.client != nil {
		_ = c.client.Disconnect(&paho.Disconnect{})
	}

	if c.connection != nil {
		c.connection.Close()
	}
}

func (c *Client) Wait(ctx context.Context) {
	<-ctx.Done()
	c.Disconnect()
}
