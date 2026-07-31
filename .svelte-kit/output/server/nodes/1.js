

export const index = 1;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/error.svelte.js')).default;
export const imports = ["_app/immutable/nodes/1.DlH_mF6G.js","_app/immutable/chunks/B2QSKqcC.js","_app/immutable/chunks/BbDsTYWY.js","_app/immutable/chunks/D9CJjelp.js"];
export const stylesheets = [];
export const fonts = [];
