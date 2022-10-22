import { createServer } from 'vite'
import { ViteNodeServer } from 'vite-node/server'
import { ViteNodeRunner } from 'vite-node/client'

/**
 * This build configuration file is used to run the development server.
 * It is used in conjunction with ./vite.config.js
 *
 */

// create vite server
const server = await createServer()
// this is need to initialize the plugins
await server.pluginContainer.buildStart({})

// create vite-node server
const node = new ViteNodeServer(server)
let stop
let isStarting = false

const rerun = async () => {
  console.log("RERUN, isStarting=", isStarting)
  if (isStarting) return
  isStarting = true
  let runner = new ViteNodeRunner({
    root: server.config.root,
    base: server.config.base,
    fetchModule(id) {
      //console.log(`fetchModule ${id}`)
      return node.fetchModule(id)
    },
    resolveId(id, importer) {
     //console.log(`resolveId ${id}`)
      return node.resolveId(id, importer)
    }
  })

  console.log("Attempting to listen", stop)

  try {
    const { listen } = await runner.executeFile('./src/server-listener.ts')
    if (stop) {
      try {
      await stop()
      } catch(ex) {
        console.error(ex)
      }
    }
    console.log("STOPPED.  Now listening, server.HMR", !!stop )
    stop = listen({ 'server.HMR': !!stop })
  } catch (error) {
    if (typeof error === 'string') {
      console.error(error)
    }

    if (error instanceof Error) {
      console.error(error)
    }

    console.error("Unknown Error")
    
  }
  isStarting = false
}

server.watcher.on('all', rerun)

await rerun()
