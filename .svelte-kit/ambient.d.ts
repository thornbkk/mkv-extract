
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/private';
 * 
 * console.log(ENVIRONMENT); // => "production"
 * console.log(PUBLIC_BASE_URL); // => throws error during build
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/private' {
	export const SVELTEKIT_FORK: string;
	export const NODE_ENV: string;
	export const EDITOR: string;
	export const npm_config_userconfig: string;
	export const GITHUB_REPOSITORY: string;
	export const GITHUB_USER: string;
	export const VSCODE_GIT_IPC_HANDLE: string;
	export const NODE_ROOT: string;
	export const JUPYTERLAB_PATH: string;
	export const MAVEN_HOME: string;
	export const PYTHON_PATH: string;
	export const LESSOPEN: string;
	export const VSCODE_GIT_ASKPASS_NODE: string;
	export const VSCODE_IPC_HOOK_CLI: string;
	export const GITHUB_API_URL: string;
	export const DOTNET_RUNNING_IN_CONTAINER: string;
	export const VSCODE_GIT_ASKPASS_MAIN: string;
	export const DOTNET_SKIP_FIRST_TIME_EXPERIENCE: string;
	export const ORYX_DIR: string;
	export const ContainerVersion: string;
	export const RVM_PATH: string;
	export const LANG: string;
	export const SHELL_LOGGED_IN: string;
	export const NVS_HOME: string;
	export const RUBY_HOME: string;
	export const NVM_DIR: string;
	export const JAVA_HOME: string;
	export const npm_package_json: string;
	export const SDKMAN_PLATFORM: string;
	export const DOCKER_BUILDKIT: string;
	export const PYTHONIOENCODING: string;
	export const npm_config_noproxy: string;
	export const NVM_SYMLINK_CURRENT: string;
	export const HOSTNAME: string;
	export const BROWSER: string;
	export const HUGO_ROOT: string;
	export const CONDA_SCRIPT: string;
	export const GRADLE_HOME: string;
	export const npm_config_user_agent: string;
	export const CODESPACES: string;
	export const PWD: string;
	export const RUBY_ROOT: string;
	export const GEM_HOME: string;
	export const GIT_EDITOR: string;
	export const PIPX_HOME: string;
	export const CONDA_DIR: string;
	export const DEBUGINFOD_URLS: string;
	export const rvm_bin_path: string;
	export const OLDPWD: string;
	export const SDKMAN_CANDIDATES_API: string;
	export const ORYX_SDK_STORAGE_BASE_URL: string;
	export const DOTNET_USE_POLLING_FILE_WATCHER: string;
	export const VSCODE_GIT_ASKPASS_EXTRA_ARGS: string;
	export const GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: string;
	export const PIPX_BIN_DIR: string;
	export const NVM_BIN: string;
	export const GITHUB_TOKEN: string;
	export const INIT_CWD: string;
	export const ENABLE_DYNAMIC_INSTALL: string;
	export const LS_COLORS: string;
	export const COLOR: string;
	export const GITHUB_CODESPACE_TOKEN: string;
	export const CODESPACE_NAME: string;
	export const npm_config_npm_version: string;
	export const rvm_path: string;
	export const VSCODE_PYTHON_AUTOACTIVATE_GUARD: string;
	export const NVM_INC: string;
	export const USER: string;
	export const FEATURE_SPARK_POST_COMMIT_CREATE_ITERATION: string;
	export const SHLVL: string;
	export const PYTHON_ROOT: string;
	export const GITHUB_GRAPHQL_URL: string;
	export const DYNAMIC_INSTALL_ROOT_DIR: string;
	export const npm_config_node_gyp: string;
	export const SHELL: string;
	export const _: string;
	export const NVS_DIR: string;
	export const PHP_ROOT: string;
	export const npm_config_prefix: string;
	export const rvm_prefix: string;
	export const CLOUDENV_ENVIRONMENT_ID: string;
	export const RUBY_VERSION: string;
	export const COLORTERM: string;
	export const PROMPT_DIRTRIM: string;
	export const npm_node_execpath: string;
	export const IRBRC: string;
	export const GOROOT: string;
	export const SDKMAN_BROKER_API: string;
	export const DOTNET_ROOT: string;
	export const NVS_ROOT: string;
	export const rvm_version: string;
	export const npm_config_global_prefix: string;
	export const PATH: string;
	export const JAVA_ROOT: string;
	export const SDKMAN_CANDIDATES_DIR: string;
	export const npm_config_cache: string;
	export const TERM: string;
	export const NODE: string;
	export const npm_config_local_prefix: string;
	export const npm_package_name: string;
	export const NPM_GLOBAL: string;
	export const HUGO_DIR: string;
	export const MY_RUBY_HOME: string;
	export const SDKMAN_DIR: string;
	export const TERM_PROGRAM: string;
	export const CODESPACE_VSCODE_FOLDER: string;
	export const npm_lifecycle_script: string;
	export const GOPATH: string;
	export const ORYX_ENV_TYPE: string;
	export const npm_package_version: string;
	export const npm_lifecycle_event: string;
	export const ORYX_PREFER_USER_INSTALLED_SDKS: string;
	export const DEBIAN_FLAVOR: string;
	export const npm_config_globalconfig: string;
	export const npm_config_init_module: string;
	export const HOME: string;
	export const TERM_PROGRAM_VERSION: string;
	export const NVS_USE_XZ: string;
	export const INTERNAL_VSCS_TARGET_URL: string;
	export const GEM_PATH: string;
	export const npm_execpath: string;
	export const GITHUB_SERVER_URL: string;
	export const npm_command: string;
	export const RAILS_DEVELOPMENT_HOSTS: string;
	export const NVS_OS: string;
	export const LESSCLOSE: string;
	export const PHP_PATH: string;
	export const MAVEN_ROOT: string;
	export const GIT_ASKPASS: string;
	export const NVM_CD_FLAGS: string;
	export const NUGET_XMLDOC_MODE: string;
}

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/public';
 * 
 * console.log(ENVIRONMENT); // => throws error during build
 * console.log(PUBLIC_BASE_URL); // => "http://site.com"
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * 
 * console.log(env.ENVIRONMENT); // => "production"
 * console.log(env.PUBLIC_BASE_URL); // => undefined
 * ```
 */
declare module '$env/dynamic/private' {
	export const env: {
		SVELTEKIT_FORK: string;
		NODE_ENV: string;
		EDITOR: string;
		npm_config_userconfig: string;
		GITHUB_REPOSITORY: string;
		GITHUB_USER: string;
		VSCODE_GIT_IPC_HANDLE: string;
		NODE_ROOT: string;
		JUPYTERLAB_PATH: string;
		MAVEN_HOME: string;
		PYTHON_PATH: string;
		LESSOPEN: string;
		VSCODE_GIT_ASKPASS_NODE: string;
		VSCODE_IPC_HOOK_CLI: string;
		GITHUB_API_URL: string;
		DOTNET_RUNNING_IN_CONTAINER: string;
		VSCODE_GIT_ASKPASS_MAIN: string;
		DOTNET_SKIP_FIRST_TIME_EXPERIENCE: string;
		ORYX_DIR: string;
		ContainerVersion: string;
		RVM_PATH: string;
		LANG: string;
		SHELL_LOGGED_IN: string;
		NVS_HOME: string;
		RUBY_HOME: string;
		NVM_DIR: string;
		JAVA_HOME: string;
		npm_package_json: string;
		SDKMAN_PLATFORM: string;
		DOCKER_BUILDKIT: string;
		PYTHONIOENCODING: string;
		npm_config_noproxy: string;
		NVM_SYMLINK_CURRENT: string;
		HOSTNAME: string;
		BROWSER: string;
		HUGO_ROOT: string;
		CONDA_SCRIPT: string;
		GRADLE_HOME: string;
		npm_config_user_agent: string;
		CODESPACES: string;
		PWD: string;
		RUBY_ROOT: string;
		GEM_HOME: string;
		GIT_EDITOR: string;
		PIPX_HOME: string;
		CONDA_DIR: string;
		DEBUGINFOD_URLS: string;
		rvm_bin_path: string;
		OLDPWD: string;
		SDKMAN_CANDIDATES_API: string;
		ORYX_SDK_STORAGE_BASE_URL: string;
		DOTNET_USE_POLLING_FILE_WATCHER: string;
		VSCODE_GIT_ASKPASS_EXTRA_ARGS: string;
		GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: string;
		PIPX_BIN_DIR: string;
		NVM_BIN: string;
		GITHUB_TOKEN: string;
		INIT_CWD: string;
		ENABLE_DYNAMIC_INSTALL: string;
		LS_COLORS: string;
		COLOR: string;
		GITHUB_CODESPACE_TOKEN: string;
		CODESPACE_NAME: string;
		npm_config_npm_version: string;
		rvm_path: string;
		VSCODE_PYTHON_AUTOACTIVATE_GUARD: string;
		NVM_INC: string;
		USER: string;
		FEATURE_SPARK_POST_COMMIT_CREATE_ITERATION: string;
		SHLVL: string;
		PYTHON_ROOT: string;
		GITHUB_GRAPHQL_URL: string;
		DYNAMIC_INSTALL_ROOT_DIR: string;
		npm_config_node_gyp: string;
		SHELL: string;
		_: string;
		NVS_DIR: string;
		PHP_ROOT: string;
		npm_config_prefix: string;
		rvm_prefix: string;
		CLOUDENV_ENVIRONMENT_ID: string;
		RUBY_VERSION: string;
		COLORTERM: string;
		PROMPT_DIRTRIM: string;
		npm_node_execpath: string;
		IRBRC: string;
		GOROOT: string;
		SDKMAN_BROKER_API: string;
		DOTNET_ROOT: string;
		NVS_ROOT: string;
		rvm_version: string;
		npm_config_global_prefix: string;
		PATH: string;
		JAVA_ROOT: string;
		SDKMAN_CANDIDATES_DIR: string;
		npm_config_cache: string;
		TERM: string;
		NODE: string;
		npm_config_local_prefix: string;
		npm_package_name: string;
		NPM_GLOBAL: string;
		HUGO_DIR: string;
		MY_RUBY_HOME: string;
		SDKMAN_DIR: string;
		TERM_PROGRAM: string;
		CODESPACE_VSCODE_FOLDER: string;
		npm_lifecycle_script: string;
		GOPATH: string;
		ORYX_ENV_TYPE: string;
		npm_package_version: string;
		npm_lifecycle_event: string;
		ORYX_PREFER_USER_INSTALLED_SDKS: string;
		DEBIAN_FLAVOR: string;
		npm_config_globalconfig: string;
		npm_config_init_module: string;
		HOME: string;
		TERM_PROGRAM_VERSION: string;
		NVS_USE_XZ: string;
		INTERNAL_VSCS_TARGET_URL: string;
		GEM_PATH: string;
		npm_execpath: string;
		GITHUB_SERVER_URL: string;
		npm_command: string;
		RAILS_DEVELOPMENT_HOSTS: string;
		NVS_OS: string;
		LESSCLOSE: string;
		PHP_PATH: string;
		MAVEN_ROOT: string;
		GIT_ASKPASS: string;
		NVM_CD_FLAGS: string;
		NUGET_XMLDOC_MODE: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://example.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.ENVIRONMENT); // => undefined, not public
 * console.log(env.PUBLIC_BASE_URL); // => "http://example.com"
 * ```
 * 
 * ```
 * 
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
