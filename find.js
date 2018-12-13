const dgram = require('dgram')
const os = require('os')

const debug = require('debug')('illuminate:find')

const server = dgram.createSocket('udp4')

const PORT = 48899
const MESSAGE = 'HF-A11ASSISTHREAD'
const addresses = []

const networkInterfaces = os.networkInterfaces()
for (const name in networkInterfaces) {
  const networkInterface = networkInterfaces[name]
  for (const addressData of networkInterface) {
    if (addressData.family !== 'IPv4') {
      continue
    }
    if (addressData.internal) {
      continue
    }

    const addressParts = addressData.address.split('.').map((val) => parseInt(val, 10))
    const netmaskParts = addressData.netmask.split('.').map((val) => parseInt(val, 10))
    const broadCastAddress = addressParts.map((val, idx) => val | (netmaskParts[idx] ^ 0xff)).join('.')

    debug('Scanning', broadCastAddress)
    server.bind(PORT, () => {
      server.setBroadcast(true)
      server.send(MESSAGE, 0, MESSAGE.length, PORT, broadCastAddress, () => {
        debug('Sending', MESSAGE)
      })
    })

    server.on('message', (msg) => {
      const message = msg.toString()
      const parts = message.split(',')
      debug('Received', message)
      if (parts.length === 3 && parts[2] === 'HF-A11-PLP001') {
        addresses.push(parts[0])
      }
    })

    setTimeout(() => {
      if (addresses.length) {
        console.log('Found lights at:', addresses.join(','))
      } else {
        console.log('No lights found')
      }
      server.close()
    }, 5000)
  }
}
