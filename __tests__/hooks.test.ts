import { renderHook, act } from '@testing-library/react-native';
import { useDashboardStats } from '../hooks/useDashboardStats';
import * as api from '../lib/api';

// Mock the API calls
jest.mock('../lib/api', () => ({
  fetchOrders: jest.fn(),
  fetchStores: jest.fn(),
  fetchMaterials: jest.fn(),
}));

describe('useDashboardStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default values and loading true', () => {
    const { result } = renderHook(() => useDashboardStats());
    expect(result.current.loading).toBe(true);
    expect(result.current.stats.orders).toBe(0);
  });

  it('fetches and calculates stats correctly', async () => {
    (api.fetchOrders as jest.Mock).mockResolvedValue([
      { id: '1', date: new Date().toISOString().split('T')[0] },
      { id: '2', date: '2020-01-01' },
    ]);
    (api.fetchStores as jest.Mock).mockResolvedValue([
      { id: 's1', total_debt: 100 },
      { id: 's2', total_debt: 250 },
    ]);
    (api.fetchMaterials as jest.Mock).mockResolvedValue([{ id: 'm1' }, { id: 'm2' }]);

    const { result } = renderHook(() => useDashboardStats());

    await act(async () => {
      await result.current.loadStats();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.stats).toEqual({
      orders: 2,
      clients: 2,
      products: 2,
      debt: 350,
      today: 1,
    });
  });
});
