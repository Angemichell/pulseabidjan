const express = require('express')
const fetch = require('node-fetch')
const {parseStringPromise} = require('xml2js')
const app = express()
const PORT = process.env.PORT || 3000

app.use(express.static('.'))

// Simple CORS middleware to allow requests from other local ports during development
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

// Weather proxy
app.get('/api/weather', async (req, res) => {
  try{
    const lat = req.query.lat || '5.36'
    const lon = req.query.lon || '-4.01'
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
    const r = await fetch(url)
    const j = await r.json()
    res.json(j)
  }catch(e){res.status(500).json({error: e.message})}
})

// Rates proxy
app.get('/api/rates', async (req, res) => {
  try{
    // Use open.er-api.com which exposes up-to-date rates without an API key
    // Get base USD and EUR data and read XOF rate
    const rUsd = await fetch('https://open.er-api.com/v6/latest/USD')
    const jUsd = rUsd.ok ? await rUsd.json() : null
    const rEur = await fetch('https://open.er-api.com/v6/latest/EUR')
    const jEur = rEur.ok ? await rEur.json() : null

    const rates = {}
    if(jUsd && jUsd.rates && jUsd.rates.XOF){
      const xofPerUsd = jUsd.rates.XOF
      // frontend expects data.rates.USD = USD per XOF (1 XOF = x USD)
      rates.USD = +(1 / xofPerUsd).toFixed(8)
    }
    if(jEur && jEur.rates && jEur.rates.XOF){
      const xofPerEur = jEur.rates.XOF
      rates.EUR = +(1 / xofPerEur).toFixed(8)
    }
    res.json({success:true, rates})
  }catch(e){
    res.status(500).json({error: e.message})
  }
})

// Simple in-memory cache
const cache = {}
function setCache(key, value, ttl=120){
  cache[key] = {value, expires: Date.now() + ttl*1000}
}
function getCache(key){
  const e = cache[key]
  if(!e) return null
  if(Date.now() > e.expires){ delete cache[key]; return null }
  return e.value
}

// News proxy (aggregate multiple RSS sources, use cache)
app.get('/api/news', async (req, res) => {
  const cached = getCache('news_all')
  if(cached) return res.json(cached)

  const feeds = [
    {name:'Google News CI', url:'https://news.google.com/rss/search?q=Côte+d%27Ivoire&hl=fr&gl=FR&ceid=FR:fr'},
    {name:'Abidjan.net', url:'https://www.abidjan.net/rss/actus.xml'},
    {name:'Fratmat', url:'https://www.fratmat.info/feed/'},
    {name:'Afrique-sur7', url:'https://www.afrique-sur7.ci/rss'},
    {name:'Koaci', url:'https://www.koaci.com/feed'},
    {name:'Linfodrome', url:'https://www.linfodrome.com/rss'}
  ]

  const sources = []
  for(const src of feeds){
    try{
      const r = await fetch(src.url)
      if(!r.ok) { sources.push({name:src.name, url:src.url, ok:false, items:[]}); continue }
      const text = await r.text()
      const xml = await parseStringPromise(text)
      const items = xml.rss?.channel?.[0]?.item || xml.feed?.entry || []
      const normalized = (items || []).slice(0,6).map(it=>{
        const title = (it.title && it.title[0]) || it.title || ''
        const link = (it.link && (it.link[0]?.href || it.link[0])) || it.link || ''
        return {title, link}
      })
      sources.push({name:src.name, url:src.url, ok:true, items: normalized})
    }catch(e){
      sources.push({name:src.name, url:src.url, ok:false, items:[]})
    }
  }

  const out = {sources, fetched_at: new Date().toISOString()}
  setCache('news_all', out, 180) // cache 3 minutes
  res.json(out)
})

// Tip proxy
app.get('/api/tip', async (req, res) => {
  try{
    try{
      const r = await fetch('https://api.quotable.io/random')
      if(r.ok){
        const j = await r.json()
        return res.json(j)
      }
    }catch(e){/* fallthrough */}
    // fallback to type.fit (returns array)
    try{
      const r2 = await fetch('https://type.fit/api/quotes')
      if(r2.ok){
        const arr = await r2.json()
        const pick = arr[Math.floor(Math.random()*arr.length)]
        return res.json({content: pick.text, author: pick.author})
      }
    }catch(e){/* fallthrough */}
    res.status(502).json({error:'No quote available'})
  }catch(e){res.status(500).json({error: e.message})}
})

app.listen(PORT, ()=>console.log(`Server running on http://localhost:${PORT}`))
