export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "mkv-extract/_app",
	assets: new Set([".nojekyll"]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.Bb7F-__b.js",app:"_app/immutable/entry/app.Bg1BSHpR.js",imports:["_app/immutable/entry/start.Bb7F-__b.js","_app/immutable/chunks/D9CJjelp.js","_app/immutable/chunks/B2QSKqcC.js","_app/immutable/entry/app.Bg1BSHpR.js","_app/immutable/chunks/B2QSKqcC.js","_app/immutable/chunks/BbDsTYWY.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
