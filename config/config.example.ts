// config/config.ts
// config for the app, such as database bindings, etc.

interface Config {
    DB_BINDING: string;
    USER_TABLE: string;
    JWT_SECRET: string;
    DB_V0_CONTROL_KEY?: string;
    GH: {
        OWNER: string;
        REPO: string;
        TOKEN: string;
        Release_Tag: string;
    }
}

const APP_CONFIG: Config = {
    DB_BINDING: '', // should be the same as the D1 binding name in wrangler.toml
    USER_TABLE: '', 
    JWT_SECRET: '',
    DB_V0_CONTROL_KEY: '',
    GH: {
        OWNER: '',
        REPO: '',
        TOKEN: '',
        Release_Tag: ''
    }
} as const


export const GH_CONFIG = APP_CONFIG.GH

export default APP_CONFIG