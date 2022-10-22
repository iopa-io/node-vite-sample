import type { IRouterApp } from '@iopa/types'

export default function (app: IRouterApp) {
  app.get('/api/version', async (context) => {
    return `NODE VITE SAMPLE SERVER v${process.env.PACKAGE_VERSION} ${
      process.env.NODE_ENV?.toUpperCase() || ' '
    }`
  })
}
