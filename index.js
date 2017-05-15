const moment = require('moment')
const sqlite3 = require('sqlite3-offline')
const mercator = require('global-mercator')
const schema = require('./schema')
const projections = require('./projections')

/**
 * GeoPackage
 */
module.exports = class GeoPackage {
  /**
   * GeoPackage
   *
   * @param {string} uri Path to GeoPacakge
   * @returns {GeoPackage} GeoPackage
   * @example
   * const gpkg = new GeoPackage('example.gpkg')
   * //=gpkg
   */
  constructor (uri) {
    this.db = new sqlite3.Database(uri)
    this.uri = uri
    this.version = '1.0'
    this.errors = []
    this.ok = true
  }

  /**
   * Build SQL tables
   *
   * @returns {Promise<boolean>} true when SQL tables are built
   * @example
   * gpkg.tables()
   *   .then(status => console.log(status))
   */
  async tables () {
    if (this._table) return true
    await runSQL(this.db, schema.TABLE.gpkg_contents)
    await runSQL(this.db, schema.TABLE.gpkg_spatial_ref_sys)
    await runSQL(this.db, schema.TABLE.gpkg_tile_matrix)
    await runSQL(this.db, schema.TABLE.gpkg_tile_matrix_set)
    await runSQL(this.db, schema.TABLE.tiles)
    this._table = true
    return true
  }

  /**
   * Update Metadata
   *
   * @param {Metadata} [metadata={}] Metadata according to MBTiles spec 1.1.0
   * @param {string} metadata.name Name
   * @param {string} metadata.description Description
   * @param {BBox} metadata.bounds BBox [west, south, east, north] or Polygon GeoJSON
   * @param {number} metadata.minzoom Minimum zoom level
   * @param {number} metadata.maxzoom Maximum zoom level
   * @returns {Promise<Metadata>} Metadata
   * @example
   * const metadata = {
   *   name: 'Foo',
   *   description: 'Bar',
   *   minzoom: 1,
   *   maxzoom: 3,
   *   bounds: [-110, -40, 95, 50]
   * }
   * gpkg.update(metadata)
   *   .then(metadata => console.log(metadata))
   */
  async update (metadata = {}) {
    if (!this._table) await this.tables()

    // Metadata
    const name = metadata.name || 'tiles'
    const description = metadata.description || 'OGC GeoPackage'
    const bounds = metadata.bounds || [-180, -85, 180, 85]
    const boundsMeters = mercator.bboxToMeters(bounds)
    const lastChange = moment().toISOString()
    const minzoom = metadata.minzoom || 0
    const maxzoom = metadata.maxzoom || 19

    // Spatial Reference System
    await runSQL(this.db, 'DELETE FROM gpkg_spatial_ref_sys')
    const stmt1 = this.db.prepare('INSERT INTO gpkg_spatial_ref_sys VALUES (?, ?, ?, ?, ?, ?)')
    await runSQL(stmt1, ['Undefined Cartesian Coordinate Reference System', -1, 'NONE', -1, 'undefined', 'Undefined Cartesian coordinate reference system'])
    await runSQL(stmt1, ['Undefined Geographic Coordinate Reference System', 0, 'NONE', -1, 'undefined', 'Undefined geographic coordinate reference system'])
    await runSQL(stmt1, ['World Geodetic System (WGS) 1984', 1, 'EPSG', 4326, projections.wgs84, 'World Geodetic System 1984'])
    await runSQL(stmt1, ['Web Mercator', 2, 'EPSG', 3857, projections.webMercator, 'Pseudo Web Mercator'])

    // Contents
    await runSQL(this.db, 'DELETE FROM gpkg_contents')
    const stmt2 = this.db.prepare('INSERT INTO gpkg_contents VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    await runSQL(stmt2, [name, 'tiles', name, description, lastChange, boundsMeters[0], boundsMeters[1], boundsMeters[2], boundsMeters[3], 2])

    // Tile Matrix
    await runSQL(this.db, 'DELETE FROM gpkg_tile_matrix')
    const stmt3 = this.db.prepare('INSERT INTO gpkg_tile_matrix VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    const zooms = mercator.range(minzoom, maxzoom + 1)
    for (const index in zooms) {
      const zoom = zooms[index]
      const matrix = Math.pow(2, index)
      const resolution = mercator.resolution(zoom)
      await runSQL(stmt3, [name, zoom, matrix, matrix, 256, 256, resolution, resolution])
    }

    // Tile Matrix Set
    await runSQL(this.db, 'DELETE FROM gpkg_tile_matrix_set')
    const stmt4 = this.db.prepare('INSERT INTO gpkg_tile_matrix_set VALUES (?, ?, ?, ?, ?, ?)')
    await runSQL(stmt4, [name, 2, boundsMeters[0], boundsMeters[1], boundsMeters[2], boundsMeters[3]])
    return {
      name,
      description,
      bounds,
      boundsMeters,
      lastChange,
      minzoom,
      maxzoom
    }
  }
  /**
   * Save buffer data to individual Tile
   *
   * @param {Tile} tile Tile [x, y, z]
   * @param {Buffer} image Tile image
   * @returns {Promise<boolean>}
   * @example
   * gpkg.save([x, y, z], buffer)
   *   .then(status => console.log(status))
   */
  async save (tile, image) {
    if (!this._table) await this.tables()
    const [x, y, z] = tile
    const data = [x, y, z, image]
    await runSQL(this.db, 'INSERT INTO tiles (tile_column, tile_row, zoom_level, tile_data) VALUES (?, ?, ?, ?)', data)
    return true
  }

  /**
   * Delete individual Tile
   *
   * @param {Tile} tile Tile [x, y, z]
   * @returns {Promise<boolean>}
   * @example
   * gpkg.delete([x, y, z])
   *   .then(status => console.log(status))
   */
  async delete (tile) {
    if (!this._table) await this.tables()
    await runSQL(this.db, 'DELETE FROM tiles WHERE tile_column=? AND tile_row=? AND zoom_level=?', tile)
    return true
  }

  /**
   * Finds one Tile and returns Buffer
   *
   * @param {Tile} tile Tile [x, y, z]
   * @return {Promise<Buffer>} Tile Data
   * @example
   * gpkg.findOne([x, y, z])
   *   .then(image => console.log(image))
   */
  async findOne (tile) {
    if (!this._table) await this.tables()
    const row = await getSQL('SELECT tile_data FROM tiles WHERE tile_column=? AND tile_row=? AND zoom_level=?', tile)
    if (row) return row.tile_data
  }

}

/**
 * Get SQL
 *
 * @private
 * @param {SQLite} db
 * @param {string} sql
 * @param {any[]} data
 * @returns {Promise<boolean>}
 */
function getSQL (db, sql, data) {
  return new Promise((resolve, reject) => {
    db.get(sql, data, (error, row) => {
      if (error) {
        console.warn(error)
        return resolve(undefined)
      }
      return resolve(row)
    })
  })
}

/**
 * Run SQL
 *
 * @private
 * @param {SQLite} db
 * @param {string} sql
 * @param {any[]} data
 * @returns {Promise<boolean>}
 */
function runSQL (db, sql, data) {
  return new Promise((resolve, reject) => {
    db.run(sql, data, error => {
      if (error) {
        console.warn(error)
        resolve(false)
      }
      return resolve(true)
    })
  })
}
