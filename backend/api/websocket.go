package api

import (
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type Hub struct {
	mu      sync.RWMutex
	clients map[*websocket.Conn]*sync.Mutex
}

func NewHub() *Hub {
	return &Hub{clients: map[*websocket.Conn]*sync.Mutex{}}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(_ *http.Request) bool {
		return true
	},
}

func (h *Hub) Handle(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[ws] upgrade error: %v", err)
		return
	}

	h.mu.Lock()
	h.clients[conn] = &sync.Mutex{}
	h.mu.Unlock()
	log.Printf("[ws] client connected")

	go h.readUntilClose(conn)
}

func (h *Hub) Broadcast(message any) {
	h.mu.RLock()
	clients := make([]*websocket.Conn, 0, len(h.clients))
	locks := make([]*sync.Mutex, 0, len(h.clients))
	for conn, lock := range h.clients {
		clients = append(clients, conn)
		locks = append(locks, lock)
	}
	h.mu.RUnlock()

	for i, conn := range clients {
		lock := locks[i]
		lock.Lock()
		err := conn.WriteJSON(message)
		lock.Unlock()
		if err != nil {
			h.remove(conn)
		}
	}
}

func (h *Hub) readUntilClose(conn *websocket.Conn) {
	defer h.remove(conn)
	conn.SetReadLimit(1024)
	_ = conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	})

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return
			}
		}
	}()

	for {
		select {
		case <-done:
			return
		case <-ticker.C:
			if !h.writeControl(conn, websocket.PingMessage, nil, time.Now().Add(5*time.Second)) {
				return
			}
		}
	}
}

func (h *Hub) writeControl(conn *websocket.Conn, messageType int, data []byte, deadline time.Time) bool {
	lock := h.getLock(conn)
	if lock == nil {
		return false
	}
	lock.Lock()
	err := conn.WriteControl(messageType, data, deadline)
	lock.Unlock()
	return err == nil
}

func (h *Hub) getLock(conn *websocket.Conn) *sync.Mutex {
	h.mu.RLock()
	lock := h.clients[conn]
	h.mu.RUnlock()
	return lock
}

func (h *Hub) remove(conn *websocket.Conn) {
	h.mu.Lock()
	if _, ok := h.clients[conn]; ok {
		delete(h.clients, conn)
		_ = conn.Close()
		log.Printf("[ws] client disconnected")
	}
	h.mu.Unlock()
}
