# Product photos

Drop a photo here named after the product slug and it appears on the shop grid, product page and cart with no
code or database change: `<slug>.webp`, `.jpg`, `.jpeg`, `.png` or `.avif` (first match wins).
Restart the server after adding files (the lookup is cached). Products with no photo keep the illustrated tile.

Guidance
- Shoot or generate on a plain, light backdrop, square-ish (4:3 or 1:1 works; the grid crops to 5:4).
- 1200 px on the long edge is plenty; keep files under about 150 KB (WebP/AVIF).
- The image is decorative (empty alt): the name, price and Access Facts beside it carry the information, so make
  sure the photo does not contradict the Access Facts (hands needed, grip, size).
- Check the licence. Free-plan AI output is often watermarked and/or personal-use only; stock photos need
  attribution or a compatible licence. Only commit images you have the right to publish.
- On Vercel, photos must be listed in `api/index.js` (the `__vercelTrace` block) so they are bundled.

Slugs
- `rocker-knife`: Rocker Knife
- `palm-press-jar-opener`: Palm-Press Jar Opener
- `talking-kitchen-scale`: Talking Kitchen Scale
- `tilt-pour-kettle-stand`: Tilt-Pour Kettle Stand
- `weighted-utensil-set`: Weighted Utensil Set
- `button-hook-zip-pull`: Button Hook and Zip Pull
- `sock-slider`: Sock Slider
- `elastic-no-tie-laces`: Elastic No-Tie Laces (6 pairs)
- `reach-grabber`: Reach Grabber, 80 cm
- `folding-cane`: Folding Cane, Cushion Grip
- `shower-stool`: Shower Stool with Backrest
- `angled-bath-sponge`: Long Angled Bath Sponge
- `talking-pill-organizer`: Talking Pill Organizer
- `flashing-doorbell`: Flashing Doorbell Receiver
- `bed-shaker-alarm-clock`: Bed-Shaker Alarm Clock
- `tv-listening-speaker`: TV Listening Speaker
- `tactile-talking-watch`: Tactile Talking Watch
- `led-handheld-magnifier`: LED Handheld Magnifier
- `bump-dots-labelling-kit`: Bump Dots Labelling Kit
- `bold-line-notebook`: Bold-Line Notebook
- `picture-symbol-board`: Picture-Symbol Communication Board
- `voice-output-button`: Recordable Voice Button
- `visual-routine-timer`: Visual Routine Timer
- `weighted-lap-pad`: Weighted Lap Pad, 2 kg
- `soft-noise-earmuffs`: Soft Noise-Reducing Earmuffs
- `voice-control-smart-plugs`: Voice-Control Smart Plugs (4)
- `lever-door-adapter`: Lever Door-Knob Adapter (2)
- `hands-free-book-stand`: Hands-Free Book and Tablet Stand
- `big-button-phone`: Big-Button Photo Phone
