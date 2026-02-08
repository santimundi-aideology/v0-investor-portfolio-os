import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../property-intake/cma/route'
import { NextRequest } from 'next/server'

// Mock Supabase client
vi.mock('@/lib/db/client', () => ({
  getSupabaseAdminClient: vi.fn(() => ({
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null })),
            })),
          })),
        })),
      })),
    })),
  })),
}))

vi.mock('@/lib/auth/server', () => ({
  requireAuthContext: vi.fn(() => Promise.resolve({
    userId: 'test-user',
    tenantId: 'test-tenant',
    role: 'agent',
  })),
}))

describe('POST /api/property-intake/cma', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should validate request body', async () => {
    const req = new NextRequest('http://localhost/api/property-intake/cma', {
      method: 'POST',
      body: JSON.stringify({
        area: '', // Invalid: empty area
        askingPrice: 1000000,
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('should require area and asking price', async () => {
    const req = new NextRequest('http://localhost/api/property-intake/cma', {
      method: 'POST',
      body: JSON.stringify({
        propertyType: 'Unit',
        bedrooms: 2,
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('should accept valid CMA request', async () => {
    const req = new NextRequest('http://localhost/api/property-intake/cma', {
      method: 'POST',
      body: JSON.stringify({
        area: 'Dubai Marina',
        propertyType: 'Unit',
        bedrooms: 2,
        sizeSqft: 1200,
        askingPrice: 1_500_000,
        buildingName: 'Marina Tower',
      }),
    })

    const response = await POST(req)
    
    // Should not return validation error
    expect(response.status).not.toBe(400)
  })
})
