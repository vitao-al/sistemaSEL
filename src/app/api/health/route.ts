// Endpoint de health-check para monitoramento da aplicação.
// Fornece status e timestamp para verificações automatizadas.

import { NextResponse } from 'next/server';

export async function GET() {
  // Endpoint simples para monitoramento e validação de disponibilidade da API.
  return NextResponse.json(
    {
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    },
    { status: 200 }
  );
}