const debug = require('debug')('illuminate:protocol')

module.exports = class Illuminate {
  /*
  * @constructor
  * @param {Socket} client
  */

  constructor (client) {
    this.client = client
  }

  /* Off
  *
  * Sent
  * Byte: 0xcc
  * Byte: 0x24
  * Byte: 0x33
  *
  * Receieved
  * Byte: 0xee
  * Byte: 0x24
  * Byte: 0x11
  */

  off () {
    const response = this._receiveMessage((data) => {
      if (data[1] === 0x24) {
        console.log('lights are off')
      }
    })

    this._sendMessage([0xcc, 0x24, 0x33])

    return response
  }

  /* On
  *
  * Sent
  * Byte: 0xcc
  * Byte: 0x23
  * Byte: 0x33
  *
  * Receieved
  * Byte: 0xee
  * Byte: 0x23
  * Byte: 0x11
  */

  on () {
    const response = this._receiveMessage((data) => {
      if (data[1] === 0x23) {
        console.log('lights are on')
      }
    })

    this._sendMessage([0xcc, 0x23, 0x33])

    return response
  }

  /* Connect
  *
  * Sent
  * Byte: 0xEF
  * Byte: 0x01 ??
  * Byte: 0x77
  *
  * Response
  * Byte: 0x66
  * Byte: 0xF1 ??
  * Byte: 0x23 = on, 0x24 = off
  * Byte: 0x25-0x39 Program number 0x40 = custom, 0x41 = static single color, 0x42 = static multicolor
  * Byte: 0x21 ??
  * Byte: 0x1f Speed
  * Byte: 0x00 R-value
  * Byte: 0x00 G-value
  * Byte: 0x00 B-value
  * Byte: 0x00 Warm value
  * Byte: 0x03 ??
  * Byte: 0x06 ??
  * Byte: 0x99
  */

  status () {
    const response = this._receiveMessage((data) => {
      if (data.length > 9) {
        if (data[2] === 0x23) { console.log('lights are on') }
        if (data[2] === 0x24) { console.log('lights are off') }
        console.log('program number', data[3])
        console.log('speed', data[4])
        console.log('red', data[6], 'green', data[7], 'blue', data[8], 'white', data[9])
      }
    })

    this._sendMessage([0xef, 0x01, 0x77])

    return response
  }

  /* Update Colors
  *
  * Sent
  * Byte: 0x56
  * Byte: R-Value
  * Byte: G-Value
  * Byte: B-Value
  * Byte: Warm value?
  * Byte: 0xAA
  *
  * Response
  * None
  */

  updateColor (color) {
    this._sendMessage([0x56].concat(color).concat(0xAA))
  }

  warm () {
    this.updateColor([0, 0, 0, 255])
  }

  cool () {
    this.updateColor([255, 255, 255, 0])
  }

  bright () {
    this.updateColor([255, 255, 255, 255])
  }

  /* Update Pattern
  *
  * Sent
  * Byte: 0x88
  * Byte: 0x05 Number of colors?
  * 3 Bytes: ff 00 00 Color 1?
  * 3 Bytes: ff 4e 00 Color 2?
  * 3 Bytes: 00 c8 00 Color 3
  * 3 Bytes: 00 00 ff Color 4
  * 3 Bytes: 80 00 80 Color 5
  * Byte: 0x55
  *
  */

  updateColors (colors) {
    let ary = [0x88]
    ary = ary.concat(colors.length)
    for (var idx = 0; idx < colors.length; idx++) {
      ary = ary.concat(colors[idx])
    }
    ary = ary.concat(0x55)
    this._sendMessage(ary)
  }

  /* Custom
  *
  * Sent
  * Byte: 0x99
  * 3 Bytes: ff 00 00 Color 1?
  * 3 Bytes: ff 7c 00
  * 3 Bytes: ff d9 00
  * 3 Bytes: 01 02 03
  * 3 Bytes: 01 02 03
  * 3 Bytes: 01 02 03
  * 3 Bytes: 01 02 03
  * 3 Bytes: 01 02 03
  * 3 Bytes: 01 02 03
  * 3 Bytes: 01 02 03
  * 3 Bytes: 01 02 03
  * 3 Bytes: 01 02 03
  * 3 Bytes: 01 02 03
  * 3 Bytes: 01 02 03
  * 3 Bytes: 01 02 03
  * 3 Bytes: 01 02 03 Color 16?
  * Byte: 0x64 Speed 0x01 = 100% 0x32 = 50% 0x64 (100) = 0%
  * Byte: 0x3a Mode 0x3a = Gradual, 0x3b = Jumping 0x3c = Fade
  * Byte: 0xff
  * Byte: 0x66
  */

  custom (mode, speed, ...colors) {
    let ary = [0x99]
    for (var idx = 0; idx < 16; idx++) {
      if (idx < colors.length) {
        ary = ary.concat(colors[idx])
      } else {
        ary = ary.concat([1, 2, 3])
      }
    }
    ary = ary.concat(speed)
    ary = ary.concat(mode + 0x39)
    ary = ary.concat([0xff, 0x66])
    console.log(ary)
    this._sendMessage(ary)
  }

  /* Function
  *
  * Sent
  * Byte: 0xbb
  * Byte: 0x28 - Program (Starting at 0x25 and going to 0x39?)
  * Byte: 0x1b - Speed 0 = Fast, 0x63 (99) = slow
  * Byte: 0x44
  */

  program (programNumber, speed) {
    this._sendMessage([0xbb, programNumber + 0x24, speed, 0x44])
  }

  _sendMessage (data) {
    debug('sending <', ...data.map((val) => val.toString(16)), '>')
    this.client.write(new Uint8Array(data), 'binary')
  }

  async _receiveMessage (cb) {
    const response = new Promise((resolve) => {
      this.client.on('data', (data) => {
        debug('receieved <', ...Array.from(data.values()).map((val) => val.toString(16)), '>')
        cb(data)
        resolve()
      })
      this.client.on('error', (error) => {
        console.error(error.message)
        resolve()
      })
    })
    return response
  }
}
