

export const index = 1;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/error.svelte.js')).default;
export const imports = ["entries/fallbacks/error.svelte.js","chunks/ssr.js","chunks/exports.js","chunks/utils2.js","chunks/ssr2.js","chunks/escape.js"];
export const stylesheets = [];
export const fonts = [];
