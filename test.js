const path = require('path')
const {test} = require('tap')
const fs = require('fs-extra')
const d3 = require('d3-queue')
const GeoPackage = require('./')

const directory = path.join(__dirname, 'test') + path.sep
const image = fs.readFileSync(path.join(directory, 'images', '0', '0', '0.png'))

test('tables', t => {
  const gpkg = new GeoPackage(directory + 'tables.gpkg')
  gpkg.tables().then(status => {
    t.equal(status, true)
    // fs.remove(directory + 'tables.gpkg')
    t.end()
  })
})

test('metadata', t => {
  const metadata = {
    name: 'tiles',
    description: 'OGC GeoPackage',
    minzoom: 0,
    maxzoom: 2,
    bounds: [-180, -85, 180, 85]
  }
  const gpkg = new GeoPackage(directory + 'metadata.gpkg')
  gpkg.update(metadata).then(metadata => {
    t.deepEqual(metadata, metadata)
    // fs.remove(directory + 'metadata.gpkg')
    t.end()
  })
})

test('save', t => {
  const q = d3.queue(1)
  const gpkg = new GeoPackage(directory + 'tiles.gpkg')
  for (const zoom of fs.readdirSync(path.join(directory, 'images'))) {
    for (const x of fs.readdirSync(path.join(directory, 'images', zoom))) {
      for (const y of fs.readdirSync(path.join(directory, 'images', zoom, x))) {
        const image = fs.readFileSync(path.join(directory, 'images', zoom, x, y))
        const tile = [x, path.parse(y).name, zoom]
        q.defer(callback => {
          gpkg.save(tile, image).then(status => callback(null))
        })
      }
    }
  }
  q.awaitAll(errors => {
    // fs.remove(directory + 'tiles.gpkg')
    if (errors) t.fail()
    t.end()
  })
})

test('findOne', t => {
  const gpkg = new GeoPackage(directory + 'findOne.gpkg')
  gpkg.save([0, 0, 0], image).then(status => {
    t.equal(status, true)
    gpkg.findOne([0, 0, 0]).then(image => {
      t.assert(image)
      // fs.remove(directory + 'findOne.gpkg')
      t.end()
    })
  })
})

test('delete', t => {
  const gpkg = new GeoPackage(directory + 'delete.gpkg')
  gpkg.save([0, 0, 0], image).then(status => {
    gpkg.delete([0, 0, 0]).then(status => {
      gpkg.findOne([0, 0, 0]).then(image => {
        t.equal(image, undefined)
        // fs.remove(directory + 'delete.gpkg')
        t.end()
      })
    })
  })
})
