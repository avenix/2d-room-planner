.PHONY: dev start build install deploy

install:
	npm install

dev:
	npm run dev

start:
	npm run start

build:
	npm run build

deploy: build
	npm run deploy

preview:
	npm run preview

deploy:
	@echo "Bumping version..."
	@npm version patch --no-git-tag-version
	@VERSION=$$(node -p "require('./package.json').version"); \
	sed -i.bak "s/v[0-9]*\.[0-9]*\.[0-9]*/v$$VERSION/" src/App.tsx && rm src/App.tsx.bak
	@echo "Building project..."
	@$(MAKE) build
	@echo "Deploy complete! New version: v$$(node -p "require('./package.json').version")"
