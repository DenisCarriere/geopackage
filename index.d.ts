/// <reference types="node" />

type Tile = [number, number, number]
type BBox = [number, number, number, number]

interface Metadata {
  description: string
  maxzoom: number
}

declare class GeoPackage {
  constructor (uri: string)
  tables(): Promise<boolean>
  update(metadata: Metadata): Promise<Metadata>
  save(tile: Tile, image: Buffer): Promise<boolean>
  findOne(tile: Tile): Promise<Buffer|undefined>
  delete(tile: Tile): Promise<boolean>
}

declare namespace GeoPackage {}
export = GeoPackage