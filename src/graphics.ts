import {
  createCanvas, loadImage,
  Image, ImageData, Canvas,
  CanvasRenderingContext2D as Context2D
} from "canvas";
import path from "path";

/**
 * A 2d graphics class that can render the northeastern logo
 * across 2 equally sized frames.
 */
class Graphics {

  private readonly canvas: Canvas;
  private readonly ctx: Context2D;
  private readonly image: Image;

  /**
   * Creates a graphics instance for drawing the given image.
   */
  private constructor(width: number, height: number, image: Image) {
    this.canvas = createCanvas(width, height);
    this.ctx = this.canvas.getContext('2d');
    this.image = image;
  }

  /**
   * Render the graphics as two equally sized images.
   * @param x The x-position at which to draw the leftmost part of the
   *          northeastern logo
   * @returns Two images, one or both of which will contain parts of of the logo
   */
  render(x: number): readonly [ImageData, ImageData] {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.image, x, 0, this.canvas.width / 2, this.canvas.height);
    const midX = this.canvas.width / 2;
    return [
      this.ctx.getImageData(0, 0, midX, this.canvas.height),
      this.ctx.getImageData(midX, 0, midX, this.canvas.height)
    ];
  }

  /**
   * Creates a graphics instance that has the given size.
   * @param size The [width, height] of the complete image (will be split in two)
   * @returns A promise that resolves with the graphics instance once the logo image has loaded.
   */
  static async build(size: readonly [number, number]): Promise<Graphics> {
    const [width, height] = size;
    const image = await loadImage(
      path.join(__dirname, '../static/images/northeastern-n-64x64.png')
    );
    return new Graphics(width, height, image);
  }

}

export {Graphics};