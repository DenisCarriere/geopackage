const fs = require('fs')
const path = require('path')

/**
 * Projections
 */
module.exports = {
  webMercator: fs.readFileSync(path.join(__dirname, 'web-mercator.proj'), 'utf8'),
  wgs84: fs.readFileSync(path.join(__dirname, 'wgs84.proj'), 'utf8')
}
