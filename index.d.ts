declare class GeoPackage {
  constructor (uri: string)
  tables(): Promise<boolean>
}

declare namespace GeoPackage {}
export = GeoPackage