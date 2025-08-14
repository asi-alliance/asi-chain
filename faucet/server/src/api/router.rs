use crate::{
    api::handlers::{balance_handler, deploy_info_handler, transfer_handler},
    api::middleware::request_id::RequestIdLayer,
    AppState,
};
use axum::http::{
    header::{AUTHORIZATION, CONTENT_TYPE},
    Method, StatusCode,
};
use axum::{
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use std::time::Duration;
use tower_http::cors::Any;
use tower_http::{
    compression::CompressionLayer, cors::CorsLayer, limit::RequestBodyLimitLayer,
    timeout::TimeoutLayer,
};

async fn preflight() -> impl IntoResponse {
    StatusCode::NO_CONTENT
}

pub fn create_router(state: AppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([CONTENT_TYPE, AUTHORIZATION])
        .max_age(Duration::from_secs(60 * 60));

    let api_routes = Router::new()
        .route("/transfer", post(transfer_handler).options(preflight))
        .route(
            "/deploy/:deploy_id",
            get(deploy_info_handler).options(preflight),
        )
        .route("/balance/:address", get(balance_handler).options(preflight));

    api_routes
        .layer(cors)
        .layer(RequestBodyLimitLayer::new(1024 * 1024))
        .layer(RequestIdLayer::new())
        .layer(TimeoutLayer::new(Duration::from_secs(7)))
        .layer(CompressionLayer::new())
        .with_state(state)
}
