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
    }
}

const APP_CONFIG: Config = {
    DB_BINDING: '',
    USER_TABLE: '',
    JWT_SECRET: '',
    DB_V0_CONTROL_KEY: '',
    GH: {
        OWNER: '',
        REPO: '',
        TOKEN: ''
    }
} as const

export default APP_CONFIG