use axum::{http::StatusCode, response::Json};
use serde::{Deserialize, Serialize};

pub type ApiResult<T> = Result<Json<T>, (StatusCode, Json<ErrorResponse>)>;

#[derive(Debug, Deserialize)]
pub struct TransferRequest {
    pub to_address: String,
}

#[derive(Debug, Serialize)]
pub struct TransferResponse {
    pub deploy_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BalanceResponse {
    pub balance: String,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub details: Option<String>,
    pub timestamp: String,
}

impl ErrorResponse {
    pub fn new(error: String, details: Option<String>) -> Self {
        Self {
            error,
            details,
            timestamp: chrono::Utc::now().to_rfc3339(),
        }
    }

    pub fn validation_error(message: &str) -> Self {
        Self::new("Validation Error".to_string(), Some(message.to_string()))
    }

    pub fn internal_error(message: &str) -> Self {
        Self::new(
            "Internal Server Error".to_string(),
            Some(message.to_string()),
        )
    }
}
