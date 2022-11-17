# TODO

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
