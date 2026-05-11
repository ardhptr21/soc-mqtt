.PHONY: run test tidy build

run:
	go run ./cmd

test:
	go test ./...

tidy:
	go mod tidy

build:
	go build -o bin/soc-mqtt-backend ./cmd
