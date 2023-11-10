#!/bin/sh

if   [[ "$NODE_ENV" == 'development' ]]; then
	echo development
	npm install
	npm run start
elif [[ "$NODE_ENV" == 'production' ]]; then
	echo production
	rm -rf ./build
	npm install
	npm run build
fi


exec "$@"
