import { ethers } from 'ethers';

export interface SwapToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
  balance?: string;
  price?: number; // USD price
  priceChange24h?: number;
}

export interface SwapQuote {
  id: string;
  fromToken: SwapToken;
  toToken: SwapToken;
  fromAmount: string;
  toAmount: string;
  rate: string; // exchange rate
  priceImpact: number; // percentage
  minimumReceived: string;
  estimatedGas: string;
  gasPrice: string;
  totalGasCost: string;
  route: SwapRoute[];
  slippage: number;
  deadline: number; // Unix timestamp
  validUntil: Date;
  dex: string; // which DEX is providing this quote
}

export interface SwapRoute {
  dex: string;
  poolAddress: string;
  tokenIn: string;
  tokenOut: string;
  percentage: number; // percentage of total swap going through this route
}

export interface SwapTransaction {
  id: string;
  hash?: string;
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled';
  quote: SwapQuote;
  submittedAt: Date;
  confirmedAt?: Date;
  gasUsed?: string;
  actualReceived?: string;
  error?: string;
}

export interface SwapHistory {
  transactions: SwapTransaction[];
  totalSwaps: number;
  totalVolume: string; // in USD
}

export interface DEXInfo {
  id: string;
  name: string;
  logoUrl: string;
  factoryAddress: string;
  routerAddress: string;
  isActive: boolean;
  fee: number; // percentage
}

export interface PriceData {
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  lastUpdated: Date;
}

export class TokenSwapService {
  private provider: ethers.providers.Provider | null = null;
  private signer: ethers.Signer | null = null;
  private supportedDEXes: DEXInfo[] = [];
  private tokenList: SwapToken[] = [];
  private priceCache: Map<string, PriceData> = new Map();
  private cacheExpiry: number = 60000; // 1 minute

  // Standard ERC-20 ABI
  private readonly ERC20_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) returns (bool)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)'
  ];

  // Uniswap V2 Router ABI (simplified)
  private readonly ROUTER_ABI = [
    'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
    'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
    'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function WETH() external pure returns (address)'
  ];

  constructor() {
    this.initializeSupportedDEXes();
    this.initializeTokenList();
  }

  public setProvider(provider: ethers.providers.Provider, signer?: ethers.Signer) {
    this.provider = provider;
    this.signer = signer || null;
  }

  // Get supported tokens for swapping
  public async getSupportedTokens(): Promise<SwapToken[]> {
    if (this.tokenList.length === 0) {
      await this.loadTokenList();
    }
    return this.tokenList;
  }

  // Get token balances for user
  public async getTokenBalances(userAddress: string, tokens: SwapToken[]): Promise<SwapToken[]> {
    if (!this.provider) {
      throw new Error('Provider not set');
    }

    const tokensWithBalances = await Promise.all(
      tokens.map(async (token) => {
        try {
          let balance: string;
          
          if (token.address === 'ETH' || token.address === ethers.constants.AddressZero) {
            // Native ETH balance
            const ethBalance = await this.provider!.getBalance(userAddress);
            balance = ethers.utils.formatEther(ethBalance);
          } else {
            // ERC-20 token balance
            const contract = new ethers.Contract(token.address, this.ERC20_ABI, this.provider!);
            const tokenBalance = await contract.balanceOf(userAddress);
            balance = ethers.utils.formatUnits(tokenBalance, token.decimals);
          }

          return {
            ...token,
            balance
          };
        } catch (error) {
          console.error(`Failed to get balance for ${token.symbol}:`, error);
          return {
            ...token,
            balance: '0'
          };
        }
      })
    );

    return tokensWithBalances;
  }

  // Get swap quote from multiple DEXes
  public async getSwapQuote(
    fromToken: SwapToken,
    toToken: SwapToken,
    amount: string,
    slippage: number = 0.5,
    userAddress?: string
  ): Promise<SwapQuote[]> {
    if (!this.provider) {
      throw new Error('Provider not set');
    }

    const quotes: SwapQuote[] = [];
    const amountIn = ethers.utils.parseUnits(amount, fromToken.decimals);

    // Get quotes from each supported DEX
    for (const dex of this.supportedDEXes.filter(d => d.isActive)) {
      try {
        const quote = await this.getQuoteFromDEX(
          dex,
          fromToken,
          toToken,
          amountIn,
          slippage,
          userAddress
        );
        
        if (quote) {
          quotes.push(quote);
        }
      } catch (error) {
        console.error(`Failed to get quote from ${dex.name}:`, error);
      }
    }

    // Sort by best rate (highest output amount)
    return quotes.sort((a, b) => 
      parseFloat(b.toAmount) - parseFloat(a.toAmount)
    );
  }

  // Execute swap transaction
  public async executeSwap(
    quote: SwapQuote,
    userAddress: string,
    maxSlippage?: number
  ): Promise<SwapTransaction> {
    if (!this.provider || !this.signer) {
      throw new Error('Provider and signer required for swap execution');
    }

    const transaction: SwapTransaction = {
      id: this.generateTransactionId(),
      status: 'pending',
      quote,
      submittedAt: new Date()
    };

    try {
      // Check if quote is still valid
      if (new Date() > quote.validUntil) {
        throw new Error('Quote has expired, please get a new quote');
      }

      // Check allowance for ERC-20 tokens
      if (quote.fromToken.address !== 'ETH' && quote.fromToken.address !== ethers.constants.AddressZero) {
        const allowance = await this.checkAllowance(
          quote.fromToken.address,
          userAddress,
          this.getDEXRouter(quote.dex)
        );

        const amountIn = ethers.utils.parseUnits(quote.fromAmount, quote.fromToken.decimals);
        
        if (allowance.lt(amountIn)) {
          // Approve token spending
          await this.approveToken(
            quote.fromToken.address,
            this.getDEXRouter(quote.dex),
            amountIn
          );
        }
      }

      // Execute the swap
      const tx = await this.performSwap(quote, userAddress, maxSlippage);
      transaction.hash = tx.hash;

      // Wait for confirmation
      const receipt = await tx.wait();
      transaction.status = receipt.status === 1 ? 'confirmed' : 'failed';
      transaction.confirmedAt = new Date();
      transaction.gasUsed = receipt.gasUsed.toString();

      // Get actual received amount from logs
      if (receipt.status === 1) {
        transaction.actualReceived = await this.getActualReceivedAmount(receipt, quote);
      }

    } catch (error) {
      transaction.status = 'failed';
      transaction.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('Swap execution failed:', error);
    }

    // Save transaction to history
    await this.saveSwapTransaction(transaction);

    return transaction;
  }

  // Get current token prices
  public async getTokenPrices(tokenAddresses: string[]): Promise<Map<string, PriceData>> {
    const prices = new Map<string, PriceData>();
    
    for (const address of tokenAddresses) {
      // Check cache first
      const cached = this.priceCache.get(address);
      if (cached && Date.now() - cached.lastUpdated.getTime() < this.cacheExpiry) {
        prices.set(address, cached);
        continue;
      }

      try {
        // Fetch price data (this would integrate with a price API like CoinGecko)
        const priceData = await this.fetchTokenPrice(address);
        prices.set(address, priceData);
        this.priceCache.set(address, priceData);
      } catch (error) {
        console.error(`Failed to fetch price for ${address}:`, error);
      }
    }

    return prices;
  }

  // Get swap history for user
  public async getSwapHistory(userAddress: string): Promise<SwapHistory> {
    try {
      const transactions = await this.loadSwapHistory(userAddress);
      
      const totalSwaps = transactions.length;
      const totalVolume = transactions
        .filter(tx => tx.status === 'confirmed')
        .reduce((sum, tx) => {
          const volume = parseFloat(tx.quote.fromAmount) * (tx.quote.fromToken.price || 0);
          return sum + volume;
        }, 0);

      return {
        transactions,
        totalSwaps,
        totalVolume: totalVolume.toString()
      };
    } catch (error) {
      console.error('Failed to get swap history:', error);
      return {
        transactions: [],
        totalSwaps: 0,
        totalVolume: '0'
      };
    }
  }

  // Calculate price impact
  public calculatePriceImpact(
    inputAmount: string,
    outputAmount: string,
    currentRate: string
  ): number {
    try {
      const input = parseFloat(inputAmount);
      const output = parseFloat(outputAmount);
      const rate = parseFloat(currentRate);
      
      const expectedOutput = input * rate;
      const impact = ((expectedOutput - output) / expectedOutput) * 100;
      
      return Math.max(0, impact);
    } catch (error) {
      return 0;
    }
  }

  // Private helper methods
  private initializeSupportedDEXes() {
    this.supportedDEXes = [
      {
        id: 'uniswap_v2',
        name: 'Uniswap V2',
        logoUrl: '/images/uniswap-logo.png',
        factoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
        routerAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        isActive: true,
        fee: 0.3
      },
      {
        id: 'sushiswap',
        name: 'SushiSwap',
        logoUrl: '/images/sushiswap-logo.png',
        factoryAddress: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
        routerAddress: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
        isActive: true,
        fee: 0.3
      }
    ];
  }

  private initializeTokenList() {
    // Common tokens for swapping
    this.tokenList = [
      {
        address: 'ETH',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        logoUrl: '/images/eth-logo.png'
      },
      {
        address: '0xA0b86a33E6417ac7C1b3b0C29218E2d2FE73fD0D',
        symbol: 'ASI',
        name: 'ASI Token',
        decimals: 18,
        logoUrl: '/images/asi-logo.png'
      },
      {
        address: '0xA0b86a33E6417ac7C1b3b0C29218E2d2FE73fD0D',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        logoUrl: '/images/usdc-logo.png'
      },
      {
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        logoUrl: '/images/usdt-logo.png'
      }
    ];
  }

  private async getQuoteFromDEX(
    dex: DEXInfo,
    fromToken: SwapToken,
    toToken: SwapToken,
    amountIn: ethers.BigNumber,
    slippage: number,
    userAddress?: string
  ): Promise<SwapQuote | null> {
    try {
      const router = new ethers.Contract(dex.routerAddress, this.ROUTER_ABI, this.provider!);
      
      // Build path for swap
      const path = this.buildSwapPath(fromToken, toToken, dex);
      
      // Get amounts out
      const amounts = await router.getAmountsOut(amountIn, path);
      const amountOut = amounts[amounts.length - 1];
      
      // Calculate minimum received with slippage
      const slippageMultiplier = (100 - slippage) / 100;
      const minimumReceived = amountOut.mul(Math.floor(slippageMultiplier * 100)).div(100);
      
      // Estimate gas
      const estimatedGas = await this.estimateSwapGas(dex, fromToken, toToken, amountIn, userAddress);
      const gasPrice = await this.provider!.getGasPrice();
      const totalGasCost = estimatedGas.mul(gasPrice);
      
      // Calculate rate
      const rate = parseFloat(ethers.utils.formatUnits(amountOut, toToken.decimals)) / 
                   parseFloat(ethers.utils.formatUnits(amountIn, fromToken.decimals));

      return {
        id: this.generateQuoteId(),
        fromToken,
        toToken,
        fromAmount: ethers.utils.formatUnits(amountIn, fromToken.decimals),
        toAmount: ethers.utils.formatUnits(amountOut, toToken.decimals),
        rate: rate.toString(),
        priceImpact: this.calculatePriceImpact(
          ethers.utils.formatUnits(amountIn, fromToken.decimals),
          ethers.utils.formatUnits(amountOut, toToken.decimals),
          rate.toString()
        ),
        minimumReceived: ethers.utils.formatUnits(minimumReceived, toToken.decimals),
        estimatedGas: estimatedGas.toString(),
        gasPrice: gasPrice.toString(),
        totalGasCost: ethers.utils.formatEther(totalGasCost),
        route: [{
          dex: dex.name,
          poolAddress: '', // Would be determined from factory
          tokenIn: fromToken.address,
          tokenOut: toToken.address,
          percentage: 100
        }],
        slippage,
        deadline: Math.floor(Date.now() / 1000) + 20 * 60, // 20 minutes
        validUntil: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        dex: dex.id
      };
    } catch (error) {
      console.error(`Failed to get quote from ${dex.name}:`, error);
      return null;
    }
  }

  private buildSwapPath(fromToken: SwapToken, toToken: SwapToken, dex: DEXInfo): string[] {
    const path: string[] = [];
    
    // Handle ETH/WETH conversion
    if (fromToken.address === 'ETH') {
      path.push(this.getWETHAddress(dex));
    } else {
      path.push(fromToken.address);
    }
    
    if (toToken.address === 'ETH') {
      path.push(this.getWETHAddress(dex));
    } else {
      path.push(toToken.address);
    }
    
    return path;
  }

  private getWETHAddress(dex: DEXInfo): string {
    // WETH address on mainnet
    return '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  }

  private async estimateSwapGas(
    dex: DEXInfo,
    fromToken: SwapToken,
    toToken: SwapToken,
    amountIn: ethers.BigNumber,
    userAddress?: string
  ): Promise<ethers.BigNumber> {
    // Return estimated gas - in production, this would simulate the transaction
    if (fromToken.address === 'ETH' || toToken.address === 'ETH') {
      return ethers.BigNumber.from('150000'); // ETH swaps typically use more gas
    }
    return ethers.BigNumber.from('120000'); // Standard ERC-20 swap
  }

  private async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string
  ): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(tokenAddress, this.ERC20_ABI, this.provider!);
    return await contract.allowance(ownerAddress, spenderAddress);
  }

  private async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber
  ): Promise<ethers.ContractTransaction> {
    const contract = new ethers.Contract(tokenAddress, this.ERC20_ABI, this.signer!);
    return await contract.approve(spenderAddress, amount);
  }

  private async performSwap(
    quote: SwapQuote,
    userAddress: string,
    maxSlippage?: number
  ): Promise<ethers.ContractTransaction> {
    const router = new ethers.Contract(
      this.getDEXRouter(quote.dex),
      this.ROUTER_ABI,
      this.signer!
    );

    const path = this.buildSwapPath(quote.fromToken, quote.toToken, this.getDEX(quote.dex)!);
    const amountIn = ethers.utils.parseUnits(quote.fromAmount, quote.fromToken.decimals);
    const amountOutMin = ethers.utils.parseUnits(quote.minimumReceived, quote.toToken.decimals);
    const deadline = quote.deadline;

    if (quote.fromToken.address === 'ETH') {
      // ETH to Token
      return await router.swapExactETHForTokens(
        amountOutMin,
        path,
        userAddress,
        deadline,
        { value: amountIn }
      );
    } else if (quote.toToken.address === 'ETH') {
      // Token to ETH
      return await router.swapExactTokensForETH(
        amountIn,
        amountOutMin,
        path,
        userAddress,
        deadline
      );
    } else {
      // Token to Token
      return await router.swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        path,
        userAddress,
        deadline
      );
    }
  }

  private getDEX(dexId: string): DEXInfo | undefined {
    return this.supportedDEXes.find(d => d.id === dexId);
  }

  private getDEXRouter(dexId: string): string {
    const dex = this.getDEX(dexId);
    if (!dex) {
      throw new Error(`Unknown DEX: ${dexId}`);
    }
    return dex.routerAddress;
  }

  private async getActualReceivedAmount(
    receipt: ethers.ContractReceipt,
    quote: SwapQuote
  ): Promise<string> {
    // Parse logs to get actual received amount
    // This is a simplified implementation
    return quote.toAmount;
  }

  private async fetchTokenPrice(address: string): Promise<PriceData> {
    // Mock price data - in production, integrate with price API
    return {
      price: Math.random() * 1000,
      priceChange24h: (Math.random() - 0.5) * 20,
      volume24h: Math.random() * 1000000,
      marketCap: Math.random() * 1000000000,
      lastUpdated: new Date()
    };
  }

  private async loadTokenList(): Promise<void> {
    // In production, load from token list API
    // For now, use the hardcoded list
  }

  private async saveSwapTransaction(transaction: SwapTransaction): Promise<void> {
    // Save to local storage or database
    const key = `swap_history_${await this.signer?.getAddress()}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push(transaction);
    localStorage.setItem(key, JSON.stringify(existing));
  }

  private async loadSwapHistory(userAddress: string): Promise<SwapTransaction[]> {
    const key = `swap_history_${userAddress}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private generateQuoteId(): string {
    return 'quote_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateTransactionId(): string {
    return 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

export const tokenSwapService = new TokenSwapService();