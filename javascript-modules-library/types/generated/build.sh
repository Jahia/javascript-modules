#!/bin/bash

echo "======================================================================================="
echo "  Building Java to Typescript tool..."
echo "======================================================================================="

mkdir -p build
pushd build
git clone https://github.com/Jahia/java-ts-bind.git
cd java-ts-bind
git checkout finer-excludes
./gradlew shadowJar
popd

echo "======================================================================================="
echo " Tool built successfully."
echo "======================================================================================="
