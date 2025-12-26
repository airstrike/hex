build:
	bun run build

dev: build
	wrangler pages dev .

deploy: build
	wrangler pages deploy .
