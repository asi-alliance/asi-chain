import { ethers } from 'ethers';
import { 
  MultisigWalletConfig, 
  MultisigTransaction, 
  MultisigProposal, 
  CreateMultisigWalletRequest,
  DeployMultisigRequest,
  MultisigParticipant,
  MultisigSignature,
  MultisigBalance,
  MultisigActivity,
  MultisigApiResponse
} from '../types/multisig';
import { SecureStorage } from './secureStorage';

// Gnosis Safe-compatible multi-signature contract ABI (simplified)
const MULTISIG_ABI = [
  "function setup(address[] calldata _owners, uint256 _threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, uint256 payment, address payable paymentReceiver) external",
  "function execTransaction(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address payable refundReceiver, bytes calldata signatures) external payable returns (bool success)",
  "function getTransactionHash(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 _nonce) public view returns (bytes32)",
  "function nonce() public view returns (uint256)",
  "function getOwners() public view returns (address[] memory)",
  "function getThreshold() public view returns (uint256)",
  "function isOwner(address owner) public view returns (bool)",
  "function addOwnerWithThreshold(address owner, uint256 _threshold) public",
  "function removeOwner(address prevOwner, address owner, uint256 _threshold) public",
  "function changeThreshold(uint256 _threshold) public",
  "event ExecutionSuccess(bytes32 txHash, uint256 payment)",
  "event ExecutionFailure(bytes32 txHash, uint256 payment)",
  "event AddedOwner(address owner)",
  "event RemovedOwner(address owner)",
  "event ChangedThreshold(uint256 threshold)"
];

// Multisig factory contract ABI
const MULTISIG_FACTORY_ABI = [
  "function createProxyWithNonce(address _singleton, bytes calldata initializer, uint256 saltNonce) external returns (address proxy)",
  "function proxyCreationCode() external pure returns (bytes memory)",
  "function deploymentData() external view returns (bytes memory)",
  "event ProxyCreation(address proxy, address singleton)"
];

export class MultisigWalletService {
  private provider: ethers.providers.Provider | null = null;
  private signer: ethers.Signer | null = null;
  private factoryAddress: string = '';
  private masterCopyAddress: string = '';

  constructor() {
    this.initializeContracts();
  }

  private async initializeContracts() {
    // In production, these would be actual deployed contract addresses
    this.factoryAddress = '0x76E2cFc1F5Fa8F6a5b3fC4c8F0E6eC8bD2D8a8Fb'; // Gnosis Safe Factory
    this.masterCopyAddress = '0x34CfAC646f301356fAa8B21e94227e3583Fe3F5F'; // Gnosis Safe Master Copy
  }

  public setProvider(provider: ethers.providers.Provider, signer?: ethers.Signer) {
    this.provider = provider;
    this.signer = signer || null;
  }

  // Create a new multisig wallet configuration (not deployed yet)
  public async createMultisigWallet(request: CreateMultisigWalletRequest): Promise<MultisigWalletConfig> {
    const walletId = this.generateWalletId();
    const currentUser = await this.getCurrentUserAddress();
    
    const participants: MultisigParticipant[] = [
      {
        address: currentUser,
        name: 'You',
        publicKey: await this.getPublicKey(currentUser),
        isOwner: true
      },
      ...request.participants.map(p => ({
        ...p,
        isOwner: true
      }))
    ];

    const wallet: MultisigWalletConfig = {
      id: walletId,
      name: request.name,
      description: request.description,
      participants,
      requiredSignatures: request.threshold,
      threshold: request.threshold,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: currentUser,
      status: 'pending',
      network: request.network
    };

    await this.saveWalletConfig(wallet);
    return wallet;
  }

  // Deploy the multisig wallet smart contract
  public async deployMultisigWallet(walletId: string, deployRequest?: DeployMultisigRequest): Promise<string> {
    if (!this.provider || !this.signer) {
      throw new Error('Provider and signer required for deployment');
    }

    const wallet = await this.getWalletConfig(walletId);
    if (!wallet) {
      throw new Error('Wallet configuration not found');
    }

    const owners = deployRequest?.owners || wallet.participants.map(p => p.address);
    const threshold = deployRequest?.threshold || wallet.threshold;

    try {
      // Create the factory contract instance
      const factory = new ethers.Contract(this.factoryAddress, MULTISIG_FACTORY_ABI, this.signer);
      
      // Encode the setup data for the multisig wallet
      const setupData = this.encodeSetupData(owners, threshold);
      
      // Generate a unique salt for deployment
      const saltNonce = ethers.utils.randomBytes(32);
      
      // Deploy the proxy contract
      const tx = await factory.createProxyWithNonce(
        this.masterCopyAddress,
        setupData,
        saltNonce,
        {
          gasLimit: deployRequest?.gasLimit || '500000',
          gasPrice: deployRequest?.gasPrice
        }
      );

      const receipt = await tx.wait();
      
      // Extract the proxy address from the event
      const proxyCreationEvent = receipt.events?.find(
        (event: any) => event.event === 'ProxyCreation'
      );
      
      if (!proxyCreationEvent) {
        throw new Error('ProxyCreation event not found');
      }

      const contractAddress = proxyCreationEvent.args.proxy;

      // Update wallet configuration with contract address
      wallet.contractAddress = contractAddress;
      wallet.status = 'deployed';
      wallet.updatedAt = new Date();
      
      await this.saveWalletConfig(wallet);

      // Log deployment activity
      await this.logActivity({
        id: this.generateId(),
        multisigWalletId: walletId,
        type: 'deployment',
        description: `Multisig wallet deployed to ${contractAddress}`,
        actor: await this.getCurrentUserAddress(),
        timestamp: new Date(),
        transactionHash: tx.hash
      });

      return contractAddress;
    } catch (error) {
      throw new Error(`Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Create a new transaction proposal
  public async createTransaction(
    walletId: string,
    to: string,
    value: string,
    data?: string,
    title?: string,
    description?: string
  ): Promise<MultisigTransaction> {
    const wallet = await this.getWalletConfig(walletId);
    if (!wallet || !wallet.contractAddress) {
      throw new Error('Wallet not found or not deployed');
    }

    const transactionId = this.generateId();
    const currentUser = await this.getCurrentUserAddress();
    
    // Get current nonce from contract
    const nonce = await this.getContractNonce(wallet.contractAddress);

    const transaction: MultisigTransaction = {
      id: transactionId,
      multisigWalletId: walletId,
      to,
      value,
      data: data || '0x',
      nonce,
      signatures: [],
      requiredSignatures: wallet.threshold,
      status: 'pending',
      createdAt: new Date(),
      createdBy: currentUser,
      title,
      description
    };

    await this.saveTransaction(transaction);

    // Log activity
    await this.logActivity({
      id: this.generateId(),
      multisigWalletId: walletId,
      type: 'transaction',
      description: `Transaction created: ${title || 'Untitled transaction'}`,
      actor: currentUser,
      timestamp: new Date(),
      relatedId: transactionId
    });

    return transaction;
  }

  // Sign a transaction
  public async signTransaction(transactionId: string): Promise<MultisigSignature> {
    if (!this.signer) {
      throw new Error('Signer required for signing transactions');
    }

    const transaction = await this.getTransaction(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const wallet = await this.getWalletConfig(transaction.multisigWalletId);
    if (!wallet || !wallet.contractAddress) {
      throw new Error('Wallet not found or not deployed');
    }

    const currentUser = await this.getCurrentUserAddress();
    
    // Check if user is a participant
    const participant = wallet.participants.find(p => p.address.toLowerCase() === currentUser.toLowerCase());
    if (!participant) {
      throw new Error('User is not a participant in this wallet');
    }

    // Check if already signed
    const existingSignature = transaction.signatures.find(s => s.address.toLowerCase() === currentUser.toLowerCase());
    if (existingSignature) {
      throw new Error('Transaction already signed by this user');
    }

    // Generate transaction hash
    const transactionHash = await this.getTransactionHash(
      wallet.contractAddress,
      transaction.to,
      transaction.value,
      transaction.data || '0x',
      transaction.nonce
    );

    // Sign the hash
    const signature = await this.signer.signMessage(ethers.utils.arrayify(transactionHash));

    const multisigSignature: MultisigSignature = {
      address: currentUser,
      signature,
      signedAt: new Date(),
      publicKey: participant.publicKey
    };

    // Add signature to transaction
    transaction.signatures.push(multisigSignature);

    // Check if we have enough signatures
    if (transaction.signatures.length >= transaction.requiredSignatures) {
      transaction.status = 'approved';
    }

    await this.saveTransaction(transaction);

    // Log activity
    await this.logActivity({
      id: this.generateId(),
      multisigWalletId: transaction.multisigWalletId,
      type: 'signature',
      description: `Transaction signed by ${currentUser}`,
      actor: currentUser,
      timestamp: new Date(),
      relatedId: transactionId
    });

    return multisigSignature;
  }

  // Execute a fully signed transaction
  public async executeTransaction(transactionId: string): Promise<string> {
    if (!this.provider || !this.signer) {
      throw new Error('Provider and signer required for execution');
    }

    const transaction = await this.getTransaction(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'approved') {
      throw new Error('Transaction not approved');
    }

    const wallet = await this.getWalletConfig(transaction.multisigWalletId);
    if (!wallet || !wallet.contractAddress) {
      throw new Error('Wallet not found or not deployed');
    }

    try {
      const contract = new ethers.Contract(wallet.contractAddress, MULTISIG_ABI, this.signer);
      
      // Combine signatures
      const signatures = this.combineSignatures(transaction.signatures);

      // Execute the transaction
      const tx = await contract.execTransaction(
        transaction.to,
        transaction.value,
        transaction.data || '0x',
        0, // operation (0 = call)
        0, // safeTxGas
        0, // baseGas
        0, // gasPrice
        ethers.constants.AddressZero, // gasToken
        ethers.constants.AddressZero, // refundReceiver
        signatures
      );

      const receipt = await tx.wait();

      // Update transaction status
      transaction.status = 'executed';
      transaction.transactionHash = tx.hash;
      transaction.executedAt = new Date();
      
      await this.saveTransaction(transaction);

      // Log activity
      await this.logActivity({
        id: this.generateId(),
        multisigWalletId: transaction.multisigWalletId,
        type: 'transaction',
        description: `Transaction executed: ${tx.hash}`,
        actor: await this.getCurrentUserAddress(),
        timestamp: new Date(),
        transactionHash: tx.hash,
        relatedId: transactionId
      });

      return tx.hash;
    } catch (error) {
      throw new Error(`Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get wallet balance
  public async getWalletBalance(contractAddress: string): Promise<MultisigBalance[]> {
    if (!this.provider) {
      throw new Error('Provider required for balance queries');
    }

    try {
      // Get ETH balance
      const ethBalance = await this.provider.getBalance(contractAddress);
      
      const balances: MultisigBalance[] = [
        {
          token: 'ETH',
          symbol: 'ETH',
          decimals: 18,
          balance: ethers.utils.formatEther(ethBalance)
        }
      ];

      // TODO: Add token balance queries for ERC-20 tokens
      
      return balances;
    } catch (error) {
      throw new Error(`Balance query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get wallet activity history
  public async getWalletActivity(walletId: string, limit: number = 50): Promise<MultisigActivity[]> {
    const activities = await SecureStorage.getItem(`multisig_activities_${walletId}`);
    return activities ? JSON.parse(activities).slice(0, limit) : [];
  }

  // Get wallet transactions
  public async getWalletTransactions(walletId: string): Promise<MultisigTransaction[]> {
    const transactions = await SecureStorage.getItem(`multisig_transactions_${walletId}`);
    return transactions ? JSON.parse(transactions) : [];
  }

  // Private helper methods
  private encodeSetupData(owners: string[], threshold: number): string {
    const setupInterface = new ethers.utils.Interface([
      "function setup(address[] calldata _owners, uint256 _threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, uint256 payment, address payable paymentReceiver) external"
    ]);

    return setupInterface.encodeFunctionData('setup', [
      owners,
      threshold,
      ethers.constants.AddressZero, // to
      '0x', // data
      ethers.constants.AddressZero, // fallbackHandler
      ethers.constants.AddressZero, // paymentToken
      0, // payment
      ethers.constants.AddressZero // paymentReceiver
    ]);
  }

  private async getTransactionHash(
    contractAddress: string,
    to: string,
    value: string,
    data: string,
    nonce: number
  ): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider required');
    }

    const contract = new ethers.Contract(contractAddress, MULTISIG_ABI, this.provider);
    
    return await contract.getTransactionHash(
      to,
      value,
      data,
      0, // operation
      0, // safeTxGas
      0, // baseGas
      0, // gasPrice
      ethers.constants.AddressZero, // gasToken
      ethers.constants.AddressZero, // refundReceiver
      nonce
    );
  }

  private async getContractNonce(contractAddress: string): Promise<number> {
    if (!this.provider) {
      throw new Error('Provider required');
    }

    const contract = new ethers.Contract(contractAddress, MULTISIG_ABI, this.provider);
    const nonce = await contract.nonce();
    return nonce.toNumber();
  }

  private combineSignatures(signatures: MultisigSignature[]): string {
    // Sort signatures by address (required by Gnosis Safe)
    const sortedSignatures = signatures.sort((a, b) => 
      a.address.toLowerCase().localeCompare(b.address.toLowerCase())
    );

    return '0x' + sortedSignatures.map(sig => sig.signature.slice(2)).join('');
  }

  private async getCurrentUserAddress(): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer required');
    }
    return await this.signer.getAddress();
  }

  private async getPublicKey(address: string): Promise<string> {
    // In production, this would derive the public key from the address
    // For now, return a mock public key
    return '0x' + address.slice(2).repeat(2).substring(0, 128);
  }

  private generateWalletId(): string {
    return 'multisig_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateId(): string {
    return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private async saveWalletConfig(wallet: MultisigWalletConfig): Promise<void> {
    const key = `multisig_wallet_${wallet.id}`;
    await SecureStorage.setItem(key, JSON.stringify(wallet));
    
    // Also save to a list of all wallets
    const walletsKey = 'multisig_wallets_list';
    const existingWallets = await SecureStorage.getItem(walletsKey);
    const walletsList = existingWallets ? JSON.parse(existingWallets) : [];
    
    const existingIndex = walletsList.findIndex((w: any) => w.id === wallet.id);
    if (existingIndex >= 0) {
      walletsList[existingIndex] = wallet;
    } else {
      walletsList.push(wallet);
    }
    
    await SecureStorage.setItem(walletsKey, JSON.stringify(walletsList));
  }

  private async getWalletConfig(walletId: string): Promise<MultisigWalletConfig | null> {
    const key = `multisig_wallet_${walletId}`;
    const walletData = await SecureStorage.getItem(key);
    return walletData ? JSON.parse(walletData) : null;
  }

  private async saveTransaction(transaction: MultisigTransaction): Promise<void> {
    const key = `multisig_transaction_${transaction.id}`;
    await SecureStorage.setItem(key, JSON.stringify(transaction));
    
    // Also save to wallet's transaction list
    const walletTxKey = `multisig_transactions_${transaction.multisigWalletId}`;
    const existingTx = await SecureStorage.getItem(walletTxKey);
    const txList = existingTx ? JSON.parse(existingTx) : [];
    
    const existingIndex = txList.findIndex((tx: any) => tx.id === transaction.id);
    if (existingIndex >= 0) {
      txList[existingIndex] = transaction;
    } else {
      txList.push(transaction);
    }
    
    await SecureStorage.setItem(walletTxKey, JSON.stringify(txList));
  }

  private async getTransaction(transactionId: string): Promise<MultisigTransaction | null> {
    const key = `multisig_transaction_${transactionId}`;
    const txData = await SecureStorage.getItem(key);
    return txData ? JSON.parse(txData) : null;
  }

  private async logActivity(activity: MultisigActivity): Promise<void> {
    const key = `multisig_activities_${activity.multisigWalletId}`;
    const existingActivities = await SecureStorage.getItem(key);
    const activities = existingActivities ? JSON.parse(existingActivities) : [];
    
    activities.unshift(activity); // Add to beginning
    
    // Keep only last 100 activities
    if (activities.length > 100) {
      activities.splice(100);
    }
    
    await SecureStorage.setItem(key, JSON.stringify(activities));
  }

  // Public API methods
  public async getAllWallets(): Promise<MultisigWalletConfig[]> {
    const walletsKey = 'multisig_wallets_list';
    const walletsData = await SecureStorage.getItem(walletsKey);
    return walletsData ? JSON.parse(walletsData) : [];
  }

  public async getWallet(walletId: string): Promise<MultisigWalletConfig | null> {
    return await this.getWalletConfig(walletId);
  }

  public async deleteWallet(walletId: string): Promise<void> {
    // Remove from individual storage
    await SecureStorage.removeItem(`multisig_wallet_${walletId}`);
    
    // Remove from wallets list
    const walletsKey = 'multisig_wallets_list';
    const existingWallets = await SecureStorage.getItem(walletsKey);
    if (existingWallets) {
      const walletsList = JSON.parse(existingWallets);
      const filteredWallets = walletsList.filter((w: any) => w.id !== walletId);
      await SecureStorage.setItem(walletsKey, JSON.stringify(filteredWallets));
    }
    
    // Clean up related data
    await SecureStorage.removeItem(`multisig_transactions_${walletId}`);
    await SecureStorage.removeItem(`multisig_activities_${walletId}`);
  }
}

export const multisigWalletService = new MultisigWalletService();