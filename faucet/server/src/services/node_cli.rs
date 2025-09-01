use anyhow::Result;
use node_cli::{
    args::{HttpArgs, TransferArgs, WaitArgs, WalletBalanceArgs},
    commands::{check_deploy_status, transfer_deploy, wallet_balance_command},
    utils::output::DeployCompressedInfo,
};

use crate::config::AppConfig;

#[derive(Clone)]
pub struct NodeCliService {
    config: AppConfig,
}

impl NodeCliService {
    pub fn new(config: AppConfig) -> Self {
        Self { config }
    }

    pub async fn transfer_funds(&self, to_address: &str, private_key: &str) -> Result<String> {
        let amount = self.config.faucet_amount;
        let host = self.config.node_host.clone();

        let args = TransferArgs {
            to_address: to_address.to_owned(),
            amount,
            private_key: private_key.to_owned(),
            host,
            port: self.config.node_grpc_port,
            http_port: self.config.node_http_port,
            bigger_phlo: true,
            propose: false,
            max_wait: 60,
            check_interval: 5,
            observer_host: Some(self.config.observer_host.clone()),
            observer_port: Some(self.config.observer_grpc_port),
        };

        let deploy_id = transfer_deploy(&args)
            .await
            .map_err(|e| anyhow::Error::msg(e.to_string()))?;

        Ok(deploy_id.to_string())
    }

    pub async fn get_balance(&self, address: &str) -> Result<String> {
        let args = WalletBalanceArgs {
            address: address.to_owned(),
            host: self.config.observer_host.clone(),
            port: self.config.observer_grpc_port,
        };

        let (balance, _meta) = wallet_balance_command(&args)
            .await
            .map_err(|e| anyhow::Error::msg(e.to_string()))?;

        Ok(balance)
    }

    pub async fn get_deploy_info(&self, id: String) -> Result<DeployCompressedInfo> {
        //TODO: specify in .env
        let max_wait = 6;
        let check_interval = 2;
        let max_attempts = max_wait / check_interval;

        let args = WaitArgs {
            private_key: self.config.private_key.clone().unwrap(),
            max_attempts,
            check_interval: check_interval as u64,
            http_args: HttpArgs {
                host: self.config.observer_host.clone(),
                port: self.config.observer_http_port,
            },
            observer_host: self.config.observer_host.clone(),
            observer_grpc_port: self.config.observer_grpc_port,
        };

        let deploy_info = check_deploy_status(id.clone(), &args)
            .await
            .map_err(|e| anyhow::Error::msg(e.to_string()))?;

        Ok(deploy_info)
    }
}
