import { parseOrderCommand } from '../lib/voice';

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            type: 'create_order',
            client: 'Raj Stores',
            items: [
              { product: 'Rice', quantity: 10 },
              { product: 'Wheat', quantity: 5 }
            ]
          })
        }
      })
    })
  })),
  SchemaType: {
    OBJECT: 'OBJECT',
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    ARRAY: 'ARRAY'
  }
}));

describe('parseOrderCommand', () => {
  it('uses GoogleGenerativeAI SDK to parse orders', async () => {
    const dummyBase64 = 'U29tZSBkdW1teSBiYXNlNjQgYXVkaW8=';
    const result = await (parseOrderCommand as any)(dummyBase64, 'test-key');
    
    expect(result.type).toBe('create_order');
    expect(result.client).toBe('Raj Stores');
    expect(result.items.length).toBe(2);
  });
});
