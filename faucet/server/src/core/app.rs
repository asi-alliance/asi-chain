use anyhow::{Context, Result};
use std::time::Instant;
use tracing::info;

use crate::{api::create_router, config::AppConfig};

#[derive(Clone)]
pub struct AppState {
    pub config: AppConfig,
    pub start_time: Instant,
}

pub struct Application {
    router: axum::Router,
    config: AppConfig,
}

impl Application {
    pub async fn build(config: AppConfig) -> Result<Self> {
        config
            .validate()
            .map_err(|e| anyhow::anyhow!("Configuration error: {}", e))?;

        let state = AppState {
            config: config.clone(),
            start_time: Instant::now(),
        };

        let router = create_router(state);

        Ok(Self { router, config })
    }

    pub async fn run(self) -> Result<()> {
        let addr = self.config.server_address();
        info!("Server starting on {}", addr);

        let listener = tokio::net::TcpListener::bind(&addr)
            .await
            .context("Failed to bind to address")?;

        info!("Listening on {}", addr);

        axum::serve(listener, self.router)
            .await
            .context("Server error")?;

        Ok(())
    }

    pub fn router(&self) -> &axum::Router {
        &self.router
    }
}
