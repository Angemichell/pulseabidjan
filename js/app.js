const SELECTORS = {
  weatherTemp: '#weather-temp',
  weatherDesc: '#weather-desc',
  weatherExtra: '#weather-extra',
  usdXof: '#usd-xof',
  eurXof: '#eur-xof',
  newsList: '#news-list',
  // tip removed
  
}

function qs(sel){return document.querySelector(sel)}

// Helper to try local proxy on same origin, then explicit Node proxy at 3000
async function fetchProxy(path){
  // try relative first
  try{
    const r = await fetch(path)
    if(r.ok && (r.headers.get('content-type')||'').includes('application/json')) return r
  }catch(e){ /* ignore */ }
  // try explicit proxy on port 3000
  try{
    const url = 'http://localhost:3000' + path
    const r2 = await fetch(url)
    if(r2.ok && (r2.headers.get('content-type')||'').includes('application/json')) return r2
  }catch(e){ /* ignore */ }
  return null
}

// Copilot-generated fetchWeather: uses Open-Meteo current_weather for Abidjan
async function fetchWeather(){
  const lat = 5.36, lon = -4.01
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`

  // map Open-Meteo weathercode to emoji/icon and description
  const weatherMap = {
    0: {icon:'☀️', text:'Ciel dégagé'},
    1: {icon:'🌤️', text:'Peu nuageux'},
    2: {icon:'⛅', text:'Partiellement nuageux'},
    3: {icon:'☁️', text:'Couvert'},
    45: {icon:'🌫️', text:'Brouillard'},
    48: {icon:'🌫️', text:'Dépôts de givre'},
    51: {icon:'🌦️', text:'Bruine légère'},
    53: {icon:'🌦️', text:'Bruine modérée'},
    55: {icon:'🌧️', text:'Bruine dense'},
    61: {icon:'🌧️', text:'Pluie légère'},
    63: {icon:'🌧️', text:'Pluie modérée'},
    65: {icon:'⛈️', text:'Pluie forte'},
    71: {icon:'🌨️', text:'Neige légère'},
    73: {icon:'🌨️', text:'Neige modérée'},
    75: {icon:'❄️', text:'Tempête de neige'},
    80: {icon:'🌧️', text:'Averses légères'},
    81: {icon:'🌧️', text:'Averses'},
    82: {icon:'⛈️', text:'Averses intenses'},
    95: {icon:'⚡', text:'Orage'},
    96: {icon:'⛈️', text:'Orage léger'},
    99: {icon:'⛈️', text:'Orage violent'}
  }

  try{
    // Try local proxy first, but guard against HTML/404 responses
    let data = null
    try{
      const r = await fetchProxy('/api/weather')
      if(r) data = await r.json()
    }catch(e){ /* proxy not available or network error */ }

    if(!data){
      // fallback to direct Open-Meteo
      const r2 = await fetch(url)
      if(r2.ok) data = await r2.json()
    }

    if(data && data.current_weather){
      const cur = data.current_weather
      const code = cur.weathercode
      const mw = weatherMap[code] || {iconSvg:'sun', text:'Inconnu'}
      // replace SVG inside #weather-icon based on mapping
      const iconEl = qs('#weather-icon')
      if(mw.iconSvg){
        // simple set: small set of inline SVGs
        const svgs = {
          sun: `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="4" fill="#FFD54A"/></svg>`,
          cloud: `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 17.58A4 4 0 0016 10H15a5 5 0 00-9.9 1A3.5 3.5 0 005.5 20H19a3 3 0 001-2.42z" fill="#cbd5e1"/></svg>`,
          rain: `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 17.58A4 4 0 0016 10H15a5 5 0 00-9.9 1A3.5 3.5 0 005.5 20H19a3 3 0 001-2.42z" fill="#cbd5e1"/><path d="M8 20l1.5-2M12 20l1.5-2M16 20l1.5-2" stroke="#3b82f6" stroke-linecap="round"/></svg>`,
          storm: `<svg width="44" height="44" viewBox="0 0 24 24"><path d="M13 11l-4 6h6l-2 4" fill="#f59e0b"/></svg>`
        }
        iconEl.innerHTML = svgs[mw.iconSvg] || svgs.sun
      }
      qs(SELECTORS.weatherTemp).textContent = `${Math.round(cur.temperature)}°C`
      qs(SELECTORS.weatherDesc).textContent = `${mw.text} • Vent ${cur.windspeed} km/h`
    }else{
      qs(SELECTORS.weatherDesc).textContent = 'Météo indisponible'
    }
  }catch(err){
    console.error('fetchWeather error',err)
    qs(SELECTORS.weatherDesc).textContent = 'Erreur récupération météo'
  }
}

// refresh weather every 10 minutes
setInterval(fetchWeather, 10 * 60 * 1000)
// fetch currency rates and display XOF per USD / EUR
async function fetchRates(){
  try{
    let data = null
    try{
      const r = await fetchProxy('/api/rates')
      if(r) data = await r.json()
    }catch(e){ /* ignore proxy error */ }

    if(!data){
      // fallback to a public rates API (base XOF)
      const r2 = await fetch('https://open.er-api.com/v6/latest/XOF')
      if(r2.ok) data = await r2.json()
    }

    let usdPerXof = null, eurPerXof = null
    if(data && data.rates){
      usdPerXof = data.rates.USD
      eurPerXof = data.rates.EUR
    }

    if(usdPerXof && eurPerXof){
      const xofPerUsd = (1 / usdPerXof).toFixed(2)
      const xofPerEur = (1 / eurPerXof).toFixed(2)
      qs(SELECTORS.usdXof).textContent = xofPerUsd + ' XOF'
      qs(SELECTORS.eurXof).textContent = xofPerEur + ' XOF'
      return
    }

    qs(SELECTORS.usdXof).textContent = 'N/A'
    qs(SELECTORS.eurXof).textContent = 'N/A'
  }catch(e){
    console.error('rates',e)
    qs(SELECTORS.usdXof).textContent='Erreur'
    qs(SELECTORS.eurXof).textContent='Erreur'
  }
}

async function fetchNews(){
  const feeds = [
    'https://news.google.com/rss/search?q=Côte+d%27Ivoire&hl=fr&gl=FR&ceid=FR:fr',
    'https://www.abidjan.net/rss/actus.xml',
    'https://www.fratmat.info/feed/',
    'https://www.afrique-sur7.ci/rss',
    'https://www.koaci.com/feed',
    'https://www.linfodrome.com/rss'
  ]

  const list = qs(SELECTORS.newsList)
  list.innerHTML = '<li>Recherche des flux locaux…</li>'

  // First try server proxy /api/news
  try{
    const r = await fetchProxy('/api/news')
    if(r){
      const j = await r.json()
      // server returns aggregated sources; pick the first source with items
      if(j && j.sources && j.sources.length){
        const first = j.sources.find(s=>s.items && s.items.length)
        if(first){
          list.innerHTML = ''
          first.items.slice(0,6).forEach(it=>{
            const li = document.createElement('li')
            li.innerHTML = `<a href="${it.link}" target="_blank" rel="noopener noreferrer">${it.title}</a>`
            list.appendChild(li)
          })
          return
        }
      }
    }
  }catch(e){
    console.warn('proxy /api/news failed', e)
  }

  // Fallback: try direct RSS via allorigins
  for(const feed of feeds){
    try{
      const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(feed)}`
      const r = await fetch(proxy)
      if(!r.ok) continue
      const text = await r.text()
      const parser = new DOMParser()
      const xml = parser.parseFromString(text, 'application/xml')
      const items = xml.querySelectorAll('item')
      if(items && items.length){
        list.innerHTML = ''
        Array.from(items).slice(0,6).forEach(item=>{
          const title = item.querySelector('title')?.textContent || '—'
          const link = item.querySelector('link')?.textContent || '#'
          const li = document.createElement('li')
          li.innerHTML = `<a href="${link}" target="_blank" rel="noopener noreferrer">${title}</a>`
          list.appendChild(li)
        })
        return
      }
    }catch(e){
      console.warn('feed failed',feed,e)
    }
  }

  qs(SELECTORS.newsList).innerHTML = '<li>Erreur récupération news</li>'
}

// tip functionality removed per user request

async function init(){
  await Promise.all([fetchWeather(), fetchRates(), fetchNews()])
}

document.addEventListener('DOMContentLoaded', init)
