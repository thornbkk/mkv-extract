

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/2.BWVKh9pm.js","_app/immutable/chunks/Dlc_SMu7.js","_app/immutable/chunks/WM1jwZIC.js"];
export const stylesheets = ["_app/immutable/assets/2.UamOVCNY.css"];
export const fonts = [];
