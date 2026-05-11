package api

import (
	"context"
	"errors"
	"log"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"soc-mqtt-simulator/backend/config"
	"soc-mqtt-simulator/backend/store"
)

func NewServer(cfg config.Config, store *store.Store, hub *Hub) *http.Server {
	gin.SetMode(gin.ReleaseMode)

	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())
	router.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		AllowCredentials: false,
	}))

	NewREST(store, hub).Register(router)

	return &http.Server{
		Addr:         ":" + cfg.HTTPPort,
		Handler:      router,
		ReadTimeout:  config.HTTPReadTimeout(),
		WriteTimeout: config.HTTPWriteTimeout(),
	}
}

func Run(ctx context.Context, server *http.Server) error {
	errCh := make(chan error, 1)
	go func() {
		log.Printf("[api] listening on %s", server.Addr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
		close(errCh)
	}()

	select {
	case <-ctx.Done():
		return server.Shutdown(context.Background())
	case err := <-errCh:
		return err
	}
}
