# OGC GeoPackage NodeJS binding

[![Build Status](https://travis-ci.org/DenisCarriere/geopackage.svg?branch=master)](https://travis-ci.org/DenisCarriere/geopackage)
[![npm version](https://badge.fury.io/js/geopackage.svg)](https://badge.fury.io/js/geopackage)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/DenisCarriere/geopackage/master/LICENSE)
[![Coverage Status](https://coveralls.io/repos/github/DenisCarriere/geopackage/badge.svg?branch=master)](https://coveralls.io/github/DenisCarriere/geopackage?branch=master)

<!-- Line Break -->

[![Standard - JavaScript Style Guide](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

> This library was designed to use the same MBTiles SQLite tile structure.

## Install

```bash
$ npm install --save geopackage
```

## Usage

```javascript
const GeoPackage = require('geopackage')
const gpkg = new GeoPackage('geopackage.gpkg')

// Read Image Buffer
const image = fs.readFileSync('world.png'))

// Save Image to Tile
gpkg.save([0, 0, 0], image).then(status => {
  console.log(status)
})
```

## Features

| Name                | Description                         |
| ------------------- | :---------------------------------- |
| [update](#update)   | Update Metadata                     |
| [save](#save)       | Save buffer data to individual Tile |
| [delete](#delete)   | Delete individual Tile              |
| [tables](#tables)   | Build SQL Tables                    |
| [findOne](#findone) | Finds one Tile and returns buffer   |

## NodeJS Support

Windows, MacOSX, Linux & Electron

-   ~4.X~
-   ~5.X~
-   6.X
-   7.X (not supported by Electron yet)

## API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

### index

GeoPackage

**Parameters**

-   `uri` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** Path to GeoPacakge

**Examples**

```javascript
const gpkg = new GeoPackage('example.gpkg')
//=gpkg
```

Returns **GeoPackage** GeoPackage

#### tables

Build SQL tables

**Examples**

```javascript
gpkg.tables()
  .then(status => console.log(status))
```

Returns **[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;[boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean)>** true when SQL tables are built

#### update

Update Metadata

**Parameters**

-   `metadata` **Metadata** Metadata according to MBTiles spec 1.1.0 (optional, default `{}`)
    -   `metadata.description` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** Description
    -   `metadata.maxzoom` **[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)** Maximum zoom level

**Examples**

```javascript
const metadata = {
  description: 'Example Description',
  maxzoom: 3
}
gpkg.update(metadata)
  .then(metadata => console.log(metadata))
```

Returns **[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;Metadata>** Metadata

#### save

Save buffer data to individual Tile

**Parameters**

-   `tile` **Tile** Tile [x, y, z]
-   `image` **[Buffer](https://nodejs.org/api/buffer.html)** Tile image

**Examples**

```javascript
gpkg.save([x, y, z], buffer)
  .then(status => console.log(status))
```

Returns **[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;[boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean)>** 

#### delete

Delete individual Tile

**Parameters**

-   `tile` **Tile** Tile [x, y, z]

**Examples**

```javascript
gpkg.delete([x, y, z])
  .then(status => console.log(status))
```

Returns **[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;[boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean)>** 

#### findOne

Finds one Tile and returns Buffer

**Parameters**

-   `tile` **Tile** Tile [x, y, z]

**Examples**

```javascript
gpkg.findOne([x, y, z])
  .then(image => console.log(image))
```

Returns **[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;([Buffer](https://nodejs.org/api/buffer.html) \| [undefined](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/undefined))>** Tile Data
