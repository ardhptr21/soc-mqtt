package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	MQTTBroker       string
	HTTPPort         string
	HistoryLimit     int
	PublisherEnabled bool
}

func Load() Config {
	return Config{
		MQTTBroker:       getEnv("MQTT_BROKER", "localhost:1883"),
		HTTPPort:         getEnv("HTTP_PORT", "8080"),
		HistoryLimit:     getEnvInt("HISTORY_LIMIT", 500),
		PublisherEnabled: getEnvBool("PUBLISHERS_ENABLED", true),
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
