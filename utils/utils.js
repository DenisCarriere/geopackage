const sqlite3 = require('sqlite3-offline')

/**
 * Connect to SQL MBTiles DB
 *
 * @param {string} uri
 * @returns {Sqlite3} Sqlite3 connection
 */
module.exports.connect = (uri) => {
  return new sqlite3.Database(uri)
}
