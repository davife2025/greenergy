export declare const env: {
    NODE_ENV: "development" | "production" | "test";
    PORT: number;
    API_CORS_ORIGIN: string;
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    ADMIN_JOB_SECRET: string;
    PAYSTACK_SECRET_KEY: string;
    HF_INFERENCE_MODEL: string;
    SCHEDULER_ENABLED: boolean;
    SCHEDULER_CRON: string;
    HF_TOKEN?: string | undefined;
};
