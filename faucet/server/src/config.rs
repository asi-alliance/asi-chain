use std::env;
use std::error::Error;

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub private_key: Option<String>,

    pub faucet_amount: u64,

    pub node_host: String,
    pub node_grpc_port: u16,
    pub node_http_port: u16,

    pub observer_host: String,
    pub observer_grpc_port: u16,
    pub observer_http_port: u16,

    pub server_host: String,
    pub server_port: u16,
}

impl AppConfig {
    pub fn from_env() -> Self {
        dotenv::dotenv().ok();

        Self {
            private_key: env::var("PRIVATE_KEY").ok(),
            faucet_amount: Self::parse_env_or("FAUCET_AMOUNT", 20),
            node_host: env::var("NODE_HOST").unwrap_or_else(|_| "localhost".to_string()),
            node_grpc_port: Self::parse_env_or("NODE_GRPC_PORT", 40412),
            node_http_port: Self::parse_env_or("NODE_HTTP_PORT", 40413),
            observer_host: env::var("OBSERVER_HOST").unwrap_or_else(|_| "localhost".to_string()),
            observer_grpc_port: Self::parse_env_or("OBSERVER_GRPC_PORT", 40452),
            observer_http_port: Self::parse_env_or("OBSERVER_HTTP_PORT", 40453),
            server_host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            server_port: Self::parse_env_or("PORT", 8000),
        }
    }

    fn parse_env_or<T: std::str::FromStr>(name: &str, default: T) -> T {
        env::var(name)
            .ok()
            .and_then(|val| val.parse().ok())
            .unwrap_or(default)
    }

    pub fn validate(&self) -> Result<(), Box<dyn Error>> {
        if self.private_key.is_none() {
            return Err("PRIVATE_KEY environment variable is required".into());
        }

        if self.faucet_amount == 0 {
            return Err("FAUCET_AMOUNT must be greater than 0".into());
        }

        Ok(())
    }

    pub fn server_address(&self) -> String {
        format!("{}:{}", self.server_host, self.server_port)
    }
}
