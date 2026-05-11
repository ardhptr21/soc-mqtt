package api

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"soc-mqtt-simulator/backend/models"
	"soc-mqtt-simulator/backend/store"
)

type REST struct {
	store *store.Store
	hub   *Hub
}

func NewREST(store *store.Store, hub *Hub) *REST {
	return &REST{store: store, hub: hub}
}

func (r *REST) Register(router *gin.Engine) {
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	router.GET("/ws", r.hub.Handle)

	group := router.Group("/api")
	group.GET("/events", r.getEvents)
	group.GET("/stats", r.getStats)
	group.GET("/agents", r.getAgents)
	group.GET("/blacklist", r.getBlacklist)
	group.POST("/blacklist", r.postBlacklist)
	group.DELETE("/blacklist/:ip", r.deleteBlacklist)
}

func (r *REST) getEvents(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	c.JSON(http.StatusOK, r.store.Events(c.Query("severity"), limit))
}

func (r *REST) getStats(c *gin.Context) {
	c.JSON(http.StatusOK, r.store.Stats())
}

func (r *REST) getAgents(c *gin.Context) {
	c.JSON(http.StatusOK, r.store.Agents())
}

func (r *REST) getBlacklist(c *gin.Context) {
	c.JSON(http.StatusOK, r.store.Blacklist())
}

func (r *REST) postBlacklist(c *gin.Context) {
	var entry models.BlacklistEntry
	if err := c.ShouldBindJSON(&entry); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	entry.BlockedBy = "manual"
	entry = r.store.AddBlacklist(entry)
	r.hub.Broadcast(models.WSMessage{Type: "ip_blocked", Payload: entry})
	c.JSON(http.StatusCreated, entry)
}

func (r *REST) deleteBlacklist(c *gin.Context) {
	if ok := r.store.RemoveBlacklist(c.Param("ip")); !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "ip not found"})
		return
	}
	c.Status(http.StatusNoContent)
}
