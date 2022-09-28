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
git clone https://github.com/hzeller/rpi-matrix-pixelpusher.git
cd rgb-matrix-pixelpusher
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