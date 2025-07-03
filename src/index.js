export default {
  async fetch(request) {
    const url = new URL(request.url)
    const target = url.searchParams.get('target')

    if (!target || !target.startsWith('https://api.kraken.com')) {
      return new Response(JSON.stringify({ error: 'Invalid or missing "target" parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    try {
      const krakenRes = await fetch(target)
      const data = await krakenRes.text()

      return new Response(data, {
        status: krakenRes.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store'
        }
      })
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }
  }
}
