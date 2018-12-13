const Protocol = require('./src/protocol')
const net = require('net')
const argv = require('yargs').argv
const debug = require('debug')('illuminate:main')
const parse = require('color-parse')

const hosts = argv._[0].split(',')
const command = argv._[1]
const args = argv._.slice(2)

for (const host of hosts) {
  const client = new net.Socket()
  console.log(host, command, ...args)
  client.connect(5577, host, function () {
    const protocol = new Protocol(client)
    let params = []
    let response = null

    // console.log(colors)
    if (command in protocol) {
      switch (command) {
        case 'updateColor':
          if (args.length === 1) {
            params = [parse(args[0]).values.concat(0)] // [ R, G, B, 0 ]
          } else {
            params = [args.map((number) => parseInt(number))]
          }
          break
        case 'updateColors':
          params = [args.map((color) => parse(color).values)]
          break
        case 'custom':
          params.push(args[0])
          params.push(args[1])
          params = params.concat(args.slice(2).map((color) => parse(color).values))
          break
        case 'program':
          params = args.map((number) => parseInt(number, 10))
          break
      }
      debug('parameters', params)
      response = protocol[command].apply(protocol, params)
    }

    Promise.resolve(response).then(() => {
      client.destroy()
    })
  })
}
