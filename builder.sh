#!/bin/bash

function build_dev() {
    clean_outputs
    # Development build# Development build
    NODE_ENV=development npx webpack --config webpack.config.cjs
    replace_manifest_version
}

function build_prod_unsigned() {
    clean_outputs
    # Production build
    NODE_ENV=production npx webpack --config webpack.config.cjs
    replace_manifest_version
    chromium-browser --pack-extension=./dist 
    cd ./dist/
    zip -r ../production/clerk-kent.zip ./*
    cd ..
    # dist.pem is useless so we remove it
    if [ -f "dist.pem" ]; then rm -f "dist.pem"; fi
    mv ./dist.crx ./production/clerk-kent.crx
}

function build_prod_in_docker() {
    clean_outputs
    # Production build
    create_private_key_file "./production/clerk-kent.pem" "EXTENSION_PRIVATE_KEY"
    NODE_ENV=production npx webpack --config webpack.config.cjs
    replace_manifest_version
    chromium-browser --pack-extension=./dist --pack-extension-key=./production/clerk-kent.pem --no-sandbox
    cd ./dist/
    zip -r ../production/clerk-kent.zip ./*
    cd ..
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

function create_private_key_file() {
  local key_path="$1"
  local key_content="${!2}"
  echo -e "$key_content" > "$key_path"
}

function replace_manifest_version {
    sed "s/##VERSION##/$(cat VERSION)/g" dist/manifest.json > dist/manifest.json.tmp && mv dist/manifest.json.tmp dist/manifest.json
}