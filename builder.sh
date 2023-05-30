#!/bin/bash

function build_dev() {
    clean_outputs
    # Development build# Development build
    NODE_ENV=development npx webpack --config webpack.config.cjs
    replace_manifest_version
}

function build_prod() {
    clean_outputs
    # Production build
    NODE_ENV=production npx webpack --config webpack.config.cjs
    replace_manifest_version
    chromium-browser --pack-extension=./dist --no-sandbox
    cd ./dist/
    zip -r ../production/clerk-kent.zip ./*
    cd ..
    # dist.pem is useless so we remove it
    if [ -f "dist.pem" ]; then rm -f "dist.pem"; fi
    mv ./dist.crx ./production/clerk-kent.crx
}

function clean_outputs() {
    if [ -d "dist" ]; then rm -Rf "dist"; fi
    if [ -d "production" ]; then rm -Rf "production"; fi
    if [ -f "dist.pem" ]; then rm -f "dist.pem"; fi
    mkdir dist
    mkdir production
    cp -r ./public/* ./dist/
}

function replace_manifest_version {
    sed "s/##VERSION##/$(cat VERSION)/g" dist/manifest.json > dist/manifest.json.tmp && mv dist/manifest.json.tmp dist/manifest.json
}