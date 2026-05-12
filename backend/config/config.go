package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	MQTTBroker           string
	HTTPPort             string
	HistoryLimit         int
	PublisherEnabled     bool
	Scenario             string
	RateMultiplier       float64
	BurstChance          float64
	BurstMinSeconds      int
	BurstMaxSeconds      int
	SharedSubGroup       string
	PublishRatePerSecond int
	PublishTimeoutMs     int
	MessageExpirySecs    int
	EnableTopicAlias     bool
	TopicAlias           int
}

func Load() Config {
	return Config{
		MQTTBroker:           getEnv("MQTT_BROKER", "localhost:1883"),
		HTTPPort:             getEnv("HTTP_PORT", "8080"),
		HistoryLimit:         getEnvInt("HISTORY_LIMIT", 500),
		PublisherEnabled:     getEnvBool("PUBLISHERS_ENABLED", true),
		Scenario:             getEnv("SIM_SCENARIO", "baseline"),
		RateMultiplier:       getEnvFloat("SIM_RATE_MULTIPLIER", 1.0),
		BurstChance:          getEnvFloat("SIM_BURST_CHANCE", 0.08),
		BurstMinSeconds:      getEnvInt("SIM_BURST_MIN_SEC", 20),
		BurstMaxSeconds:      getEnvInt("SIM_BURST_MAX_SEC", 60),
		SharedSubGroup:       getEnv("SHARED_SUB_GROUP", ""),
		PublishRatePerSecond: getEnvInt("PUBLISH_RATE_PER_SEC", 0),
		PublishTimeoutMs:     getEnvInt("PUBLISH_TIMEOUT_MS", 5000),
		MessageExpirySecs:    getEnvInt("MESSAGE_EXPIRY_SECS", 0),
		EnableTopicAlias:     getEnvBool("ENABLE_TOPIC_ALIAS", false),
		TopicAlias:           getEnvInt("TOPIC_ALIAS", 0),
	}
}

func (c Config) MQTTURL() string {
	return "tcp://" + c.MQTTBroker
}

func HTTPReadTimeout() time.Duration {
	return 10 * time.Second
}

func HTTPWriteTimeout() time.Duration {
	return 10 * time.Second
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func getEnvInt(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func getEnvBool(key string, fallback bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func getEnvFloat(key string, fallback float64) float64 {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return fallback
	}
	return parsed
}
