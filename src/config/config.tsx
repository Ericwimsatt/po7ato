type Config = {
    pay_by: "per-token" | "per-request";
    us_models_only: boolean;
};

let config: Config = {
    pay_by: "per-token",
    us_models_only: false,
};

export default config;