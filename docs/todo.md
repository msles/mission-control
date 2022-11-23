# TODO

Remaining items:

### Server
- [x] broadcast layout changes to client
- [ ] send all current draw pixels to client
- [x] broadcast mode switch to clients

### Web Client
- [x] send layout change to server
- [ ] implement draw component
- [x] switch page when mode switches
- [x] ~~automatic anonymous sign in~~
- [ ] QR code (join) for players vs observers
- [ ] pong - bracketing games
- [ ] pong - placing obstacles

### Raspberry Pis
- [ ] Set up the remaining two pis/displays
- [ ] send WiFi config over NFC
- [ ] Make everying run on startup

### Networking
- [ ] Get a router
- [ ] Stress test all 4 displays with many clients

### Battery

- [ ] **Formally Define APIs**
  - [x] Device -> Server connection
    - [x] Persistent connection (disconnect behavior)
    > This was not implemented with a persistent connection, but devices are remembered between shutdown/reconnection.
  - [x] Player <-> Server communication
    - [ ] Send users layout
  - [x] Display Layout
- [ ] Implement Modes
  - [ ] **Draw mode**
  - [ ] **Pong mode**
  - [x] Only send modes updates (layouts, endpoints, channels) when
        they are active.
- [ ] Create React Client
  - [ ] **Arranging Displays**
    - [ ] View current layout
    - [ ] Move displays around
  - [ ] Draw mode
    - [ ] Sync display state
    - [x] Change pixel colors
  - [ ] Pong mode
    - [ ] Sync game state
    - [ ] Move pong paddles
    - [ ] Place obstacles
  - [ ] User authentication
    - [ ] log in on start screen as player or admin
- [x] Deploy to Google Cloud
  - [x] Static site for React
  - [ ] ~~Docker container for server~~
  - [x] Proxy server
- [ ] **Sending/Receiving WiFi config over NFC**
  - [x] Hardware setup
