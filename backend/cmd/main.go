package main

import (
	"context"
	"log"
	"os/signal"
	"syscall"

	"soc-mqtt-simulator/backend/api"
	"soc-mqtt-simulator/backend/config"
	"soc-mqtt-simulator/backend/publishers"
	"soc-mqtt-simulator/backend/store"
	"soc-mqtt-simulator/backend/subscribers"
)

func main() {
	cfg := config.Load()
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	appStore := store.New(cfg.HistoryLimit)
	hub := api.NewHub()

	if err := subscribers.StartSOCDashboard(ctx, cfg.MQTTURL(), appStore, hub); err != nil {
		log.Fatalf("start dashboard subscriber: %v", err)
	}
	if err := subscribers.StartIncidentBot(ctx, cfg.MQTTURL(), appStore, hub); err != nil {
		log.Fatalf("start incident bot: %v", err)
	}

	var sim *publishers.Simulator
	if cfg.PublisherEnabled {
		var err error
		sim, err = publishers.StartAll(ctx, cfg)
		if err != nil {
			log.Fatalf("start publishers: %v", err)
		}
	}

	server := api.NewServer(cfg, appStore, hub, sim)
	if err := api.Run(ctx, server); err != nil {
		log.Fatalf("api server stopped: %v", err)
	}
}
