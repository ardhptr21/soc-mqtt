package publishers

import (
	"context"
	"time"

	"soc-mqtt-simulator/backend/config"
)

func StartAll(ctx context.Context, cfg config.Config) error {
	sim := NewSimulator(
		time.Now().UnixNano(),
		cfg.Scenario,
		cfg.RateMultiplier,
		cfg.BurstChance,
		cfg.BurstMinSeconds,
		cfg.BurstMaxSeconds,
	)

	starts := []func(context.Context, string, *Simulator) error{
		StartFirewall,
		StartIDS,
		StartHoneypot,
		StartHost,
		StartEDR,
		StartDNS,
		StartScenarioCoordinator,
	}
	for _, start := range starts {
		if err := start(ctx, cfg.MQTTURL(), sim); err != nil {
			return err
		}
	}
	return nil
}
