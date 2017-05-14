const path = require('path')
const test = require('tape')
const fs = require('fs-extra')
const GeoPackage = require('./')

const directory = path.join(__dirname, 'test') + path.sep

test('tables', async t => {
  const gpkg = new GeoPackage(directory + 'tables.gpkg')
  t.true(await gpkg.tables())
  fs.remove(directory + 'tables.gpkg')
  t.end()
})
