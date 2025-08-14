mod config;
mod core;
mod utils;

mod api;
mod services;

use anyhow::{Context, Result};
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

pub use config::AppConfig;
pub use core::{AppState, Application};

#[tokio::main]
async fn main() -> Result<()> {
    setup_logging();

    info!("Starting ASI Faucet service");

    let config = AppConfig::from_env();
    info!("Configuration loaded");

    let app = Application::build(config)
        .await
        .context("Failed to build application")?;

    info!("Application built successfully");

    app.run().await.context("Application runtime error")?;

    info!("Application shutting down gracefully");
    Ok(())
}

fn setup_logging() {
    let env_filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| "asi_faucet=info,tower_http=debug,axum=debug".into());

    tracing_subscriber::registry()
        .with(env_filter)
        .with(tracing_subscriber::fmt::layer().with_target(true))
        .init();
}
