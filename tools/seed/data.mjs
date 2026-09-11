/**
 * Dummy dataset for the AI Prompt Gallery.
 *
 * Shapes match docs/FIREBASE-ARCHITECTURE.md section A exactly, MINUS the
 * fields the seeder derives (titleLower, searchTokens, trendingScore,
 * timestamps, URLs). Keeping derivation in one place means the seed data
 * cannot drift out of sync with the schema.
 */

export const CATEGORIES = [
  { id: 'cat_photography',  name: 'Photography',  slug: 'photography',  iconName: 'camera',   sortOrder: 1 },
  { id: 'cat_portrait',     name: 'Portrait',     slug: 'portrait',     iconName: 'user',     sortOrder: 2 },
  { id: 'cat_3d_render',    name: '3D Render',    slug: '3d-render',    iconName: 'cube',     sortOrder: 3 },
  { id: 'cat_illustration', name: 'Illustration', slug: 'illustration', iconName: 'brush',    sortOrder: 4 },
  { id: 'cat_architecture', name: 'Architecture', slug: 'architecture', iconName: 'building', sortOrder: 5 },
  { id: 'cat_product',      name: 'Product',      slug: 'product',      iconName: 'box',      sortOrder: 6 },
  { id: 'cat_fantasy',      name: 'Fantasy',      slug: 'fantasy',      iconName: 'sparkles', sortOrder: 7 },
  { id: 'cat_abstract',     name: 'Abstract',     slug: 'abstract',     iconName: 'grid',     sortOrder: 8 },
];

export const AUTHORS = [
  { id: 'usr_mara_vance',      displayName: 'Mara Vance',      bio: 'Editorial photographer chasing rim light.' },
  { id: 'usr_dev_patel',       displayName: 'Dev Patel',       bio: 'Product renders and hard-surface studies.' },
  { id: 'usr_ines_okafor',     displayName: 'Ines Okafor',     bio: 'Illustrator. Ink, risograph, and noise.' },
  { id: 'usr_julian_reyes',    displayName: 'Julian Reyes',    bio: 'Architectural visualisation, mostly concrete.' },
  { id: 'usr_sana_kapoor',     displayName: 'Sana Kapoor',     bio: 'Fantasy worldbuilding, one prompt at a time.' },
  { id: 'usr_theo_lindqvist',  displayName: 'Theo Lindqvist',  bio: 'Nordic minimalism and long exposures.' },
  { id: 'usr_amara_bello',     displayName: 'Amara Bello',     bio: 'Colour theory experiments and abstracts.' },
  { id: 'usr_kenji_sato',      displayName: 'Kenji Sato',      bio: '3D generalist. Subsurface scattering enjoyer.' },
  { id: 'usr_nora_haddad',     displayName: 'Nora Haddad',     bio: 'Documentary street work, film emulation.' },
  { id: 'usr_luca_bianchi',    displayName: 'Luca Bianchi',    bio: 'Still life, studio lighting, hard shadows.' },
];

const mj = (version, params) => ({
  model: 'Midjourney', modelVersion: version, style: null, ...params,
});
const sdxl = (params) => ({ model: 'Stable Diffusion XL', modelVersion: '1.0', ...params });
const dalle = (params) => ({ model: 'DALL·E 3', modelVersion: '3.0', ...params });

/** 32 prompts — 4 per category. */
export const PROMPTS = [
  // ── Photography ─────────────────────────────────────────────────────────
  {
    id: 'pr_desert_golden_hour', categoryId: 'cat_photography', authorId: 'usr_mara_vance',
    title: 'Cinematic desert portrait at golden hour',
    prompt: 'A cinematic portrait of a woman standing in an open desert at golden hour, wind moving her hair, shot on 85mm at f/1.4, warm rim light, fine film grain, muted earth tones, shallow depth of field, editorial fashion photography',
    tags: ['portrait', 'cinematic', 'golden-hour', '85mm', 'film'],
    metadata: mj('v6.1', { negativePrompt: 'blurry, extra fingers, watermark, text', aspectRatio: '3:2', resolution: { width: 2048, height: 1365 }, style: 'Editorial photography', generationParameters: { stylize: 250, chaos: 12, quality: 2, seed: 1847392019 } }),
    stats: { likesCount: 1284, viewsCount: 20431, copiesCount: 372, favoritesCount: 615 },
    flags: { isFeatured: true, isTrending: true }, daysAgo: 3,
  },
  {
    id: 'pr_tokyo_rain_night', categoryId: 'cat_photography', authorId: 'usr_nora_haddad',
    title: 'Tokyo backstreet in the rain',
    prompt: 'A narrow Tokyo backstreet at night after rain, neon signage reflecting in standing water, a lone figure with an umbrella walking away from camera, 35mm, Cinestill 800T, halation around the highlights, deep cyan and magenta',
    tags: ['street', 'night', 'neon', 'tokyo', 'cinestill'],
    metadata: mj('v6.1', { negativePrompt: 'oversaturated, hdr, cartoon', aspectRatio: '3:2', resolution: { width: 2048, height: 1365 }, style: 'Street photography', generationParameters: { stylize: 400, chaos: 20, quality: 2, seed: 9910233 } }),
    stats: { likesCount: 2103, viewsCount: 41872, copiesCount: 811, favoritesCount: 1204 },
    flags: { isFeatured: true, isTrending: true }, daysAgo: 1,
  },
  {
    id: 'pr_iceland_long_exposure', categoryId: 'cat_photography', authorId: 'usr_theo_lindqvist',
    title: 'Black sand coastline, thirty second exposure',
    prompt: 'Icelandic black sand beach at blue hour, thirty second long exposure smoothing the surf into fog, basalt sea stacks in the mid ground, heavy overcast sky, cool desaturated palette, large format detail, tripod perspective',
    tags: ['landscape', 'long-exposure', 'iceland', 'minimal', 'blue-hour'],
    metadata: sdxl({ negativePrompt: 'people, boats, warm tones, noise', aspectRatio: '16:9', resolution: { width: 2048, height: 1152 }, style: 'Fine art landscape', generationParameters: { steps: 40, cfgScale: 6.5, sampler: 'DPM++ 2M Karras', seed: 44120983 } }),
    stats: { likesCount: 967, viewsCount: 15204, copiesCount: 221, favoritesCount: 438 },
    flags: { isFeatured: false, isTrending: true }, daysAgo: 6,
  },
  {
    id: 'pr_diner_americana', categoryId: 'cat_photography', authorId: 'usr_nora_haddad',
    title: 'Empty roadside diner at 4am',
    prompt: 'An empty American roadside diner photographed from outside at 4am, fluorescent interior glow spilling onto wet asphalt, one waitress visible through glass, Kodak Portra 400, soft grain, quiet and lonely mood, wide establishing shot',
    tags: ['americana', 'night', 'film', 'portra', 'documentary'],
    metadata: mj('v6.1', { negativePrompt: 'crowded, daylight, illustration', aspectRatio: '3:2', resolution: { width: 2048, height: 1365 }, style: 'Documentary', generationParameters: { stylize: 180, chaos: 8, quality: 2, seed: 77341002 } }),
    stats: { likesCount: 654, viewsCount: 11903, copiesCount: 143, favoritesCount: 287 },
    flags: { isFeatured: false, isTrending: false }, daysAgo: 14,
  },

  // ── Portrait ────────────────────────────────────────────────────────────
  {
    id: 'pr_studio_rembrandt', categoryId: 'cat_portrait', authorId: 'usr_mara_vance',
    title: 'Rembrandt lighting on a weathered face',
    prompt: 'Studio portrait of an elderly fisherman, Rembrandt lighting with a clear triangle on the shadow cheek, deep black backdrop, every line and pore rendered sharply, 100mm macro, dignified expression, muted olive and umber palette',
    tags: ['portrait', 'studio', 'rembrandt', 'character', 'monochrome'],
    metadata: mj('v6.1', { negativePrompt: 'smooth skin, beauty retouch, plastic', aspectRatio: '4:5', resolution: { width: 1638, height: 2048 }, style: 'Classical portrait', generationParameters: { stylize: 300, chaos: 5, quality: 2, seed: 20394871 } }),
    stats: { likesCount: 1876, viewsCount: 29844, copiesCount: 502, favoritesCount: 903 },
    flags: { isFeatured: true, isTrending: false }, daysAgo: 9,
  },
  {
    id: 'pr_neon_beauty_dish', categoryId: 'cat_portrait', authorId: 'usr_sana_kapoor',
    title: 'Neon gel beauty portrait',
    prompt: 'High fashion beauty portrait lit with two coloured gels, magenta key from camera left and cyan rim from behind, glossy skin, wet-look hair, seamless black background, shot on 105mm, crisp catchlights, editorial makeup',
    tags: ['beauty', 'gel-lighting', 'fashion', 'neon', 'editorial'],
    metadata: sdxl({ negativePrompt: 'washed out, flat lighting, blemishes', aspectRatio: '4:5', resolution: { width: 1638, height: 2048 }, style: 'Beauty editorial', generationParameters: { steps: 35, cfgScale: 7, sampler: 'Euler a', seed: 6612094 } }),
    stats: { likesCount: 1402, viewsCount: 24110, copiesCount: 389, favoritesCount: 671 },
    flags: { isFeatured: false, isTrending: true }, daysAgo: 2,
  },
  {
    id: 'pr_window_light_reader', categoryId: 'cat_portrait', authorId: 'usr_theo_lindqvist',
    title: 'Window light, woman reading',
    prompt: 'A woman reading by a tall north-facing window in a bare Scandinavian room, soft wraparound daylight, linen shirt, warm wood floor, negative space on the right, natural colour, calm and unposed, medium format look',
    tags: ['natural-light', 'minimal', 'scandinavian', 'candid', 'medium-format'],
    metadata: mj('v6.1', { negativePrompt: 'harsh shadows, clutter, saturated', aspectRatio: '3:2', resolution: { width: 2048, height: 1365 }, style: 'Lifestyle', generationParameters: { stylize: 150, chaos: 4, quality: 2, seed: 31887420 } }),
    stats: { likesCount: 812, viewsCount: 13650, copiesCount: 198, favoritesCount: 355 },
    flags: { isFeatured: false, isTrending: false }, daysAgo: 21,
  },
  {
    id: 'pr_bw_dancer_motion', categoryId: 'cat_portrait', authorId: 'usr_amara_bello',
    title: 'Dancer in motion, high contrast black and white',
    prompt: 'Contemporary dancer mid-leap against a white cyclorama, high contrast black and white, hard single strobe freezing fabric mid-flight, deep blacks, visible grain, powerful diagonal composition, 1/2000 shutter',
    tags: ['dance', 'monochrome', 'motion', 'high-contrast', 'studio'],
    metadata: dalle({ negativePrompt: null, aspectRatio: '4:5', resolution: { width: 1638, height: 2048 }, style: 'Monochrome studio', generationParameters: { quality: 'hd', style: 'vivid' } }),
    stats: { likesCount: 1105, viewsCount: 18992, copiesCount: 276, favoritesCount: 512 },
    flags: { isFeatured: false, isTrending: false }, daysAgo: 30,
  },

  // ── 3D Render ───────────────────────────────────────────────────────────
  {
    id: 'pr_iridescent_blob', categoryId: 'cat_3d_render', authorId: 'usr_kenji_sato',
    title: 'Iridescent soft-body blob study',
    prompt: 'A soft-body organic blob with iridescent thin-film shading resting on a matte concrete plinth, studio HDRI lighting, subsurface scattering, shallow depth of field, Octane render, pastel spectrum shifting across the surface',
    tags: ['3d', 'octane', 'iridescent', 'softbody', 'studio'],
    metadata: mj('v6.1', { negativePrompt: 'noisy, low poly, text', aspectRatio: '1:1', resolution: { width: 2048, height: 2048 }, style: '3D product render', generationParameters: { stylize: 500, chaos: 25, quality: 2, seed: 5590231 } }),
    stats: { likesCount: 2310, viewsCount: 47201, copiesCount: 940, favoritesCount: 1388 },
    flags: { isFeatured: true, isTrending: true }, daysAgo: 1,
  },
  {
    id: 'pr_isometric_apartment', categoryId: 'cat_3d_render', authorId: 'usr_dev_patel',
    title: 'Isometric cutaway apartment',
    prompt: 'Isometric cutaway of a small one bedroom apartment, warm afternoon light through the window, clay render with subtle ambient occlusion, muted terracotta and sage palette, tiny plants and books as detail, Blender Cycles',
    tags: ['isometric', 'blender', 'interior', 'clay-render', 'cutaway'],
    metadata: sdxl({ negativePrompt: 'perspective distortion, people, text', aspectRatio: '1:1', resolution: { width: 2048, height: 2048 }, style: 'Isometric 3D', generationParameters: { steps: 45, cfgScale: 7.5, sampler: 'DPM++ SDE Karras', seed: 88231044 } }),
    stats: { likesCount: 1698, viewsCount: 33420, copiesCount: 617, favoritesCount: 982 },
    flags: { isFeatured: true, isTrending: false }, daysAgo: 5,
  },
  {
    id: 'pr_chrome_typography', categoryId: 'cat_3d_render', authorId: 'usr_kenji_sato',
    title: 'Liquid chrome typography',
    prompt: 'Liquid chrome lettering warping in mid-air, hyper reflective, studio softbox reflections visible in the surface, dark gradient background, razor sharp specular highlights, Y2K aesthetic, Cinema 4D with Redshift',
    tags: ['typography', 'chrome', 'y2k', 'c4d', 'redshift'],
    metadata: mj('v6.1', { negativePrompt: 'matte, flat, blurry', aspectRatio: '16:9', resolution: { width: 2048, height: 1152 }, style: 'Y2K 3D', generationParameters: { stylize: 650, chaos: 30, quality: 2, seed: 12009834 } }),
    stats: { likesCount: 1533, viewsCount: 28711, copiesCount: 588, favoritesCount: 745 },
    flags: { isFeatured: false, isTrending: true }, daysAgo: 4,
  },
  {
    id: 'pr_ceramic_still_3d', categoryId: 'cat_3d_render', authorId: 'usr_luca_bianchi',
    title: 'Ceramic vessels, soft studio render',
    prompt: 'Three matte ceramic vessels of varying height arranged on a curved beige backdrop, soft area light from the upper left, gentle contact shadows, subtle clay texture, calm neutral palette, photorealistic 3D still life',
    tags: ['still-life', 'ceramic', 'minimal', 'photoreal', 'neutral'],
    metadata: sdxl({ negativePrompt: 'glossy, cluttered, harsh shadows', aspectRatio: '4:5', resolution: { width: 1638, height: 2048 }, style: 'Minimal still life', generationParameters: { steps: 40, cfgScale: 6, sampler: 'DPM++ 2M Karras', seed: 30014522 } }),
    stats: { likesCount: 743, viewsCount: 12088, copiesCount: 165, favoritesCount: 318 },
    flags: { isFeatured: false, isTrending: false }, daysAgo: 18,
  },

  // ── Illustration ────────────────────────────────────────────────────────
  {
    id: 'pr_riso_mountain', categoryId: 'cat_illustration', authorId: 'usr_ines_okafor',
    title: 'Risograph mountain range, two colours',
    prompt: 'A layered mountain range illustrated as a two colour risograph print, fluorescent pink and teal only, visible misregistration between layers, paper grain and ink mottling, flat shapes, 1970s travel poster composition',
    tags: ['risograph', 'print', 'poster', 'two-colour', 'retro'],
    metadata: mj('v6.1', { negativePrompt: 'gradient, photorealistic, 3d', aspectRatio: '2:3', resolution: { width: 1365, height: 2048 }, style: 'Risograph print', generationParameters: { stylize: 700, chaos: 15, quality: 2, seed: 7710239 } }),
    stats: { likesCount: 1944, viewsCount: 35102, copiesCount: 702, favoritesCount: 1051 },
    flags: { isFeatured: true, isTrending: true }, daysAgo: 2,
  },
  {
    id: 'pr_ink_botanical', categoryId: 'cat_illustration', authorId: 'usr_ines_okafor',
    title: 'Victorian botanical ink study',
    prompt: 'A Victorian botanical plate of an imaginary flowering plant, fine cross hatched ink linework, hand lettered latin label beneath, aged cream paper with foxing, muted sepia wash, scientific illustration accuracy',
    tags: ['botanical', 'ink', 'vintage', 'linework', 'scientific'],
    metadata: sdxl({ negativePrompt: 'colour photo, 3d, modern', aspectRatio: '2:3', resolution: { width: 1365, height: 2048 }, style: 'Botanical plate', generationParameters: { steps: 38, cfgScale: 8, sampler: 'Euler a', seed: 55012388 } }),
    stats: { likesCount: 1187, viewsCount: 21004, copiesCount: 344, favoritesCount: 596 },
    flags: { isFeatured: false, isTrending: false }, daysAgo: 11,
  },
  {
    id: 'pr_ghibli_kitchen', categoryId: 'cat_illustration', authorId: 'usr_sana_kapoor',
    title: 'Hand painted kitchen, morning light',
    prompt: 'A cluttered warm kitchen in hand painted anime style, morning sun through gauze curtains, steam rising from a kettle, jars and vegetables on every surface, soft cel shading with painted backgrounds, nostalgic and cosy',
    tags: ['anime', 'painted', 'cosy', 'interior', 'cel-shading'],
    metadata: mj('v6.1', { negativePrompt: 'photorealistic, dark, people', aspectRatio: '16:9', resolution: { width: 2048, height: 1152 }, style: 'Painted anime', generationParameters: { stylize: 450, chaos: 18, quality: 2, seed: 41029377 } }),
    stats: { likesCount: 2456, viewsCount: 52918, copiesCount: 1033, favoritesCount: 1512 },
    flags: { isFeatured: true, isTrending: true }, daysAgo: 1,
  },
  {
    id: 'pr_noir_comic_panel', categoryId: 'cat_illustration', authorId: 'usr_amara_bello',
    title: 'Noir comic panel, heavy blacks',
    prompt: 'A single noir comic panel, detective silhouetted in a doorway, venetian blind shadows across the floor, heavy spot blacks and minimal linework, halftone dots in the mid tones, limited palette of black white and one ochre',
    tags: ['comic', 'noir', 'halftone', 'ink', 'graphic'],
    metadata: dalle({ negativePrompt: null, aspectRatio: '3:2', resolution: { width: 2048, height: 1365 }, style: 'Graphic noir', generationParameters: { quality: 'hd', style: 'natural' } }),
    stats: { likesCount: 889, viewsCount: 16443, copiesCount: 231, favoritesCount: 402 },
    flags: { isFeatured: false, isTrending: false }, daysAgo: 25,
  },

  // ── Architecture ────────────────────────────────────────────────────────
  {
    id: 'pr_brutalist_fog', categoryId: 'cat_architecture', authorId: 'usr_julian_reyes',
    title: 'Brutalist tower in morning fog',
    prompt: 'A brutalist concrete residential tower emerging from heavy morning fog, raw board-marked concrete texture, repeating balcony rhythm, muted grey palette with a single warm lit window, shot on a tilt-shift lens, symmetrical',
    tags: ['brutalism', 'concrete', 'fog', 'tilt-shift', 'symmetry'],
    metadata: mj('v6.1', { negativePrompt: 'people, cars, colourful, warm sky', aspectRatio: '4:5', resolution: { width: 1638, height: 2048 }, style: 'Architectural photography', generationParameters: { stylize: 200, chaos: 10, quality: 2, seed: 66200114 } }),
    stats: { likesCount: 1621, viewsCount: 30877, copiesCount: 498, favoritesCount: 812 },
    flags: { isFeatured: true, isTrending: false }, daysAgo: 7,
  },
  {
    id: 'pr_courtyard_travertine', categoryId: 'cat_architecture', authorId: 'usr_julian_reyes',
    title: 'Travertine courtyard at noon',
    prompt: 'A minimal travertine courtyard at noon, one olive tree casting a hard shadow, arched colonnade on two sides, warm stone and deep blue sky, no people, Mediterranean modernism, architectural visualisation quality',
    tags: ['minimal', 'travertine', 'courtyard', 'archviz', 'mediterranean'],
    metadata: sdxl({ negativePrompt: 'clouds, people, clutter, night', aspectRatio: '3:2', resolution: { width: 2048, height: 1365 }, style: 'Archviz', generationParameters: { steps: 42, cfgScale: 7, sampler: 'DPM++ 2M Karras', seed: 19883021 } }),
    stats: { likesCount: 1058, viewsCount: 19330, copiesCount: 287, favoritesCount: 534 },
    flags: { isFeatured: false, isTrending: true }, daysAgo: 5,
  },
  {
    id: 'pr_glass_stair_atrium', categoryId: 'cat_architecture', authorId: 'usr_dev_patel',
    title: 'Spiral stair in a glass atrium',
    prompt: 'A white spiral staircase photographed from directly below inside a glass roofed atrium, perfect radial symmetry, blown out daylight through the glazing, crisp white surfaces, minimal, abstract geometric composition',
    tags: ['stairs', 'symmetry', 'atrium', 'minimal', 'geometry'],
    metadata: mj('v6.1', { negativePrompt: 'people, warm tones, texture noise', aspectRatio: '1:1', resolution: { width: 2048, height: 2048 }, style: 'Architectural abstract', generationParameters: { stylize: 250, chaos: 6, quality: 2, seed: 70119283 } }),
    stats: { likesCount: 1349, viewsCount: 24815, copiesCount: 402, favoritesCount: 660 },
    flags: { isFeatured: false, isTrending: false }, daysAgo: 13,
  },
  {
    id: 'pr_kyoto_machiya', categoryId: 'cat_architecture', authorId: 'usr_theo_lindqvist',
    title: 'Kyoto machiya entrance at dusk',
    prompt: 'The entrance of a traditional Kyoto machiya townhouse at dusk, warm paper lantern glow behind a lattice facade, damp stone path, dark timber, light rain, narrow vertical composition, quiet restrained atmosphere',
    tags: ['japan', 'traditional', 'dusk', 'lantern', 'vertical'],
    metadata: mj('v6.1', { negativePrompt: 'crowds, neon, daytime', aspectRatio: '2:3', resolution: { width: 1365, height: 2048 }, style: 'Travel photography', generationParameters: { stylize: 300, chaos: 12, quality: 2, seed: 90233871 } }),
    stats: { likesCount: 976, viewsCount: 17620, copiesCount: 244, favoritesCount: 471 },
    flags: { isFeatured: false, isTrending: false }, daysAgo: 34,
  },

  // ── Product ─────────────────────────────────────────────────────────────
  {
    id: 'pr_watch_hard_light', categoryId: 'cat_product', authorId: 'usr_luca_bianchi',
    title: 'Dive watch on wet slate',
    prompt: 'A stainless steel dive watch resting on wet black slate, single hard light source creating a crisp specular streak across the crystal, water beads on the bezel, deep shadows, commercial product photography, 100mm macro',
    tags: ['product', 'watch', 'hard-light', 'macro', 'commercial'],
    metadata: mj('v6.1', { negativePrompt: 'soft lighting, cluttered, logo text', aspectRatio: '1:1', resolution: { width: 2048, height: 2048 }, style: 'Commercial product', generationParameters: { stylize: 180, chaos: 5, quality: 2, seed: 11223344 } }),
    stats: { likesCount: 1412, viewsCount: 26509, copiesCount: 521, favoritesCount: 688 },
    flags: { isFeatured: true, isTrending: false }, daysAgo: 8,
  },
  {
    id: 'pr_perfume_gradient', categoryId: 'cat_product', authorId: 'usr_luca_bianchi',
    title: 'Perfume bottle on gradient backdrop',
    prompt: 'A frosted glass perfume bottle centred on a smooth peach to lavender gradient backdrop, soft gradient reflection beneath, gentle rim light defining the edges, no label, clean commercial still life, symmetrical framing',
    tags: ['perfume', 'gradient', 'glass', 'clean', 'symmetry'],
    metadata: sdxl({ negativePrompt: 'text, label, busy background', aspectRatio: '4:5', resolution: { width: 1638, height: 2048 }, style: 'Product still life', generationParameters: { steps: 36, cfgScale: 6.5, sampler: 'Euler a', seed: 40028811 } }),
    stats: { likesCount: 1093, viewsCount: 20117, copiesCount: 366, favoritesCount: 549 },
    flags: { isFeatured: false, isTrending: true }, daysAgo: 3,
  },
  {
    id: 'pr_sneaker_levitate', categoryId: 'cat_product', authorId: 'usr_dev_patel',
    title: 'Levitating sneaker with dust burst',
    prompt: 'A white running sneaker frozen mid-air above a concrete floor with a burst of fine dust below it, dramatic side lighting, dark background, energetic diagonal composition, high shutter speed, advertising campaign look',
    tags: ['sneaker', 'levitation', 'dust', 'advertising', 'dramatic'],
    metadata: mj('v6.1', { negativePrompt: 'brand logos, blurry, flat light', aspectRatio: '3:2', resolution: { width: 2048, height: 1365 }, style: 'Advertising', generationParameters: { stylize: 400, chaos: 22, quality: 2, seed: 81002934 } }),
    stats: { likesCount: 1755, viewsCount: 34022, copiesCount: 640, favoritesCount: 901 },
    flags: { isFeatured: false, isTrending: true }, daysAgo: 2,
  },
  {
    id: 'pr_coffee_flatlay', categoryId: 'cat_product', authorId: 'usr_nora_haddad',
    title: 'Coffee flatlay on linen',
    prompt: 'Overhead flatlay of a ceramic pour-over set on oatmeal linen, scattered coffee beans, a folded cloth and a brass spoon, soft diffused window light from the left, warm neutral palette, negative space top right, lifestyle',
    tags: ['flatlay', 'coffee', 'lifestyle', 'linen', 'overhead'],
    metadata: sdxl({ negativePrompt: 'harsh shadows, saturated, text', aspectRatio: '1:1', resolution: { width: 2048, height: 2048 }, style: 'Lifestyle flatlay', generationParameters: { steps: 34, cfgScale: 7, sampler: 'DPM++ 2M Karras', seed: 29188340 } }),
    stats: { likesCount: 622, viewsCount: 10455, copiesCount: 148, favoritesCount: 261 },
    flags: { isFeatured: false, isTrending: false }, daysAgo: 40,
  },

  // ── Fantasy ─────────────────────────────────────────────────────────────
  {
    id: 'pr_floating_library', categoryId: 'cat_fantasy', authorId: 'usr_sana_kapoor',
    title: 'Library floating above the clouds',
    prompt: 'An impossible library of stacked stone balconies floating above a sea of clouds at sunset, staircases leading nowhere, warm lantern light in every alcove, a single reader on the lowest terrace, epic scale, matte painting',
    tags: ['fantasy', 'library', 'matte-painting', 'clouds', 'epic'],
    metadata: mj('v6.1', { negativePrompt: 'modern, photorealistic portrait, text', aspectRatio: '16:9', resolution: { width: 2048, height: 1152 }, style: 'Matte painting', generationParameters: { stylize: 600, chaos: 28, quality: 2, seed: 3390122 } }),
    stats: { likesCount: 3102, viewsCount: 61440, copiesCount: 1288, favoritesCount: 1904 },
    flags: { isFeatured: true, isTrending: true }, daysAgo: 1,
  },
  {
    id: 'pr_moss_knight', categoryId: 'cat_fantasy', authorId: 'usr_sana_kapoor',
    title: 'Moss covered knight in a wet forest',
    prompt: 'A weathered knight in moss covered armour kneeling in a rain soaked old growth forest, shafts of pale light through the canopy, ferns and rot underfoot, desaturated greens, painterly realism, melancholy atmosphere',
    tags: ['knight', 'forest', 'painterly', 'moody', 'armour'],
    metadata: sdxl({ negativePrompt: 'bright, clean armour, cartoon', aspectRatio: '2:3', resolution: { width: 1365, height: 2048 }, style: 'Painterly fantasy', generationParameters: { steps: 44, cfgScale: 8, sampler: 'DPM++ SDE Karras', seed: 72119008 } }),
    stats: { likesCount: 2287, viewsCount: 44980, copiesCount: 876, favoritesCount: 1340 },
    flags: { isFeatured: true, isTrending: true }, daysAgo: 4,
  },
  {
    id: 'pr_leviathan_shallows', categoryId: 'cat_fantasy', authorId: 'usr_kenji_sato',
    title: 'Leviathan surfacing in the shallows',
    prompt: 'An enormous whale-like leviathan breaching in shallow turquoise water, tiny fishing boats for scale, barnacle encrusted hide, spray catching the low sun, dramatic cinematic lighting, sense of awe and danger, wide shot',
    tags: ['creature', 'ocean', 'scale', 'cinematic', 'leviathan'],
    metadata: mj('v6.1', { negativePrompt: 'cute, cartoon, small', aspectRatio: '16:9', resolution: { width: 2048, height: 1152 }, style: 'Concept art', generationParameters: { stylize: 550, chaos: 24, quality: 2, seed: 60034221 } }),
    stats: { likesCount: 1834, viewsCount: 37115, copiesCount: 694, favoritesCount: 1022 },
    flags: { isFeatured: false, isTrending: true }, daysAgo: 6,
  },
  {
    id: 'pr_desert_nomad_city', categoryId: 'cat_fantasy', authorId: 'usr_julian_reyes',
    title: 'Nomad city on the back of a beast',
    prompt: 'A sprawling nomadic city built on the back of an enormous walking beast crossing a red desert, rope bridges and tents between its spines, dust trail behind, two suns low on the horizon, epic concept art, wide panorama',
    tags: ['concept-art', 'desert', 'city', 'creature', 'sci-fantasy'],
    metadata: sdxl({ negativePrompt: 'modern buildings, text, blurry', aspectRatio: '16:9', resolution: { width: 2048, height: 1152 }, style: 'Concept art', generationParameters: { steps: 46, cfgScale: 8.5, sampler: 'Euler a', seed: 15002983 } }),
    stats: { likesCount: 1476, viewsCount: 28904, copiesCount: 533, favoritesCount: 778 },
    flags: { isFeatured: false, isTrending: false }, daysAgo: 16,
  },

  // ── Abstract ────────────────────────────────────────────────────────────
  {
    id: 'pr_liquid_ink_bloom', categoryId: 'cat_abstract', authorId: 'usr_amara_bello',
    title: 'Ink blooming in water, macro',
    prompt: 'Deep indigo and vermilion ink blooming into clear water, captured with a macro lens and a high speed strobe, delicate tendrils and smoke-like diffusion, pure black background, no container visible, abstract organic forms',
    tags: ['ink', 'macro', 'abstract', 'fluid', 'high-speed'],
    metadata: mj('v6.1', { negativePrompt: 'glass edges, bubbles, text', aspectRatio: '1:1', resolution: { width: 2048, height: 2048 }, style: 'Abstract macro', generationParameters: { stylize: 500, chaos: 35, quality: 2, seed: 8823014 } }),
    stats: { likesCount: 1988, viewsCount: 38221, copiesCount: 745, favoritesCount: 1115 },
    flags: { isFeatured: true, isTrending: true }, daysAgo: 2,
  },
  {
    id: 'pr_bauhaus_shapes', categoryId: 'cat_abstract', authorId: 'usr_ines_okafor',
    title: 'Bauhaus geometric composition',
    prompt: 'A flat geometric composition in the Bauhaus tradition, circles squares and diagonals in primary red blue and yellow on warm off white, precise hard edges, asymmetric balance, subtle paper texture, poster proportions',
    tags: ['bauhaus', 'geometric', 'primary-colours', 'flat', 'poster'],
    metadata: dalle({ negativePrompt: null, aspectRatio: '2:3', resolution: { width: 1365, height: 2048 }, style: 'Bauhaus poster', generationParameters: { quality: 'hd', style: 'natural' } }),
    stats: { likesCount: 1024, viewsCount: 18730, copiesCount: 312, favoritesCount: 497 },
    flags: { isFeatured: false, isTrending: false }, daysAgo: 19,
  },
  {
    id: 'pr_dune_topography', categoryId: 'cat_abstract', authorId: 'usr_theo_lindqvist',
    title: 'Aerial dune topography',
    prompt: 'Aerial view straight down onto desert dunes at low sun, the ridge lines reading as pure abstract contour, warm ochre light against deep violet shadow, no horizon and no scale reference, minimal graphic composition',
    tags: ['aerial', 'dunes', 'minimal', 'topography', 'abstract'],
    metadata: mj('v6.1', { negativePrompt: 'horizon, sky, people, vehicles', aspectRatio: '3:2', resolution: { width: 2048, height: 1365 }, style: 'Aerial abstract', generationParameters: { stylize: 350, chaos: 14, quality: 2, seed: 51120934 } }),
    stats: { likesCount: 1367, viewsCount: 25908, copiesCount: 418, favoritesCount: 702 },
    flags: { isFeatured: false, isTrending: true }, daysAgo: 5,
  },
  {
    id: 'pr_woven_fibre_macro', categoryId: 'cat_abstract', authorId: 'usr_kenji_sato',
    title: 'Woven fibre macro, monochrome',
    prompt: 'Extreme macro of woven natural fibre, individual threads rendered in crisp detail, raking side light emphasising the over-under structure, monochrome with warm paper tone, shallow focus falling off toward the corners',
    tags: ['macro', 'texture', 'fibre', 'monochrome', 'detail'],
    metadata: sdxl({ negativePrompt: 'colour, blurry, digital noise', aspectRatio: '1:1', resolution: { width: 2048, height: 2048 }, style: 'Macro texture', generationParameters: { steps: 38, cfgScale: 6.5, sampler: 'DPM++ 2M Karras', seed: 66109233 } }),
    stats: { likesCount: 588, viewsCount: 9822, copiesCount: 121, favoritesCount: 229 },
    flags: { isFeatured: false, isTrending: false }, daysAgo: 52,
  },
];
