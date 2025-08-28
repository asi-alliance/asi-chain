pub fn validate_rchain_address(address: &str) -> bool {
    address.starts_with("1111") && address.len() >= 50 && address.len() <= 54
}

// simple validation, proper research needed
pub fn validate_deploy_id(deploy_id: &str) -> bool {
    let len = deploy_id.len();
    if len < 100 || len > 160 {
        return false;
    }
    deploy_id.chars().all(|c| c.is_ascii_alphanumeric())
}
