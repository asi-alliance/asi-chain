use axum::{extract::State, http::StatusCode, response::Json, Json as RequestJson};
use tracing::{error, info, warn};

use crate::{
    api::models::{ApiResult, ErrorResponse, TransferRequest, TransferResponse},
    services::node_cli::NodeCliService,
    utils::validate_rchain_address,
    AppState,
};

pub async fn transfer_handler(
    State(state): State<AppState>,
    RequestJson(request): RequestJson<TransferRequest>,
) -> ApiResult<TransferResponse> {
    info!(
        "FAUCET: Transfer request received for address: {}",
        request.to_address
    );

    if !validate_rchain_address(&request.to_address) {
        warn!("FAUCET: Invalid address format: {}", request.to_address);
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse::validation_error(
                "Address must start with '1111' and be 50-54 characters long",
            )),
        ));
    }

    let private_key = state.config.private_key.as_ref().ok_or_else(|| {
        error!("FAUCET: Private key not configured");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::internal_error(
                "Faucet private key not configured",
            )),
        )
    })?;

    let node_cli_service = NodeCliService::new(state.config.clone());
    match node_cli_service
        .transfer_funds(&request.to_address, private_key)
        .await
    {
        Ok(deploy_id) => {
            info!(
                "FAUCET: Transfer to {} deployed with id {}",
                &request.to_address, deploy_id
            );

            Ok(Json(TransferResponse {
                deploy_id: Some(deploy_id),
            }))
        }
        Err(e) => {
            error!(
                "FAUCET: Transfer failed to {} with error {}",
                request.to_address, e
            );
            Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse::new(
                    "FAUCET: Transfer failed".to_string(),
                    Some(e.to_string()),
                )),
            ))
        }
    }
}
