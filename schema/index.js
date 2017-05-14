const fs = require('fs')
const path = require('path')

/**
 * SQL Schema
 */
module.exports = {
  TABLE: {
    gpkg_contents: fs.readFileSync(path.join(__dirname, 'TABLE', 'gpkg_contents.sql'), 'utf8'),
    gpkg_spatial_ref_sys: fs.readFileSync(path.join(__dirname, 'TABLE', 'gpkg_spatial_ref_sys.sql'), 'utf8'),
    gpkg_tile_matrix_set: fs.readFileSync(path.join(__dirname, 'TABLE', 'gpkg_tile_matrix_set.sql'), 'utf8'),
    gpkg_tile_matrix: fs.readFileSync(path.join(__dirname, 'TABLE', 'gpkg_tile_matrix.sql'), 'utf8'),
    tiles: fs.readFileSync(path.join(__dirname, 'TABLE', 'tiles.sql'), 'utf8')
  },
  INDEX: {
    metadata: fs.readFileSync(path.join(__dirname, 'INDEX', 'metadata.sql'), 'utf8'),
    tiles: fs.readFileSync(path.join(__dirname, 'INDEX', 'tiles.sql'), 'utf8')
  }
}
