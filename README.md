# Symposium on Supergeometry, Algebraic Geometry and Foliations (FOLGA 2026)

Site: https://folgaufmg.github.io

Static site (HTML/CSS/JS) published by GitHub Pages.

## Editing the program

The schedule, the speaker list and the talk titles/abstracts are read live from the Google Sheet
"FOLGA 2026 – Schedule (site)":
https://docs.google.com/spreadsheets/d/1LjDuNJF-_lHq8gWNR7sxRQJX-sJJq36G4RgdlvIZVVw/edit

One row per activity. Columns:

| column | meaning |
|---|---|
| day | Mon, Tue, Wed, Thu, Fri |
| start, end | 24h times, e.g. 09:00 (end may be empty) |
| type | talk, coffee, lunch, posters, roundtable, opening, closing, social, reception, free |
| title | talk title (TBA while unknown) or the name of the activity |
| speaker, affiliation | for talks |
| abstract | optional; LaTeX between $...$ is rendered |

The sheet must be shared as "Anyone with the link can view". If it can't be read, the site falls back
to `data/schedule.csv`, a copy kept in this repository.
