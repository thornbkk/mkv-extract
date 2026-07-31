

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/2.G_e85P8U.js","_app/immutable/chunks/C1FmrZbK.js","_app/immutable/chunks/B2QSKqcC.js","_app/immutable/chunks/BbDsTYWY.js"];
export const stylesheets = ["_app/immutable/assets/2.UamOVCNY.css"];
export const fonts = [];
