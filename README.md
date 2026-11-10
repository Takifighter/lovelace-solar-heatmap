# Solar Heatmap Card

A Home Assistant dashboard card that shows the **yield or consumption of any cumulative meter** as a calendar heatmap: per hour, day, week, month or year. Despite the name, it is not limited to solar. It works for solar (PV) yield, electricity, gas, water or any other counter that keeps increasing.

Two sliders hide everything below or above a range, so your best (or worst) days stand out immediately. With a price entity the card can also show **costs** instead of energy.

> Eine Heatmap-Karte für Home Assistant, die den Ertrag oder Verbrauch eines beliebigen Zählers (Solar, Strom, Gas, Wasser) pro Stunde, Tag, Woche, Monat oder Jahr zeigt. Deutsche Anleitung weiter unten.

![Daily view](https://raw.githubusercontent.com/Takifighter/lovelace-solar-heatmap/main/images/daily.png)

## Features

- Five views: hourly, daily, weekly, monthly, yearly
- Works with any cumulative meter (solar, electricity, gas, water, ...)
- The highest value is always the darkest colour
- Range slider with two handles: only cells inside the range are coloured, everything else turns white
- Counts and percentages of cells below, within and above the range
- **Cost view:** switch between energy and money, using a price entity with its price history
- Hover a cell: the bottom line shows consumption, price and cost, and a floating tooltip follows the mouse (on touch screens it appears when you tap a cell)
- Period dropdown that only offers years / months for which data exists
- Summary under the grid: total, average and best value
- Visual editor, everything also configurable in YAML
- Base colour freely selectable, English and German interface

## Views

| View | One cell is | Grid |
|---|---|---|
| `hourly` | 1 hour | days × hours 0–23 |
| `daily` | 1 day | months × days 1–31 |
| `weekly` | 1 day | calendar weeks × Mon–Sun |
| `monthly` | 1 month | years × months |
| `yearly` | 1 year | one cell per year with the yearly total |

## Requirements

The card reads Home Assistant's **long-term statistics**. Your sensor needs a `state_class` (`total`, `total_increasing` or `measurement`). Best suited is a continuously increasing counter, for example an energy sensor in kWh, a gas meter in m³ or a Riemann sum (integration) sensor. You can check that the sensor has statistics under *Developer tools → Statistics*.

## Installation

### HACS (custom repository)

1. HACS → ⋮ → *Custom repositories*
2. Add `https://github.com/Takifighter/lovelace-solar-heatmap` as type **Dashboard**
3. Install *Solar Heatmap* and reload the browser (Ctrl+F5)

### Manual

1. Copy `solar-heatmap.js` to `/config/www/`
2. *Settings → Dashboards → ⋮ → Resources* → add `/local/solar-heatmap.js` as *JavaScript module*
3. Reload the browser (Ctrl+F5). After replacing the file, change the number in the resource URL (`/local/solar-heatmap.js?v=2`) so the browser loads the new version.

## Configuration

Add the card through the UI (*Solar Heatmap*) or in YAML. One card per meter:

```yaml
type: custom:solar-heatmap
entity: sensor.solar_energy_total
title: Solar yield
view: daily
```

Consumption with costs:

```yaml
type: custom:solar-heatmap
entity: sensor.grid_consumption_total
price_entity: sensor.electricity_price_statistic
title: Electricity
color: "#e05a47"
```

| Option | Default | Description |
|---|---|---|
| `entity` | required | Cumulative meter with long-term statistics |
| `price_entity` | none | Price per unit (for example €/kWh). Enables the cost view |
| `currency` | from price entity | Currency symbol, e.g. `€` |
| `title` | none | Card title; hidden when empty |
| `view` | `daily` | `hourly`, `daily`, `weekly`, `monthly`, `yearly` |
| `color` | `#34c776` | Base colour (hex) |
| `below_color` | `#ffffff` | Colour of cells outside the selected range |
| `decimals` | `1` | Decimal places for the meter value |
| `cost_decimals` | `2` | Decimal places for costs |
| `unit` | from sensor | Unit shown, e.g. `kWh` |
| `rows` | per view | Rows in the *Default* view (hourly 21, daily 12, weekly 20, monthly 5, yearly 10) |
| `max` | highest value | Fixed upper end of the colour scale (meter values only) |
| `stat` | `auto` | `auto`, `change`, `max`, `mean`, `sum` — see below |
| `newest_first` | `false` | Newest row on top |
| `show_view_select` | `true` | Show the view dropdown in the card |
| `show_tooltip` | `true` | Show the floating tooltip at the mouse |
| `language` | `auto` | `auto` (Home Assistant language), `en` or `de` |

### The `stat` option

Leave it on `auto`. For counters that keep increasing the card uses the change per period, which is the yield or consumption. Switch to `max` or `mean` only for sensors that report an instantaneous value (e.g. power in W).

## Cost view

With `price_entity` set, a switch next to the dropdowns toggles between the meter unit and money. In the cost view every cell is **consumption × price**. The sliders, counts, summary and tooltip then work in money.

- The price comes from the price entity's **history**, so a price change is applied from the day it happened. Days before the first recorded price use the first known price.
- Without any statistics the current state of the price entity is used for all days.
- Prices in cents (`ct/kWh`) are converted to euros automatically.
- In the monthly and yearly view a cell can contain several prices; the tooltip then shows the average price (Ø).
- It shows the **energy cost only** (consumption × price). A base fee is not included.

**Recommended price entity:** A `input_number` keeps its history only for the recorder's `purge_keep_days` (10 days by default). To keep the price history permanently, mirror it in a template sensor that has a `state_class`:

1. *Settings → Devices & services → Helpers → Create helper → Template → Sensor*
2. State template: `{{ states('input_number.electricity_price') | float(0) }}`
3. Unit of measurement: `€/kWh`
4. State class: `Measurement`

Use this sensor as `price_entity`. It only records from the moment you create it, so create it before the price changes.

## Troubleshooting

- **Everything empty:** the sensor has no long-term statistics. Check *Developer tools → Statistics*.
- **Odd values:** try `stat: change`.
- **Day boundaries:** days follow your browser's time zone.
- **Old version still shown after an update:** change the number in the resource URL and reload the browser with Ctrl+F5. If a file `solar-heatmap.js.gz` lies next to the `.js` file, delete it.

## License

MIT

---

# Deutsch

Heatmap-Karte für den Ertrag oder Verbrauch eines beliebigen Zählers: Solar, Strom, Gas, Wasser oder alles, was fortlaufend hochzählt. Fünf Ansichten (stündlich, täglich, wöchentlich, monatlich, jährlich), ein Regler mit zwei Griffen (alles außerhalb des Bereichs wird weiß), Zählung der Tage unter, im und über dem Bereich und eine Zusammenfassung mit Summe, Durchschnitt und Höchstwert. Mit einer Preis-Entität zeigt die Karte auch die **Kosten**.

## Voraussetzung

Die Karte liest die **Langzeitstatistiken**. Der Sensor braucht eine `state_class`. Am besten geeignet ist ein fortlaufender Zähler, zum Beispiel ein Energiesensor in kWh, ein Gaszähler in m³ oder ein Riemann-Summensensor. Unter *Entwicklerwerkzeuge → Statistiken* siehst du, ob der Sensor dort steht.

## Installation

1. HACS → ⋮ → *Benutzerdefinierte Repositories*
2. `https://github.com/Takifighter/lovelace-solar-heatmap` als Typ **Dashboard** hinzufügen
3. *Solar Heatmap* installieren, Browser neu laden (Strg+F5)

Danach legst du pro Zähler eine Karte an, wählst den Sensor und die Ansicht. Die Oberfläche gibt es auf Deutsch und Englisch und folgt der Sprache von Home Assistant (Option `language`).

## Kostenansicht

Mit `price_entity` erscheint ein Umschalter neben den Dropdowns. Bei Kosten ist jedes Kästchen **Verbrauch × Preis**. Die Karte nimmt den Preis aus dem **Verlauf** der Preis-Entität, ändert sich der Preis, gilt der neue ab dem Tag der Änderung. Tage vor dem ersten aufgezeichneten Preis nutzen den ersten bekannten. Es sind nur die Arbeitskosten, eine Grundgebühr ist nicht enthalten.

**Empfehlung:** Ein `input_number` behält seinen Verlauf nur so lange wie der Recorder aufbewahrt (Standard 10 Tage). Leg deshalb einen Template-Sensor als Spiegel an (*Einstellungen → Geräte & Dienste → Helfer → Helfer hinzufügen → Template → Sensor*), mit Zustandsvorlage `{{ states('input_number.strompreis') | float(0) }}`, Maßeinheit `€/kWh` und Zustandsklasse *Messung*. Diesen Sensor trägst du als `price_entity` ein. Er zeichnet erst ab dem Anlegen auf, lege ihn also vor einer Preisänderung an.

## Hinweise

- Alles bleibt leer: Der Sensor hat keine Langzeitstatistik.
- Seltsame Werte: im Editor „Wert pro Zeitraum“ auf *Änderung* stellen.
- Die Tagesgrenzen richten sich nach der Zeitzone deines Browsers.
- Nach dem Ersetzen der Datei die Zahl in der Ressource ändern (`?v=2`) und mit Strg+F5 neu laden. Liegt neben der `.js` eine `.js.gz`, lösch sie.
