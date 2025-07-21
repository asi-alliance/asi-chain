describe('Test Setup', () => {
  it('should have TextEncoder available', () => {
    expect(global.TextEncoder).toBeDefined();
    expect(global.TextDecoder).toBeDefined();
    
    // Test actual usage
    const encoder = new TextEncoder();
    const encoded = encoder.encode('test');
    expect(encoded).toBeDefined();
    expect(encoded.length).toBeGreaterThan(0);
    
    const decoder = new TextDecoder();
    const decoded = decoder.decode(encoded);
    expect(decoded).toBe('test');
  });
  
  it('should have crypto available', () => {
    expect(window.crypto).toBeDefined();
    expect(window.crypto.getRandomValues).toBeDefined();
    
    const arr = new Uint8Array(10);
    window.crypto.getRandomValues(arr);
    expect(arr.some(val => val !== 0)).toBe(true);
  });
  
  it('should have localStorage available', () => {
    expect(window.localStorage).toBeDefined();
    expect(window.localStorage.setItem).toBeDefined();
    expect(window.localStorage.getItem).toBeDefined();
  });
});