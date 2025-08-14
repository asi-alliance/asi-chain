use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
};
use tracing::{error, info, warn};

use crate::{
    api::models::{ApiResult, BalanceResponse, ErrorResponse},
    services::node_cli::NodeCliService,
    utils::validate_rchain_address,
    AppState,
};

pub async fn balance_handler(
    State(state): State<AppState>,
    Path(address): Path<String>,
) -> ApiResult<BalanceResponse> {
    info!("FAUCET: Balance request received for address: {}", address);

    if !validate_rchain_address(&address) {
        warn!("FAUCET: Invalid address format: {}", address);
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse::validation_error(
                "FAUCET: Address must start with '1111' and be at least 50 characters long",
            )),
        ));
    }

    let node_cli_service = NodeCliService::new(state.config.clone());
    match node_cli_service.get_balance(&address).await {
        Ok(balance) => {
            info!(
                "FAUCET: Balance retrieval successful for {}: {}",
                address, balance
            );
            Ok(Json(BalanceResponse { balance: balance }))
        }
        Err(e) => {
            error!("FAUCET: Balance retrieval failed: {}", e);
            Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse::new(
                    "FAUCET: Balance retrieval failed".to_string(),
                    Some(e.to_string()),
                )),
            ))
        }
    }
}
