import { GET, POST } from '@/app/api/backup/route'
import { BACKUP_VERSION } from '@/lib/backup'

// Only GET (read-only) and POST rejection paths are exercised: invalid bodies
// return 400 before reaching storage, so these tests never write to disk.
function postReq(body: unknown): Request {
  return new Request('http://localhost/api/backup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('GET /api/backup', () => {
  test('returns a versioned backup envelope', async () => {
    const res = GET()
    const data = await res.json()
    expect(data.version).toBe(BACKUP_VERSION)
    expect(data).toHaveProperty('records')
    expect(data).toHaveProperty('prefs')
  })
})

describe('POST /api/backup validation', () => {
  test('rejects a non-object body', async () => {
    const res = await POST(postReq('nope'))
    expect(res.status).toBe(400)
  })

  test('rejects an unsupported version', async () => {
    const res = await POST(postReq({ version: 999, records: null, prefs: { maxAgilePercent: 50 } }))
    expect(res.status).toBe(400)
  })

  test('rejects an out-of-range maxAgilePercent', async () => {
    const res = await POST(postReq({ version: BACKUP_VERSION, records: null, prefs: { maxAgilePercent: 200 } }))
    expect(res.status).toBe(400)
  })

  test('rejects malformed records', async () => {
    const res = await POST(postReq({
      version: BACKUP_VERSION,
      records: { employee: { userId: 'U1' }, imports: [], days: [] },
      prefs: { maxAgilePercent: 50 },
    }))
    expect(res.status).toBe(400)
  })
})
