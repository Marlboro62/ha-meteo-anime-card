# Météo animée — carte Home Assistant

Carte Lovelace inspirée de l'appli météo des tablettes Android : **le fond s'anime selon la météo en direct**.

- **Ciel en WebGL** : nuages volumétriques générés en temps réel, éclairés par le soleil (placé selon sa vraie position via `sun.sun`), lueurs d'aube et de crépuscule, lune texturée et étoiles qui scintillent, brouillard qui dérive. Les changements de météo se font en fondu progressif.
- **Particules** : pluie sur trois plans de profondeur avec éclaboussures, gouttes qui se posent et glissent sur la vitre, neige en bokeh, grêle qui rebondit, éclairs ramifiés qui illuminent les nuages de l'intérieur.
- Si le WebGL n'est pas disponible (ou si le GPU décroche), la carte repasse automatiquement en rendu CSS léger.

Contenu : température actuelle, vigilance Météo-France, prévisions sur 5 jours avec barres min/max, courbe sur 24 h, tuiles UV / humidité / ressenti / vent (rose des vents) / lever-coucher du soleil / pression.

Un seul fichier JS, sans dépendance ni build.

## Installation

1. Copier `meteo-anime-card.js` dans `/config/www/meteo-anime-card/` sur Home Assistant.
2. *Paramètres → Tableaux de bord → ⋮ → Ressources → Ajouter* :
   - URL : `/local/meteo-anime-card/meteo-anime-card.js?v=0.2.1`
   - Type : **Module JavaScript**
3. Recharger le navigateur (ou vider le cache de Fully Kiosk sur la tablette).

> À chaque mise à jour du fichier, incrémenter `?v=` dans l'URL de la ressource pour forcer le rechargement.

## Configuration

```yaml
type: custom:meteo-anime-card
entity: weather.ma_ville
alert_entity: sensor.vigilance_meteo_departement
name: Ma ville
```

| Option | Défaut | Rôle |
|---|---|---|
| `entity` | — (obligatoire) | Entité `weather.*` |
| `alert_entity` | — | Capteur de vigilance Météo-France (bandeau si Jaune/Orange/Rouge) |
| `aqi_entity` | — | Capteur d'indice de qualité de l'air (pastille « IQA ») |
| `sun_entity` | `sun.sun` | Jour/nuit, lever/coucher |
| `name` | nom du domicile HA | Titre |
| `days` / `hours` | `5` / `24` | Nombre de jours / d'heures affichés |
| `show_daily` / `show_hourly` / `show_tiles` | `true` | Afficher chaque bloc |
| `show_attribution` | `true` | Ligne « Data provided by… » |
| `animations` | `true` | `false` = fond figé (économie batterie) |
| `quality` | `medium` | Rendu du ciel WebGL : `high`, `medium`, `low`, ou `css` (ancien rendu léger, sans WebGL) |
| `fps` | `30` | Images/s du canvas (pluie, neige…) |
| `min_height` | `auto` | Ex. `100vh` pour remplir l'écran de la tablette |
| `demo_condition` | — | Forcer une météo pour tester (`rainy`, `snowy`, `lightning-rainy`…) |
| `demo_night` | — | `true`/`false` pour forcer nuit/jour |

## Tablette Android (mode kiosque)

- **Fully Kiosk Browser** : écran toujours allumé, démarrage auto, masquer la barre d'état.
- Créer un tableau de bord dédié, vue de type **Panneau (1 carte)**, avec `min_height: 100vh`.

## Démo hors Home Assistant

```powershell
python -m http.server 8765 --directory C:\ha-meteo-anime-card
```

Puis ouvrir <http://127.0.0.1:8765/demo/> : boutons pour changer de météo, jour/nuit et niveau de vigilance.
