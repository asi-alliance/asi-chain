use axum::{extract::State, http::StatusCode, response::Json, Json as RequestJson};
use tracing::{error, info, warn};

use crate::{
    api::models::{ApiResult, ErrorResponse, TransferRequest, TransferResponse, BalanceResponse},
    services::node_cli::NodeCliService,
    utils::validate_rchain_address,
    AppState,
    api::handlers::balance_handler,
};

//TODO: move to .env
const MAX_BALANCE_ALLOWED: u128 = 20_000 * 10u128.pow(8);

async fn ensure_recipient_balance_below_limit(
    state: &AppState,
    address: &str,
) -> Result<(), (StatusCode, Json<ErrorResponse>)> {
    let balance_json = balance_handler(
        State(state.clone()),
        axum::extract::Path(address.to_string()),
    )
    .await?; 

    let Json(BalanceResponse { balance }) = balance_json;

    let balance_value: u128 = balance.parse().map_err(|_| {
        warn!("FAUCET: Unable to parse balance '{}' for address {}", balance, address);
        (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse::validation_error(
                "FAUCET: Unable to parse existing balance for address",
            )),
        )
    })?;

    if balance_value >= MAX_BALANCE_ALLOWED {
        warn!(
            "FAUCET: Address {} balance {} exceeds faucet limit {}",
            address, balance_value, MAX_BALANCE_ALLOWED
        );
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse::validation_error(
                "Address balance exceeds faucet eligibility threshold",
            )),
        ));
    }

    Ok(())
}

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
                "FAUCET: Address must start with '1111' and be 50-54 characters long",
            )),
        ));
    }

    ensure_recipient_balance_below_limit(&state, &request.to_address).await?;

    let private_key = state.config.private_key.as_ref().ok_or_else(|| {
        error!("FAUCET: Private key not configured");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::internal_error(
                "FAUCET: Faucet private key not configured",
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
