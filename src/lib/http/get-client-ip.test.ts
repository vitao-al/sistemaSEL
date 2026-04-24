import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { getClientIp } from './get-client-ip';

describe('getClientIp', () => {
  it('usa o primeiro IP de x-forwarded-for', () => {
    const req = new NextRequest('http://localhost/api', {
      headers: { 'x-forwarded-for': '203.0.113.1, 10.0.0.1' },
    });
    expect(getClientIp(req)).toBe('203.0.113.1');
  });

  it('usa x-real-ip quando forwarding não existe', () => {
    const req = new NextRequest('http://localhost/api', {
      headers: { 'x-real-ip': '198.51.100.2' },
    });
    expect(getClientIp(req)).toBe('198.51.100.2');
  });

  it('retorna unknown quando não há cabeçalhos', () => {
    const req = new NextRequest('http://localhost/api');
    expect(getClientIp(req)).toBe('unknown');
  });
});
