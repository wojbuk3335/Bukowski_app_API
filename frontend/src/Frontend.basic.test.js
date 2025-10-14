import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('Frontend Basic Tests - Naprawione', () => {
  test('React renderuje podstawowy komponent', () => {
    const TestComponent = () => <div>Hello World</div>;
    
    const { getByText } = render(<TestComponent />);
    expect(getByText('Hello World')).toBeInTheDocument();
  });

  test('JavaScript działanie podstawowe', () => {
    expect(2 + 2).toBe(4);
    expect('hello'.toUpperCase()).toBe('HELLO');
    expect([1, 2, 3].length).toBe(3);
  });

  test('Promises działają', async () => {
    const promise = new Promise(resolve => resolve('success'));
    const result = await promise;
    expect(result).toBe('success');
  });

  test('Array operations', () => {
    const arr = [1, 2, 3, 4, 5];
    const filtered = arr.filter(x => x > 3);
    expect(filtered).toEqual([4, 5]);
  });

  test('Object operations', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj.name).toBe('test');
    expect(Object.keys(obj)).toEqual(['name', 'value']);
  });
});