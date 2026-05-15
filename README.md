# Pulse Abidjan — Dashboard

Dashboard matinal simple pour Abidjan affichant météo, taux de change, news et tip culturel.

Fichiers clés
- `index.html` — page principale
- `css/style.css` — styles
- `js/app.js` — logique client pour récupérer données publiques

APIs publiques utilisées (sans clé)
- Open-Meteo — météo (https://open-meteo.com)
- exchangerate.host — taux de change (https://exchangerate.host)
- BBC Africa RSS proxy via allorigins (https://api.allorigins.win) — news
 - Google News (Côte d'Ivoire) used as additional fallback via RSS
 - (tip culturel removed)

Lancer localement
1. Ouvrir `index.html` directement dans le navigateur :
```bash
open index.html
```

2. Ou servir via un serveur statique (recommandé pour éviter certains CORS) :
```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

Proxy Node (option recommandé pour fiabilité)
1. Installer les dépendances :
```bash
npm install
```
2. Lancer le serveur proxy :
```bash
npm start
# ouvre http://localhost:3000 ; le frontend utilisera /api/* pour récupérer les données
```

Notes
- Certaines proxys publiques peuvent limiter les requêtes. Si vous avez besoin d'une intégration robuste, envisagez un petit backend pour relayer les appels.

Flux RSS locaux essayés dans l'ordre (via proxy allorigins) :
- Google News (Côte d'Ivoire) — search RSS
- abidjan.net — https://www.abidjan.net/rss/actus.xml
- Fratmat — https://www.fratmat.info/feed/
- Afrique-sur7 — https://www.afrique-sur7.ci/rss
- Koaci — https://www.koaci.com/feed
- Linfodrome — https://www.linfodrome.com/rss
# pulseabidjan
