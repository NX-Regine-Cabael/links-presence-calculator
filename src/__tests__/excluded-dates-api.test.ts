import { POST } from '@/app/api/excluded-dates/route'

// Only the rejection paths are exercised here: they return 400 before ever
// reaching storage, so no filesystem write happens during these tests.
function postReq(body: unknown): Request {
  return new Request('http://localhost/api/excluded-dates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/excluded-dates validation', () => {
  test('rejects a non-array body', async () => {
    const res = await POST(postReq({ not: 'an array' }))
    expect(res.status).toBe(400)
  })

  test('rejects non-string elements', async () => {
    const res = await POST(postReq(['2026-06-08', 123]))
    expect(res.status).toBe(400)
  })

  test('rejects malformed date strings', async () => {
    const res = await POST(postReq(['2026-6-8']))
    expect(res.status).toBe(400)
  })

  test('rejects syntactically valid but impossible dates (month 13)', async () => {
    const res = await POST(postReq(['2026-13-01']))
    expect(res.status).toBe(400)
  })

  test('rejects syntactically valid but impossible dates (Feb 31)', async () => {
    const res = await POST(postReq(['2026-02-31']))
    expect(res.status).toBe(400)
  })

  test('rejects arrays longer than the cap', async () => {
    const tooMany = Array.from({ length: 2001 }, () => '2026-06-08')
    const res = await POST(postReq(tooMany))
    expect(res.status).toBe(400)
  })
})
