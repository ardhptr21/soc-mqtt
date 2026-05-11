package publishers

import (
	"context"
	"math/rand"
	"time"
)

func StartAll(ctx context.Context, brokerURL string) error {
	rand.Seed(time.Now().UnixNano())

	starts := []func(context.Context, string) error{
		StartFirewall,
		StartIDS,
		StartHoneypot,
		StartHost,
	}
	for _, start := range starts {
		if err := start(ctx, brokerURL); err != nil {
			return err
		}
	}
	return nil
}
