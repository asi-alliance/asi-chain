import { RChainService } from '../rchain';

// Mock fetch globally
global.fetch = jest.fn();

describe('RChainService', () => {
  let service: RChainService;
  const mockNodeUrl = 'http://localhost:40403';

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    service = new RChainService(mockNodeUrl);
  });

  describe('getBalance', () => {
    it('should fetch balance for a REV address', async () => {
      const mockResponse = {
        expr: { ExprInt: { data: 1000000000 } },
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const balance = await service.getBalance('1111testAddress');
      
      expect(balance).toBe('1'); // 1000000000 / 10^9
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/explore-deploy'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should return 0 if no balance found', async () => {
      const mockResponse = {
        expr: { ExprString: { data: 'No value found' } },
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const balance = await service.getBalance('1111testAddress');
      
      expect(balance).toBe('0');
    });

    it('should handle fetch errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(service.getBalance('1111testAddress'))
        .rejects.toThrow('Failed to get balance');
    });
  });

  describe('getCurrentBlock', () => {
    it('should fetch current block info', async () => {
      const mockBlockInfo = {
        blockNumber: 12345,
        blockHash: 'abcd1234',
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBlockInfo,
      });

      const blockInfo = await service.getCurrentBlock();
      
      expect(blockInfo).toEqual(mockBlockInfo);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/blocks/1'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });

  describe('deploy', () => {
    it('should deploy code', async () => {
      const mockDeployId = 'deploy123';
      const mockResponse = {
        result: mockDeployId,
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        text: async () => JSON.stringify(mockResponse),
      });

      const deploy = {
        term: 'new x in { x!(10) }',
        timestamp: Date.now(),
        phloPrice: 1,
        phloLimit: 100000,
        validAfterBlockNumber: 0,
      };

      const result = await service.deploy(deploy, 'sig123', 'pub123');
      
      expect(result).toBe(mockDeployId);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/deploy'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should handle deploy errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        text: async () => 'Invalid deploy data',
      });

      const deploy = {
        term: 'invalid',
        timestamp: Date.now(),
        phloPrice: 1,
        phloLimit: 100000,
        validAfterBlockNumber: 0,
      };

      await expect(service.deploy(deploy, 'sig', 'pub'))
        .rejects.toThrow('Bad Request');
    });
  });

  describe('Transfer Operations', () => {
    it('should create and send transfer', async () => {
      const mockDeployId = 'transfer123';
      
      // Mock exploratory deploy for transfer
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ expr: { ExprString: { data: 'Success' } } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ result: mockDeployId }),
          text: async () => JSON.stringify({ result: mockDeployId }),
        });

      const result = await service.transfer(
        '1111sender',
        '1111recipient',
        '100',
        'sig123',
        'pub123'
      );

      expect(result).toBe(mockDeployId);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Validation', () => {
    it('should validate REV addresses', () => {
      expect(RChainService.isValidRevAddress('11112bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvS')).toBe(true);
      expect(RChainService.isValidRevAddress('invalid')).toBe(false);
      expect(RChainService.isValidRevAddress('')).toBe(false);
    });

    it('should validate amounts', () => {
      expect(RChainService.isValidAmount('100')).toBe(true);
      expect(RChainService.isValidAmount('100.5')).toBe(true);
      expect(RChainService.isValidAmount('0')).toBe(false);
      expect(RChainService.isValidAmount('-10')).toBe(false);
      expect(RChainService.isValidAmount('abc')).toBe(false);
    });
  });

  describe('Helper Methods', () => {
    it('should convert REV to smallest unit', () => {
      expect(RChainService.revToMinRev('1')).toBe('1000000000');
      expect(RChainService.revToMinRev('0.1')).toBe('100000000');
      expect(RChainService.revToMinRev('100.123456789')).toBe('100123456789');
    });

    it('should convert smallest unit to REV', () => {
      expect(RChainService.minRevToRev('1000000000')).toBe('1');
      expect(RChainService.minRevToRev('100000000')).toBe('0.1');
      expect(RChainService.minRevToRev('123456789')).toBe('0.123456789');
    });
  });

  describe('exploreDeploy', () => {
    it('should explore deploy', async () => {
      const mockResult = {
        expr: { ExprString: { data: 'Deploy result' } },
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await service.exploreDeploy('new x in { x!(10) }');
      
      expect(result).toEqual(mockResult);
    });
  });

  describe('getDeployStatus', () => {
    it('should get deploy status', async () => {
      const mockStatus = {
        blockInfo: {
          blockNumber: 12345,
          deploys: [{
            deployer: 'test',
            sig: 'sig123',
          }],
        },
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      });

      const status = await service.getDeployStatus('deploy123');
      
      expect(status).toEqual(mockStatus);
    });
  });
});