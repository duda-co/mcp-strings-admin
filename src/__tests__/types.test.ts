import { KeysScope, MCPStringData } from '../types';

describe('Type Definitions', () => {
  test('KeysScope interface should have correct structure', () => {
    const testScope: KeysScope = {
      value: 'checkout',
      shouldTranslate: true
    };

    expect(testScope.value).toBe('checkout');
    expect(testScope.shouldTranslate).toBe(true);
    expect(typeof testScope.value).toBe('string');
    expect(typeof testScope.shouldTranslate).toBe('boolean');
  });

  test('MCPStringData interface should have correct structure', () => {
    const testStringData: MCPStringData = {
      key: 'order.status.completed',
      value: 'Completed',
      shouldTranslate: true,
      scopeValue: 'checkout'
    };

    expect(testStringData.key).toBe('order.status.completed');
    expect(testStringData.value).toBe('Completed');
    expect(testStringData.shouldTranslate).toBe(true);
    expect(testStringData.scopeValue).toBe('checkout');
    
    // Type checking
    expect(typeof testStringData.key).toBe('string');
    expect(typeof testStringData.value).toBe('string');
    expect(typeof testStringData.shouldTranslate).toBe('boolean');
    expect(typeof testStringData.scopeValue).toBe('string');
  });

  test('MCPStringData with shouldTranslate false', () => {
    const testStringData: MCPStringData = {
      key: 'static.text',
      value: 'Static Value',
      shouldTranslate: false,
      scopeValue: 'ui'
    };

    expect(testStringData.shouldTranslate).toBe(false);
  });

  test('interfaces should be properly typed', () => {
    // This test mainly checks TypeScript compilation
    const scope: KeysScope = {
      value: 'test-scope',
      shouldTranslate: false
    };

    const stringData: MCPStringData = {
      key: 'test.key',
      value: 'Test Value',
      shouldTranslate: true,
      scopeValue: scope.value
    };

    expect(stringData.scopeValue).toBe(scope.value);
  });
}); 