# Installation Steps

## Install latest Raspberry Pi OS

Use raspberry pi imager with raspberry pi os lite (64-bit).
Configure image to enable ssh, use STONE WiFi network.

## Run the RGB LED matrix setup script from [adafruit's tutorial](https://learn.adafruit.com/adafruit-rgb-matrix-plus-real-time-clock-hat-for-raspberry-pi/driving-matrices)

```sh
curl https://raw.githubusercontent.com/adafruit/Raspberry-Pi-Installer-Scripts/main/rgb-matrix.sh >rgb-matrix.sh
sudo bash rgb-matrix.sh
```

We use the Bonnet, and didn't solder it yet.

## Install and run [PixelPusher](https://github.com/hzeller/rpi-matrix-pixelpusher)

```sh
git clone --recursive https://github.com/hzeller/rpi-matrix-pixelpusher.git
cd rpi-matrix-pixelpusher
make
```

```sh
sudo ./pixel-push --led-gpio-mapping=adafruit-hat -i wlan0 --led-rows=32 --led-cols=64
```

## Run this script to forward UDP broadcast packets to the server
(my server IP was 172.16.0.37)

```sh
#!/bin/bash
while :
do
  bash -c "nc -l -u 0.0.0.0 7331 | nc -u 172.16.0.37 7331" &
  sleep 1
  kill $!
done
```

## Run the server on your machine

```sh
npm start
```

## Bandwidth usage
64x64 pixels
3 color channels
256 values of color depth = 8 bits
4 displays
30 FPS
= 64 * 64 * 3 * 8 * 4 * 30 bits/sec
= 11.25 MBits/sec or 2.81 MBits/sec per display

## Mission Control top level class structure

MissionControl {

  server,
  activeMode,
  connectedDevices

}

# Installing mission-control on a Pi

1. Install nodejs
```sh
VERSION=v18.12.0
DISTRO=linux-arm64 # for armv8
wget https://nodejs.org/dist/v18.12.0/node-$VERSION-$DISTRO.tar.xz
sudo mkdir -p /usr/local/lib/nodejs
sudo tar -xJvf node-$VERSION-$DISTRO.tar.xz -C /usr/local/lib/nodejs 
```
2. Add this to the `~/.profile`
```sh
# Nodejs
VERSION=v18.12.0
DISTRO=linux-arm64
export PATH=/usr/local/lib/nodejs/node-$VERSION-$DISTRO/bin:$PATH
```
3. Clone mission-control repo
4. Install node-canvas build dependencies
```sh
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```
5. Install npm dependencies
```sh
npm i # will fail on canvas
npm install canvas --build-from-source
```