const d3 = require('d3-queue')
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
  tables () {
    return new Promise(resolve => {
      if (this._table) return resolve(true)
      const q = d3.queue(1)
      q.defer(callback => runSQL(this.db, schema.TABLE.gpkg_contents).then(() => callback(null)))
      q.defer(callback => runSQL(this.db, schema.TABLE.gpkg_spatial_ref_sys).then(() => callback(null)))
      q.defer(callback => runSQL(this.db, schema.TABLE.gpkg_tile_matrix).then(() => callback(null)))
      q.defer(callback => runSQL(this.db, schema.TABLE.gpkg_tile_matrix_set).then(() => callback(null)))
      q.defer(callback => runSQL(this.db, schema.TABLE.tiles).then(() => callback(null)))
      q.awaitAll(errors => {
        if (errors) throw new Error(errors)
        this._table = true
        return resolve(true)
      })
    })
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
  update (metadata = {}) {
    return new Promise(resolve => {
      // Create Tables
      this.tables().then(() => {
        const q = d3.queue(1)

        // Metadata
        const name = metadata.name || 'tiles'
        const description = metadata.description || 'OGC GeoPackage'
        const boundsMeters = [-20037508.34, -20037508.34, 20037508.34, 20037508.34]
        const lastChange = moment().toISOString()
        const maxzoom = metadata.maxzoom || 19

        // Spatial Reference System
        q.defer(callback => runSQL(this.db, 'DELETE FROM gpkg_spatial_ref_sys').then(() => callback(null)))
        const stmt1 = this.db.prepare('INSERT INTO gpkg_spatial_ref_sys VALUES (?, ?, ?, ?, ?, ?)')
        q.defer(callback => runStatement(stmt1, ['Undefined Cartesian Coordinate Reference System', -1, 'NONE', -1, 'undefined', 'Undefined Cartesian coordinate reference system']).then(() => callback(null)))
        q.defer(callback => runStatement(stmt1, ['Undefined Geographic Coordinate Reference System', 0, 'NONE', -1, 'undefined', 'Undefined geographic coordinate reference system']).then(() => callback(null)))
        q.defer(callback => runStatement(stmt1, ['World Geodetic System (WGS) 1984', 1, 'EPSG', 4326, projections.wgs84, 'World Geodetic System 1984']).then(() => callback(null)))
        q.defer(callback => runStatement(stmt1, ['Web Mercator', 2, 'EPSG', 3857, projections.webMercator, 'Pseudo Web Mercator']).then(() => callback(null)))

        // Contents
        q.defer(callback => runSQL(this.db, 'DELETE FROM gpkg_contents').then(() => callback(null)))
        const stmt2 = this.db.prepare('INSERT INTO gpkg_contents VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        q.defer(callback => runStatement(stmt2, [name, 'tiles', name, description, lastChange, boundsMeters[0], boundsMeters[1], boundsMeters[2], boundsMeters[3], 2]).then(() => callback(null)))

        // Tile Matrix
        q.defer(callback => runSQL(this.db, 'DELETE FROM gpkg_tile_matrix').then(() => callback(null)))
        const stmt3 = this.db.prepare('INSERT INTO gpkg_tile_matrix VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        const zooms = mercator.range(0, maxzoom + 1)
        for (const index of zooms) {
          const zoom = zooms[index]
          const matrix = Math.pow(2, index)
          const resolution = mercator.resolution(zoom)
          q.defer(callback => runStatement(stmt3, [name, zoom, matrix, matrix, 256, 256, resolution, resolution]).then(() => callback(null)))
        }

        // Tile Matrix Set
        q.defer(callback => runSQL(this.db, 'DELETE FROM gpkg_tile_matrix_set').then(() => callback(null)))
        const stmt4 = this.db.prepare('INSERT INTO gpkg_tile_matrix_set VALUES (?, ?, ?, ?, ?, ?)')
        q.defer(callback => runStatement(stmt4, [name, 2, boundsMeters[0], boundsMeters[1], boundsMeters[2], boundsMeters[3]]).then(() => callback(null)))

        q.awaitAll(errors => {
          if (errors) throw new Error(errors)
          return resolve({
            name,
            description,
            boundsMeters,
            lastChange,
            maxzoom
          })
        })
      })
    })
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
  save (tile, image) {
    return new Promise(resolve => {
      this.tables().then(() => {
        const [x, y, z] = tile
        const data = [x, y, z, image]
        runSQL(this.db, 'INSERT INTO tiles (tile_column, tile_row, zoom_level, tile_data) VALUES (?, ?, ?, ?)', data).then(status => {
          return resolve(status)
        })
      })
    })
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
  delete (tile) {
    return new Promise(resolve => {
      this.tables().then(() => {
        runSQL(this.db, 'DELETE FROM tiles WHERE tile_column=? AND tile_row=? AND zoom_level=?', tile).then(status => {
          return resolve(status)
        })
      })
    })
  }

  /**
   * Finds one Tile and returns Buffer
   *
   * @param {Tile} tile Tile [x, y, z]
   * @return {Promise<Buffer|undefined>} Tile Data
   * @example
   * gpkg.findOne([x, y, z])
   *   .then(image => console.log(image))
   */
  findOne (tile) {
    return new Promise(resolve => {
      this.tables().then(() => {
        getSQL(this.db, 'SELECT tile_data FROM tiles WHERE tile_column=? AND tile_row=? AND zoom_level=?', tile).then(row => {
          if (row) return resolve(row.tile_data)
          resolve(undefined)
        })
      })
    })
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
 * @param {function} callback D3 Queue Callback
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
