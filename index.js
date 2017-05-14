const sqlite3 = require('sqlite3-offline')
const schema = require('./schema')

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
   * const geopackage = new GeoPackage('example.gpkg')
   * //=geopackage
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
   * geopackage.tables()
   *   .then(status => console.log(status))
   */
  async tables () {
    if (this._table) return true
    await executeSQL(this.db, schema.TABLE.gpkg_contents)
    await executeSQL(this.db, schema.TABLE.gpkg_spatial_ref_sys)
    await executeSQL(this.db, schema.TABLE.gpkg_tile_matrix)
    await executeSQL(this.db, schema.TABLE.gpkg_tile_matrix_set)
    await executeSQL(this.db, schema.TABLE.tiles)
    this._table = true
    return true
  }
}

function executeSQL (db, sql) {
  return new Promise((resolve, reject) => {
    db.run(sql, error => {
      if (error) {
        console.warn(error)
        resolve(false)
      }
      return resolve(true)
    })
  })
}
