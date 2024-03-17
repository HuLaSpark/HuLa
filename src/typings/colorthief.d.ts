// colorthief.d.ts

declare module 'colorthief' {
  class ColorThief {
    constructor()
    getColor(sourceImage: HTMLImageElement, quality?: number): Promise<[number, number, number]>
    getPalette(
      sourceImage: HTMLImageElement,
      colorCount?: number,
      quality?: number
    ): Promise<[number, number, number][]>
  }

  export default ColorThief
}
