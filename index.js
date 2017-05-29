const moment = require('moment')
const sqlite3 = require('sqlite3-offline')
const mercator = require('global-mercator')
const schema = require('./schema')
const projections = require('./projections')

/**
 * GeoPackage
 *
 * @param {string} uri Path to GeoPacakge
 * @returns {GeoPackage} GeoPackage
 * @example
 * const gpkg = new GeoPackage('example.gpkg')
 * //=gpkg
 */
module.exports = class GeoPackage {
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
   * @param {string} metadata.description Description
   * @param {number} metadata.maxzoom Maximum zoom level
   * @returns {Promise<Metadata>} Metadata
   * @example
   * const metadata = {
   *   description: 'Example Description',
   *   maxzoom: 3
   * }
   * gpkg.update(metadata)
   *   .then(metadata => console.log(metadata))
   */
  async update (metadata = {}) {
    if (!this._table) await this.tables()

    // Metadata
    const name = metadata.name || 'tiles'
    const description = metadata.description || 'OGC GeoPackage'
    const boundsMeters = [-20037508.34, -20037508.34, 20037508.34, 20037508.34]
    const lastChange = moment().toISOString()
    const maxzoom = metadata.maxzoom || 19

    // Spatial Reference System
    await runSQL(this.db, 'DELETE FROM gpkg_spatial_ref_sys')
    const stmt1 = this.db.prepare('INSERT INTO gpkg_spatial_ref_sys VALUES (?, ?, ?, ?, ?, ?)')
    await runStatement(stmt1, ['Undefined Cartesian Coordinate Reference System', -1, 'NONE', -1, 'undefined', 'Undefined Cartesian coordinate reference system'])
    await runStatement(stmt1, ['Undefined Geographic Coordinate Reference System', 0, 'NONE', -1, 'undefined', 'Undefined geographic coordinate reference system'])
    await runStatement(stmt1, ['World Geodetic System (WGS) 1984', 1, 'EPSG', 4326, projections.wgs84, 'World Geodetic System 1984'])
    await runStatement(stmt1, ['Web Mercator', 2, 'EPSG', 3857, projections.webMercator, 'Pseudo Web Mercator'])

    // Contents
    await runSQL(this.db, 'DELETE FROM gpkg_contents')
    const stmt2 = this.db.prepare('INSERT INTO gpkg_contents VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    await runStatement(stmt2, [name, 'tiles', name, description, lastChange, boundsMeters[0], boundsMeters[1], boundsMeters[2], boundsMeters[3], 2])

    // Tile Matrix
    await runSQL(this.db, 'DELETE FROM gpkg_tile_matrix')
    const stmt3 = this.db.prepare('INSERT INTO gpkg_tile_matrix VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    const zooms = mercator.range(0, maxzoom + 1)
    for (const index of zooms) {
      const zoom = zooms[index]
      const matrix = Math.pow(2, index)
      const resolution = mercator.resolution(zoom)
      await runStatement(stmt3, [name, zoom, matrix, matrix, 256, 256, resolution, resolution])
    }

    // Tile Matrix Set
    await runSQL(this.db, 'DELETE FROM gpkg_tile_matrix_set')
    const stmt4 = this.db.prepare('INSERT INTO gpkg_tile_matrix_set VALUES (?, ?, ?, ?, ?, ?)')
    await runStatement(stmt4, [name, 2, boundsMeters[0], boundsMeters[1], boundsMeters[2], boundsMeters[3]])
    return {
      name,
      description,
      boundsMeters,
      lastChange,
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
    const row = await getSQL(this.db, 'SELECT tile_data FROM tiles WHERE tile_column=? AND tile_row=? AND zoom_level=?', tile)
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
      if (error) console.warn(error)
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
      if (error) console.warn(error)
      return resolve(true)
    })
  })
}

/**
 * Run SQL
 *
 * @private
 * @param {SQLite} db
 * @param {string} sql
 * @param {any[]} [data]
 * @returns {Promise<boolean>}
 */
function runStatement (db, data) {
  return new Promise((resolve, reject) => {
    db.run(data, error => {
      if (error) console.warn(error)
      return resolve(true)
    })
  })
}
