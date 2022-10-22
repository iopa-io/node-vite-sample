import type {
  HandlerResultNotNull,
  IContextIopa,
  IRouterApp
} from '@iopa/types'
import { RouterApp } from 'iopa'
import SchemaRouterMiddleware from '@iopa/schema-router'
import { listen as listenApp } from '@iopa/edge-nodejs'
import LoggingMiddleware from '@iopa/logger'
import useRoutes from './router'
import { HttpError } from './types'

export function listen(options?: {
  'server.HMR'?: boolean
}): () => Promise<void> {
  console.log('Starting Iopa Edge Server')

  const app: IRouterApp = new RouterApp(options)
  function NotFound(context: IContextIopa): HandlerResultNotNull {
    return context.respondWith('Not Found', 404)
  }
  NotFound.id = 'DefaultApp'
  app.properties.set('server.NotFound', NotFound)

  function ErrorHandler(
    ex: Error,
    context: IContextIopa
  ): HandlerResultNotNull {
    context.response.headers.set(
      'Access-Control-Allow-Origin',
      context.headers.get('origin') || '*'
    )
    return context.respondWith(
      `Error ${ex.name}\n\r${ex.message}`,
      (ex as HttpError).statusCode || 500
    )
  }
  ErrorHandler.id = 'ErrorHandler'
  app.properties.set('server.ErrorHandler', ErrorHandler)

  app.use(LoggingMiddleware, 'LoggingMiddleware')

  app.use((context, next) => {
    context.response.headers.set(
      'Access-Control-Allow-Origin',
      context.headers.get('origin') || '*'
    )
    return next()
  }, 'Access-Control-Allow-Origin')

  app.use(SchemaRouterMiddleware, 'Schema Router')

  app.options('*', async (context, next) => {
    return context.respondWith(undefined, {
      status: 200,
      headers: {
        'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        Vary: 'Origin'
      }
    })
  })

  useRoutes(app)

  app.build()

  return listenApp(app)
}
