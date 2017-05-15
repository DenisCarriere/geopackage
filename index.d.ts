type Tile = [number, number, number]
type BBox = [number, number, number, number]

interface Metadata {
  name: string
  description: string
  minzoom: number
  maxzoom: number
  bounds: BBox
}

declare class GeoPackage {
  constructor (uri: string)
  tables(): Promise<boolean>
  update(metadata: Metadata): Promise<Metadata>
  save(tile: Tile, image: Buffer)
  findOne(tile: Tile)
  delete(tile: Tile)
}

declare namespace GeoPackage {}
export = GeoPackage