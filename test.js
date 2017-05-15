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

test('metadata', async t => {
  const metadata = {
    name: 'tiles',
    description: 'OGC GeoPackage',
    minzoom: 0,
    maxzoom: 2,
    bounds: [-180, -85, 180, 85]
  }
  const gpkg = new GeoPackage(directory + 'metadata.gpkg')
  t.assert(await gpkg.update(metadata))
  fs.remove(directory + 'metadata.gpkg')
  t.end()
})

test('save', async t => {
  const gpkg = new GeoPackage(directory + 'tiles.gpkg')
  for (const zoom of fs.readdirSync(path.join(directory, 'images'))) {
    for (const x of fs.readdirSync(path.join(directory, 'images', zoom))) {
      for (const y of fs.readdirSync(path.join(directory, 'images', zoom, x))) {
        const image = fs.readFileSync(path.join(directory, 'images', zoom, x, y))
        const tile = [x, path.parse(y).name, zoom]
        await gpkg.save(tile, image)
      }
    }
  }
  fs.remove(directory + 'tiles.gpkg')
  t.true(true)
  t.end()
})
