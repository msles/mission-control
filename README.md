# Mission Control
The control server for the M.S.L.E.S. project.

Here's a sketch of what the architecture could look like:

```
                 ┌──────────────────────────────────────────────────┐
                 │                  Control Server                  │
                 │                                                  │
                 │                                                  │
                 │               ┌──────────┐                       │
                 │               │   Pong   │  "Active Mode"        │
                 │         ┌─────┴────┬─────┴─────┐                 │
                 │         │   Draw   │   Image   │                 │
                 │         └──────────┴─────┬─────┘                 │
                 │  ┌───────────────────────┼───┐                   │
                 │  │    Application Server │   │                   │
                 │  │                       │   │                   │
┌──────────┐     │  ├──────────┐   ┌────────▼───┤                   │
│          │     │  │          │   │  Renderer  ├──┐   ┌──────────┐ │
│ Web App  │───┬─┼──▶ HTTP API │   └────▲───────┤  │   │  Video   │ │
│          │   │ │  │          │        │       │  ├──▶│  Stream  │─┼┐
└──────────┘   │ │  ├──────────┤ ┌──────┼──────┐│  │   └──────────┘ ││
               │ │  │          │ │      │      ││  │   ┌──────────┐ ││
               │ │  │WebSocket │ │Device Config││  │   │  Video   │ ││
               └─┼─▶│  Server  │ │             ││  └──▶│  Stream  │─┼┤
                 │  │          │ └─────────────┘│      └──────────┘ ││
                 ├──┴──────────┴────────────────┴───────────────────┘│
                 │             ┌─────────────────────────────────────┤
                 │             │                                     │
                 │             │  ┌───────────┐  ┌───────────┐       │
                 │             │  │ Lighting  │  │ Lighting  │       │
                 │             └─▶│  Device   │  │  Device   │◀──────┘
                 │                └───────────┘  └───────────┘
                 │                      ▲              ▲
                 │                      │              │
                 └──────────────────────┴──────────────┘
```

# Thoughts
Some ideas for the software system.

### Device Connection Procedure
When a (configured) lighting device is turned on, it must establish a connection to the control server. The procedure might look something like this:
* The device sends some information about its display (e.g. resolution) to the control server, likely via an HTTP request
* The server responds with a link to the video stream to display
* The device streams the video, decoding frames to write to the LED Board/LED strip

Alongside the video stream, the device makes another persistent connection to the control server (likely WebSocket) to receive commands from the server (such as changing brightness), and optionally to send sensor data like accelerometer/gyroscope values.

### Control Server
The control server must keep track of which lighting devices are connected. It also will have a spacial arrangement for them. This is important because it determines how the graphics will be rendered, and in the case of pong, may influence the mechanics of a game.

The control server will support different "modes", one for the pong game, one for drawing, and maybe some more for other demos we want to show. Each of these modes will have the same interface so the control server can delegate and swap between them.

The control server will inform the mode of the spacial arrangement of the displays, and the mode will produce frames to be rendered for each.

Each mode will support a set of "actions". Using pong as an example, it may support moving the pong paddle to a new position, placing an obstacle, etc. The mode should tell the control server what actions are available so they can be made accessible via the HTTP/WebSocket APIs.

The control server will parse actions from its APIs and send them to the mode so the mode's state can be updated. This might also include actions like "user joined" when a new player connects. When the mode's state changes, a new frame will be produced for each of the displays.