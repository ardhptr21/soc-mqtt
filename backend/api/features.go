package api

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"soc-mqtt-simulator/backend/config"
	"soc-mqtt-simulator/backend/models"
	"soc-mqtt-simulator/backend/publishers"
	"soc-mqtt-simulator/backend/store"
)

type Features struct {
	store *store.Store
	hub   *Hub
	cfg   config.Config
	sim   *publishers.Simulator
}

func NewFeatures(s *store.Store, hub *Hub, cfg config.Config, sim *publishers.Simulator) *Features {
	return &Features{store: s, hub: hub, cfg: cfg, sim: sim}
}

func (f *Features) Register(router *gin.Engine) {
	g := router.Group("/api")
	g.POST("/killchain/trigger", f.triggerKillChain)
	g.POST("/chaos/toggle", f.chaosToggle)
	g.GET("/simulation", f.getSimulation)
	g.PUT("/simulation", f.putSimulation)
}

// ─── Kill Chain ───

func (f *Features) triggerKillChain(c *gin.Context) {
	if f.sim == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "publishers not enabled"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 60*time.Second)
	go func() {
		<-ctx.Done()
		cancel()
	}()
	if err := publishers.StartKillChain(ctx, f.cfg.MQTTURL(), f.sim); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "kill chain triggered"})
}

// ─── Chaos Engineering ───

type chaosToggleRequest struct {
	Agent  string `json:"agent" binding:"required"`
	Online bool   `json:"online"`
}

func (f *Features) chaosToggle(c *gin.Context) {
	var req chaosToggleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	status := "offline"
	if req.Online {
		status = "online"
	}

	agent := f.store.SetAgentStatus(req.Agent, status)
	f.hub.Broadcast(models.WSMessage{Type: "agent_status", Payload: agent})

	c.JSON(http.StatusOK, gin.H{
		"agent":  req.Agent,
		"status": status,
	})
}

// ─── Simulation Settings ───

func (f *Features) getSimulation(c *gin.Context) {
	if f.sim == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "publishers not enabled"})
		return
	}
	c.JSON(http.StatusOK, f.sim.Settings())
}

func (f *Features) putSimulation(c *gin.Context) {
	if f.sim == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "publishers not enabled"})
		return
	}
	var settings publishers.SimSettings
	if err := c.ShouldBindJSON(&settings); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	f.sim.SetSettings(settings)
	c.JSON(http.StatusOK, f.sim.Settings())
}
