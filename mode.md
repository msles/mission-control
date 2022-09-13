# Mode
Describes a game or activity to be run on the M.S.L.E.S.

Each mode must describe its API:
1. how users can interact with the mode
2. how layout changes affect the mode
3. a way to "render" the mode's state into pixels.

For example a "static image" mode might have the following API:

1. users can upload an image
2. a layout change just triggers a re-render
3. split the image into regions, one for each display (based on the sizes and arrangement of the displays)

Here's what this might look like as a Python class:

```python
class StaticImageMode(Mode):

  def __init__(self, image):
      self.image = image

  def get_api(self):
      # somehow describe how an image can be uploaded so that it can be turned into an endpoint in the HTTP API
      pass

  def on_layout_change(self, layout):
      # maybe just return True to indicate
      # that the mode should be re-rendered
      return True

  def render(self, layout):
      # create images for each of the displays in the layout
      return [self.render_region(display) for display in layout]
```

The mode for pong will be more complex, as the get_api method would need to also represent the WebSocket messages used to move paddles, place obstacles, etc.