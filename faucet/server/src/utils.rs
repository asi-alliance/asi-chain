pub fn validate_rchain_address(address: &str) -> bool {
    address.starts_with("1111") && address.len() >= 50 && address.len() <= 54
}
