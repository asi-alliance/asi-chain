use crate::{
    api::models::{ApiResult, ErrorResponse},
    services::node_cli::NodeCliService,
    AppState,
    utils::validate_deploy_id,
};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
};
use node_cli::utils::output::DeployCompressedInfo;
use tracing::{error, info};

pub async fn deploy_info_handler(
    State(state): State<AppState>,
    Path(deploy_id): Path<String>,
) -> ApiResult<DeployCompressedInfo> {
    let node_cli_service = NodeCliService::new(state.config.clone());

    if !validate_deploy_id(&deploy_id) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse::validation_error(
                "FAUCET: Invalid deploy ID format (must be 100-160 alphanumeric chars)",
            )),
        ));
    }

    match node_cli_service.get_deploy_info(deploy_id.clone()).await {
        Ok(deploy_info) => {
            info!(
                "FAUCET: Deploy info retrieved successfully for ID: {}",
                deploy_id
            );
            Ok(Json(deploy_info))
        }
        Err(e) => {
            error!("FAUCET: Failed to retrieve deploy info: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse::internal_error(
                    "FAUCET: Failed to retrieve deploy info",
                )),
            ))
        }
    }
}
