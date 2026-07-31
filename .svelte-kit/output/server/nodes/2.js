

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const imports = ["entries/pages/_page.svelte.js","chunks/ssr.js","chunks/escape.js"];
export const stylesheets = ["_app/immutable/assets/_page.UamOVCNY.css"];
export const fonts = [];
