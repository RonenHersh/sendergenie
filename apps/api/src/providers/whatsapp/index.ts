import type { Workspace } from '../../db/schema.js'
import { WaAPIProvider } from './waapi.provider.js'
import { MetaCloudProvider } from './meta.provider.js'
import { MockWhatsAppProvider } from './mock.provider.js'
import type { WhatsAppProvider } from './types.js'

export * from './types.js'

/**
 * Factory — returns the correct provider based on workspace config.
 *
 * Provider selection order:
 * 1. If NODE_ENV=development AND no WaAPI/Meta config → MockProvider (free, no setup)
 * 2. waapi  → WaAPIProvider
 * 3. meta   → MetaCloudProvider
 *
 * Switching providers = change workspace.whatsapp_provider + add config. Zero code changes.
 */
export function getWhatsAppProvider(workspace: Workspace): WhatsAppProvider {
  const config = workspace.whatsapp_config ?? {}
  const isDev = process.env['NODE_ENV'] !== 'production'

  switch (workspace.whatsapp_provider) {
    case 'waapi': {
      // Fall back to mock in dev if not configured
      if (!config['waapi_instance_id'] || !config['waapi_token']) {
        if (isDev) {
          console.warn(`[Provider] WaAPI not configured — using MockProvider for workspace ${workspace.id}`)
          return new MockWhatsAppProvider()
        }
        throw new Error(`WaAPI not configured for workspace ${workspace.id}`)
      }
      return new WaAPIProvider({
        instance_id: config['waapi_instance_id'],
        token: config['waapi_token'],
      })
    }

    case 'meta': {
      if (!config['meta_phone_number_id'] || !config['meta_access_token']) {
        if (isDev) {
          console.warn(`[Provider] Meta not configured — using MockProvider for workspace ${workspace.id}`)
          return new MockWhatsAppProvider()
        }
        throw new Error(`Meta Cloud API not configured for workspace ${workspace.id}`)
      }
      return new MetaCloudProvider({
        phone_number_id: config['meta_phone_number_id'],
        access_token: config['meta_access_token'],
        verify_token: config['meta_verify_token'],
        app_secret: config['meta_app_secret'],
      })
    }

    default:
      throw new Error(`Unknown WhatsApp provider: ${workspace.whatsapp_provider}`)
  }
}
